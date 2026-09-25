# Autenticação e autorização

## Política de papéis

A autorização **não** usa decorator nos controllers de negócio. A regra vive em
`guards/roles.guard.ts` e é aplicada globalmente via `APP_GUARD`. Se você abrir
`bill.controller.ts` procurando um `@Roles()`, não vai encontrar — este é o
documento que explica onde a regra mora.

| Papel | Permissão |
| --- | --- |
| `ADMIN` | Tudo, incluindo `/users`. |
| `OPERATOR` | Tudo, exceto rotas marcadas com `@Roles(UserRole.ADMIN)`. |
| `VIEWER` | Somente `GET`, `HEAD` e `OPTIONS`. |

A regra do `VIEWER` é sobre o **verbo HTTP**, não sobre a lista de handlers. Foi
essa a razão de a política ficar no guard: expressá-la com decorator exigiria
anotar cada handler individualmente, e um handler novo esquecido nasceria aberto.
Com a política no guard, o padrão é fechado — controller novo já nasce coberto.

Para restringir algo além do padrão, use `@Roles()` no handler ou na classe:

```ts
@Roles(UserRole.ADMIN)
@Controller('users')
export class UserController {}
```

Quando `@Roles()` está presente, ele **substitui** o padrão: apenas os papéis
listados passam, independentemente do verbo.

## Autenticação

`JwtAuthGuard` também é `APP_GUARD`, e roda antes do `RolesGuard`. Toda rota
exige `Authorization: Bearer <accessToken>` salvo se marcada com `@Public()`.
Hoje só `POST /auth/login` e `POST /auth/refresh` são públicas.

O guard **relê o usuário no banco a cada requisição** e usa o `role` de lá, não o
que estiver no JWT. O payload do access token carrega apenas `sub`. Rebaixar ou
desativar um usuário passa a valer na requisição seguinte, sem esperar o access
token expirar.

Algoritmo fixado em `HS256` tanto na assinatura quanto na verificação, para
fechar a classe de ataques de confusão de algoritmo.

## Tokens

- **Access token**: JWT `HS256`, curto (`JWT_ACCESS_EXPIRES_IN`, padrão `15m`).
- **Refresh token**: 32 bytes aleatórios em base64url, opaco. No banco fica só o
  **SHA-256** dele.

Refresh token usa SHA-256 e não argon2 de propósito. Argon2 gera salt aleatório
por hash, então o mesmo token produziria digests diferentes — seria impossível
fazer lookup por igualdade ou manter índice único. E não é necessário: o token
tem 256 bits de entropia, não é uma senha escolhida por humano.

### Rotação e detecção de reuso

Cada login abre uma **família** (`familyId`). Cada rotação revoga o token
apresentado e emite outro na mesma família. Apresentar um token já revogado
revoga a **família inteira** — é a assinatura de um token vazado sendo
replayado.

`POST /auth/logout` também revoga a família inteira, não apenas o token
apresentado.

### Expurgo

`RefreshTokenPurgeService` roda no boot e a cada
`REFRESH_TOKEN_PURGE_INTERVAL_HOURS` (padrão 12; `0` desativa).

Ele apaga **apenas tokens com `expiresAt` no passado**, revogados ou não.
Tokens revogados que ainda não expiraram são preservados de propósito: são eles
que disparam a detecção de reuso. Apagá-los transformaria um replay detectável
em um simples "token inválido", e a família comprometida continuaria viva.

## Anti-enumeração de usuários

E-mail inexistente, senha errada e usuário inativo retornam os três a mesma
resposta: `401` com `E-mail ou senha inválidos`.

Quando o e-mail não existe, `PasswordService.burnTime()` roda uma verificação
argon2 contra um hash descartável. Sem isso a resposta sairia rápido demais para
e-mails inexistentes, e o tempo de resposta revelaria quais e-mails existem —
tornando a mensagem idêntica inútil.

## Rate limit

`POST /auth/login` tem dois limitadores independentes, ambos com janela
`LOGIN_RATE_LIMIT_TTL_SECONDS` (padrão 300s) e teto `LOGIN_RATE_LIMIT_MAX`
(padrão 10):

- `login-ip` — por endereço de origem;
- `login-email` — pelo e-mail do corpo da requisição.

O segundo existe porque o primeiro sozinho não protege uma conta específica
contra um atacante distribuído.

## Operações da própria sessão

`@SelfService()` marca rotas que qualquer papel autenticado pode chamar,
independentemente do verbo. Hoje são duas:

- `POST /auth/logout`
- `POST /users/me/password`

Ele existe porque a regra "VIEWER só GET" as bloqueava: ambas são `POST`, e o
resultado era que um contador não conseguia encerrar a própria sessão nem trocar
a própria senha. A política por verbo protege **dados de negócio**; operações
sobre a própria conta não são dados de negócio.

Preferiu-se `@SelfService()` a `@Roles(ADMIN, OPERATOR, VIEWER)` porque listar
todos os papéis quebra silenciosamente no dia em que um quarto papel for criado.
