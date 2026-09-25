# FinanceBoard — API

Referência das rotas do backend. Base: `http://localhost:3000`.

## Sumário

- [Setup](#setup)
- [Convenções](#convenções)
- [Autenticação](#autenticação)
- [Usuários](#usuários-users)
- [Empresas](#empresas-companies)
- [Obras](#obras-projects)
- [Fornecedores](#fornecedores-suppliers)
- [Categorias](#categorias-categories)
- [Contas a pagar](#contas-a-pagar-bills)
- [Faturas](#faturas-invoices)
- [Contas a receber](#contas-a-receber-receivables)
- [Relatórios](#relatórios-reports)
- [Como as faturas afetam o fluxo de caixa](#como-as-faturas-afetam-o-fluxo-de-caixa)

---

## Setup

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # cole em JWT_SECRET
docker compose up -d
npm install
npm run prisma:migrate
npm run prisma:seed      # cria o ADMIN inicial (+ base de exemplo se SEED_SAMPLE_DATA=true)
npm run start:dev
```

A API **não sobe** sem `JWT_SECRET` (mínimo 32 caracteres) e `CORS_ORIGINS`: a validação de ambiente derruba o boot de propósito, para que configuração incompleta falhe cedo em vez de silenciosamente.

O primeiro ADMIN sai do seed, a partir de `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no `.env`. Não existe senha padrão embutida no código — sem essas três variáveis o seed falha. Ele cria/atualiza o usuário mesmo com o banco já populado; só a base de exemplo é que não é recriada.

### Scripts

| Comando                  | O que faz                                              |
|--------------------------|--------------------------------------------------------|
| `npm run start:dev`      | Sobe a API com hot reload                              |
| `npm run build`          | Compila para `dist/`                                   |
| `npm run lint`           | ESLint + Prettier com `--fix`                          |
| `npm run prisma:migrate` | Cria e aplica migration a partir do `schema.prisma`    |
| `npm run prisma:generate`| Regera o Prisma Client (tipos do banco)                |
| `npm run prisma:studio`  | Abre o navegador de dados do Prisma                    |
| `npm run prisma:seed`    | Cria/atualiza o ADMIN inicial. Se o banco estiver vazio **e** `SEED_SAMPLE_DATA=true`, cria também a base de exemplo (nunca em produção) |
| `npm run prisma:reset`   | **Apaga o banco**, reaplica migrations e roda o seed   |
| `npm test`               | Roda a suíte de testes e2e                             |
| `npm run test:watch`     | Testes e2e em watch mode                               |

> O seed usa CNPJs e razões sociais fictícios. Edite as constantes no topo de `prisma/seed.ts` para refletir as empresas reais antes de usar como base de trabalho.

### Testes

```bash
cp .env.test.example .env.test    # ajuste a senha para a mesma do .env
npm test
```

A suíte é **end-to-end**: sobe a aplicação inteira e bate nas rotas HTTP contra um Postgres real. Nada de mock — as regras que mais importam aqui (deslocamento de fatura no fluxo de caixa, cálculo do líquido, filtros por regime) vivem em consultas Prisma e aritmética de `Decimal`, e mock nenhum verifica isso.

Os testes rodam num banco **separado** (`financeboard_test`), criado e migrado automaticamente na primeira execução. Cada teste começa com as tabelas truncadas, então o banco de desenvolvimento nunca é tocado. Como a suíte apaga tudo, ela se recusa a rodar se a `DATABASE_URL` do `.env.test` não apontar para um banco com `financeboard_test` no nome.

| Arquivo                     | Cobre                                                        |
|-----------------------------|--------------------------------------------------------------|
| `auth.e2e-spec.ts`          | Login, papéis, rotação e reuso de refresh, logout, expurgo     |
| `user.e2e-spec.ts`          | CRUD de usuários, redefinição e troca de senha, desativação    |
| `company.e2e-spec.ts`       | CNPJ único e formatado, bloqueio de remoção com vínculos      |
| `catalog.e2e-spec.ts`       | Obras, categorias e fornecedores                              |
| `bill.e2e-spec.ts`          | Líquido, retenções, pagamento/estorno, status, filtros        |
| `invoice.e2e-spec.ts`       | Agrupamento, herança de vencimento, pagamento em cascata      |
| `receivable.e2e-spec.ts`    | Recebimento, estorno, filtros por regime                      |
| `report.e2e-spec.ts`        | Fluxo de caixa nos dois regimes, retenções, custo por obra    |

---

## Convenções

**Datas.** Entrada sempre em `aaaa-mm-dd`. Saída em ISO 8601. A formatação `dd/mm/aaaa` é responsabilidade do frontend.

**Valores.** Enviados e recebidos como string decimal (`"1234.56"`), nunca number — evita erro de ponto flutuante em dinheiro. Campos de registro (`grossAmount`, `netAmount`, `amount`) vêm como o Postgres armazena (`"1000"`); totais calculados por faturas e relatórios vêm sempre com duas casas (`"1000.00"`).

**Status.** O banco guarda apenas `PENDING` e `PAID`. A API devolve `effectiveStatus` calculado na leitura, que pode ser `PENDING`, `PAID` ou `OVERDUE` — vencida nunca é digitada.

**Erros.** Mensagens em português. `400` validação, `401` não autenticado, `403` papel sem permissão, `404` não encontrado, `409` conflito de regra de negócio.

```json
{ "message": "Já existe uma empresa cadastrada com esse CNPJ", "error": "Conflict", "statusCode": 409 }
```

Erros de validação trazem uma lista:

```json
{ "message": ["Razão social é obrigatória", "CNPJ deve conter exatamente 14 dígitos numéricos, sem pontuação"], "error": "Bad Request", "statusCode": 400 }
```

**Regime.** Onde houver `regime`, os valores são `accrual` (competência, padrão) e `cash` (caixa).

---

## Autenticação

Toda rota é protegida por padrão. Só `POST /auth/login` e `POST /auth/refresh` são públicas — qualquer outra sem `Authorization: Bearer <accessToken>` responde 401.

| Método | Rota            | Descrição                                  |
|--------|-----------------|--------------------------------------------|
| POST   | `/auth/login`   | Autentica e emite o par de tokens (200)    |
| POST   | `/auth/refresh` | Rotaciona o par a partir do refresh token  |
| POST   | `/auth/logout`  | Revoga a família de tokens da sessão (204) |
| GET    | `/auth/me`      | Dados do usuário autenticado               |

```json
POST /auth/login
{ "email": "voce@empresa.com.br", "password": "SenhaSegura123" }
```

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "0Yl8...",
  "user": {
    "id": "clx...", "name": "Maria Silva", "email": "maria@empresa.com.br",
    "role": "ADMIN", "isActive": true,
    "createdAt": "2026-08-28T12:00:00.000Z", "updatedAt": "2026-08-28T12:00:00.000Z"
  }
}
```

O objeto `user` é o mesmo devolvido por `GET /auth/me`. O hash da senha nunca é incluído.

E-mail inexistente, senha errada e usuário inativo devolvem os três o **mesmo** 401 `"E-mail ou senha inválidos"` — não dá para descobrir quais e-mails existem no sistema. O login tem rate limit por IP **e** por e-mail.

### Papéis

| Papel      | Pode                                                     |
|------------|----------------------------------------------------------|
| `ADMIN`    | Tudo, incluindo `/users`                                  |
| `OPERATOR` | Tudo, menos `/users`                                      |
| `VIEWER`   | Só `GET`/`HEAD`/`OPTIONS` — qualquer escrita responde 403  |

A regra do `VIEWER` é aplicada **por verbo HTTP**, não por lista de rotas: controller novo já nasce coberto. O papel e o `isActive` são lidos do banco a cada requisição, não do token — revogar um acesso vale já na requisição seguinte.

### Tokens

O access token é um JWT de vida curta (`JWT_ACCESS_EXPIRES_IN`, padrão `15m`). O refresh token é opaco, guardado no servidor apenas como SHA-256, e vale `REFRESH_TOKEN_EXPIRES_IN_DAYS` (padrão 30).

Cada refresh **rotaciona** o par. Apresentar um refresh token já usado é tratado como vazamento: a família inteira é revogada e a sessão cai.

> Consequência prática para quem escreve cliente: **nunca dispare dois refresh em paralelo.** Duas requisições que tomam 401 ao mesmo tempo precisam esperar a mesma chamada a `/auth/refresh` — senão a segunda apresenta um token já rotacionado e derruba a sessão do usuário.

O raciocínio por trás dessas decisões está em [`src/auth/README.md`](src/auth/README.md).

---

## Usuários (`/users`)

Exclusivo de `ADMIN`, com uma exceção: `POST /users/me/password` vale para qualquer papel, inclusive `VIEWER`.

| Método | Rota                  | Descrição                                       |
|--------|-----------------------|-------------------------------------------------|
| POST   | `/users/me/password`  | Troca a **própria** senha (204) — qualquer papel |
| POST   | `/users`              | Cadastra usuário                                 |
| GET    | `/users`              | Lista usuários, em ordem alfabética              |
| GET    | `/users/:id`          | Detalhe                                          |
| PATCH  | `/users/:id`          | Atualiza nome, e-mail, papel ou situação         |
| DELETE | `/users/:id`          | **Desativa** — não apaga                         |
| POST   | `/users/:id/password` | Redefine a senha de outro usuário                |

```json
POST /users
{ "name": "Maria Silva", "email": "maria@empresa.com.br", "password": "SenhaSegura123", "role": "OPERATOR" }
```

O hash da senha nunca aparece em resposta nenhuma. E-mail é único: repetido retorna 409.

**Senha.** Mínimo de 10 caracteres, com ao menos uma letra e um número. Vale para cadastro, redefinição e troca.

**Desativar não apaga.** `DELETE /users/:id` marca `isActive: false` e devolve o usuário (200, não 204). O histórico de lançamentos continua íntegro e o acesso pode ser devolvido por `PATCH`.

**Mudança sensível encerra as sessões abertas.** Desativar, trocar o papel, redefinir a senha ou trocar a própria senha revogam os refresh tokens do usuário. Quem troca a própria senha é deslogado junto — é esperado.

**O admin não se sabota.** Alterar o próprio papel ou desativar a si mesmo retorna 400.

```json
POST /users/me/password
{ "currentPassword": "SenhaAntiga123", "newPassword": "SenhaNova456" }
```

Senha atual errada retorna 401. Nova senha igual à atual retorna 400.

---

## Empresas (`/companies`)

| Método | Rota              | Descrição            |
|--------|-------------------|----------------------|
| POST   | `/companies`      | Cadastra empresa     |
| GET    | `/companies`      | Lista empresas       |
| GET    | `/companies/:id`  | Detalhe              |
| PATCH  | `/companies/:id`  | Atualiza             |
| DELETE | `/companies/:id`  | Remove (204)         |

```json
POST /companies
{ "legalName": "Empresa de Terraplenagem e Locações LTDA", "cnpj": "11111111000191" }
```

CNPJ com exatamente 14 dígitos, sem pontuação, e único no sistema. Remover empresa com contas vinculadas retorna 409.

---

## Obras (`/projects`)

| Método | Rota             | Descrição                       |
|--------|------------------|---------------------------------|
| POST   | `/projects`      | Cadastra obra                   |
| GET    | `/projects`      | Lista (filtro `?status=`)       |
| GET    | `/projects/:id`  | Detalhe                         |
| PATCH  | `/projects/:id`  | Atualiza / encerra              |
| DELETE | `/projects/:id`  | Remove (204)                    |

```json
POST /projects
{ "name": "Terraplenagem Loteamento Vale Verde", "clientName": "Construtora Vale Verde" }
```

`status` aceita `ACTIVE` (padrão) ou `CLOSED`. Para encerrar uma obra: `PATCH /projects/:id` com `{"status": "CLOSED"}`.

Obra com contas ou recebíveis vinculados **não pode ser removida** (409) — encerre em vez de remover. Apagá-la desvincularia os lançamentos, jogando todo o custo dela para "Despesas administrativas (sem obra)" no relatório.

**Filtro:** `GET /projects?status=ACTIVE`

---

## Fornecedores (`/suppliers`)

| Método | Rota              | Descrição        |
|--------|-------------------|------------------|
| POST   | `/suppliers`      | Cadastra         |
| GET    | `/suppliers`      | Lista            |
| GET    | `/suppliers/:id`  | Detalhe          |
| PATCH  | `/suppliers/:id`  | Atualiza         |
| DELETE | `/suppliers/:id`  | Remove (204)     |

```json
POST /suppliers
{ "name": "Posto Rodoviário Central", "document": "33333333000153" }
```

`document` é opcional e aceita 11 dígitos (CPF) ou 14 (CNPJ), sem pontuação.

---

## Categorias (`/categories`)

| Método | Rota               | Descrição      |
|--------|--------------------|----------------|
| POST   | `/categories`      | Cadastra       |
| GET    | `/categories`      | Lista          |
| GET    | `/categories/:id`  | Detalhe        |
| PATCH  | `/categories/:id`  | Atualiza       |
| DELETE | `/categories/:id`  | Remove (204)   |

```json
POST /categories
{ "name": "Combustível" }
```

Nome único — duplicado retorna 409.

---

## Contas a pagar (`/bills`)

| Método | Rota                    | Descrição                        |
|--------|-------------------------|----------------------------------|
| POST   | `/bills`                | Cadastra conta                   |
| GET    | `/bills`                | Lista com filtros                |
| GET    | `/bills/:id`            | Detalhe                          |
| PATCH  | `/bills/:id`            | Atualiza                         |
| DELETE | `/bills/:id`            | Remove (204)                     |
| POST   | `/bills/:id/payment`    | Registra pagamento               |
| DELETE | `/bills/:id/payment`    | Estorna pagamento                |

### Cadastro

```json
POST /bills
{
  "documentNumber": "NF-1088",
  "grossAmount": "12000.00",
  "issueDate": "2026-05-20",
  "dueDate": "2026-06-20",
  "companyId": "clx...",
  "projectId": "clx...",
  "categoryId": "clx...",
  "supplierId": "clx...",
  "withholdings": [
    { "type": "INSS", "amount": "1320.00" }
  ]
}
```

`projectId` é opcional (despesas administrativas não têm obra). `withholdings` é opcional; tipos aceitos: `INSS`, `ISS`, `IRRF`, `PIS_COFINS_CSLL`.

**O líquido é calculado pelo backend** — você envia o bruto e as retenções, a API grava `netAmount = grossAmount - Σ retenções`. Regras validadas:

- soma das retenções deve ser menor que o bruto (400)
- não pode haver dois lançamentos do mesmo tipo na mesma conta (400)
- vencimento não pode ser anterior à emissão (400)
- empresa, obra, categoria ou fornecedor inexistentes retornam 400 com a mensagem específica

### Pagamento

```json
POST /bills/:id/payment
{ "paymentDate": "2026-06-18" }
```

Pagar uma conta já paga retorna 409. Contas vinculadas a uma fatura **não podem ser pagas individualmente** — o pagamento é registrado na fatura (409). Conta paga não pode ser editada; estorne antes com `DELETE /bills/:id/payment`.

### Filtros

`GET /bills?companyId=&projectId=&categoryId=&supplierId=&status=&month=aaaa-mm&regime=accrual|cash`

- `status`: `PENDING`, `PAID` ou `OVERDUE`
- `month` + `regime=accrual`: contas pela data de **emissão**
- `month` + `regime=cash`: contas pela data de **pagamento**

### Resposta

Além dos campos do registro, a conta traz as relações completas (empresa, obra, categoria, fornecedor, fatura, retenções) e dois campos calculados:

- `effectiveStatus` — `PENDING`, `PAID` ou `OVERDUE`
- `effectiveDueDate` — vencimento da conta, ou o da fatura quando ela pertence a uma

---

## Faturas (`/invoices`)

Uma fatura agrupa várias contas, possivelmente de meses diferentes, e é paga de uma vez.

| Método | Rota                     | Descrição                       |
|--------|--------------------------|---------------------------------|
| POST   | `/invoices`              | Cria fatura e vincula as contas |
| GET    | `/invoices`              | Lista com filtros               |
| GET    | `/invoices/:id`          | Fatura com as contas e totais   |
| PATCH  | `/invoices/:id`          | Atualiza (inclusive as contas)  |
| DELETE | `/invoices/:id`          | Remove e desvincula (204)       |
| POST   | `/invoices/:id/payment`  | Paga a fatura e todas as contas |
| DELETE | `/invoices/:id/payment`  | Estorna                         |

```json
POST /invoices
{
  "number": "FAT-2026-08",
  "companyId": "clx...",
  "supplierId": "clx...",
  "dueDate": "2026-09-15",
  "billIds": ["clx...", "clx...", "clx..."]
}
```

Regras de vínculo:

- todas as contas devem pertencer à mesma empresa da fatura (400)
- conta já vinculada a outra fatura é recusada (409)
- conta já paga individualmente não pode ser faturada (409)
- id repetido na lista é recusado (400)
- a lista não pode ser vazia (400)

Para trocar o conjunto de contas: `PATCH /invoices/:id` com um novo `billIds` — as contas removidas voltam a ser lançamentos avulsos.

### Pagamento

```json
POST /invoices/:id/payment
{ "paymentDate": "2026-09-12" }
```

Marca a fatura e **todas as contas dela** como pagas com essa data, em uma única transação. Fatura paga não pode ser editada, removida nem paga de novo (409) — estorne antes.

### Resposta

```json
{
  "id": "clx...",
  "number": "FAT-2026-08",
  "dueDate": "2026-09-15T00:00:00.000Z",
  "status": "PENDING",
  "effectiveStatus": "PENDING",
  "billCount": 3,
  "grossTotal": "13100.00",
  "withholdingTotal": "0.00",
  "netTotal": "13100.00",
  "bills": [ ... ],
  "company": { ... },
  "supplier": { ... }
}
```

### Filtros

`GET /invoices?companyId=&supplierId=&status=&month=aaaa-mm&regime=accrual|cash`

Para faturas, `accrual` usa a data de vencimento e `cash` a de pagamento.

---

## Contas a receber (`/receivables`)

| Método | Rota                       | Descrição              |
|--------|----------------------------|------------------------|
| POST   | `/receivables`             | Cadastra               |
| GET    | `/receivables`             | Lista com filtros      |
| GET    | `/receivables/:id`         | Detalhe                |
| PATCH  | `/receivables/:id`         | Atualiza               |
| DELETE | `/receivables/:id`         | Remove (204)           |
| POST   | `/receivables/:id/receipt` | Registra recebimento   |
| DELETE | `/receivables/:id/receipt` | Estorna recebimento    |

```json
POST /receivables
{
  "description": "Medição 03 - Loteamento Vale Verde",
  "clientName": "Construtora Vale Verde",
  "amount": "48000.00",
  "issueDate": "2026-05-30",
  "dueDate": "2026-06-30",
  "companyId": "clx...",
  "projectId": "clx..."
}
```

```json
POST /receivables/:id/receipt
{ "receiptDate": "2026-06-28" }
```

**Filtros:** `?companyId=&projectId=&status=&month=aaaa-mm&regime=accrual|cash`

---

## Relatórios (`/reports`)

As três rotas aceitam os mesmos parâmetros:

| Parâmetro   | Obrigatório | Valores                                    |
|-------------|-------------|--------------------------------------------|
| `from`      | sim         | `aaaa-mm`                                  |
| `to`        | sim         | `aaaa-mm`                                  |
| `regime`    | não         | `accrual` (padrão) ou `cash`               |
| `companyId` | não         | omitir = **visão consolidada**             |
| `projectId` | não         | filtra por obra                            |

Período máximo de 36 meses. `from` posterior a `to` retorna 400. A resposta traz `consolidated: true` quando nenhuma entidade foi filtrada.

### Fluxo de caixa — `GET /reports/cashflow`

```
GET /reports/cashflow?from=2026-05&to=2026-09&regime=accrual
```

```json
{
  "regime": "accrual",
  "from": "2026-05",
  "to": "2026-09",
  "consolidated": true,
  "months": [
    {
      "month": "2026-05",
      "inflow": "48000.00",
      "outflow": "19130.00",
      "outflowGross": "20450.00",
      "withholdings": "1320.00",
      "balance": "28870.00",
      "accumulatedBalance": "28870.00"
    }
  ],
  "totals": { "inflow": "...", "outflow": "...", "balance": "..." }
}
```

`outflow` é o valor **líquido** (o que sai para o fornecedor). `outflowGross` e `withholdings` aparecem ao lado para que o imposto retido não fique invisível — ele também vira desembolso depois.

Meses sem movimento aparecem zerados, e `accumulatedBalance` acumula desde o início do período consultado.

### Retenções — `GET /reports/withholdings`

Traz o total retido por entidade e por tipo de imposto, mais a lista das notas que geraram retenção (com bruto, líquido e o detalhe de cada imposto) para conferência.

```json
{
  "companies": [
    { "legalName": "...", "billCount": 1, "total": "1320.00", "byType": [{ "type": "INSS", "amount": "1320.00" }] }
  ],
  "bills": [ ... ],
  "totals": { "billCount": 3, "total": "2094.00", "byType": [ ... ] }
}
```

### Custo por obra — `GET /reports/project-costs`

Obras ordenadas da mais cara para a mais barata, com participação percentual e quebra por categoria. Contas sem obra são agrupadas em **"Despesas administrativas (sem obra)"**.

```json
{
  "projects": [
    {
      "projectId": "clx...",
      "name": "Pavimentação Rodovia Municipal",
      "clientName": "Prefeitura Municipal",
      "status": "ACTIVE",
      "billCount": 2,
      "grossTotal": "27400.00",
      "netTotal": "26080.00",
      "shareOfTotal": "30.89",
      "byCategory": [
        { "categoryId": "clx...", "name": "Locação de Equipamentos", "billCount": 1, "grossTotal": "15400.00" }
      ]
    }
  ],
  "totals": { "billCount": 13, "grossTotal": "88700.00", "netTotal": "86606.00" }
}
```

O custo por obra usa o **valor bruto** — o custo real da obra é a nota inteira, não apenas a parte paga ao fornecedor. O líquido vem junto para comparação.

---

## Como as faturas afetam o fluxo de caixa

Esta é a regra menos óbvia do sistema.

Uma conta **avulsa** entra no fluxo de caixa pela data de emissão (competência) ou de pagamento (caixa). Uma conta **vinculada a uma fatura** ignora as próprias datas e passa a contar pelo **vencimento da fatura** (competência) ou pelo **pagamento da fatura** (caixa).

Exemplo: três notas emitidas em junho, julho e agosto, agrupadas numa fatura que vence em 15/09.

| Visão                      | Junho | Julho | Agosto | Setembro |
|----------------------------|-------|-------|--------|----------|
| Antes de faturar (competência) | 4.800 | 5.200 | 3.100  | —        |
| Depois de faturar (competência)| —     | —     | —      | 13.100   |

O total do período não muda — o valor apenas se desloca para o mês em que o dinheiro efetivamente será tratado. Isso vale para a listagem de contas (`GET /bills?month=`) e para os três relatórios.

O mesmo se aplica ao status: uma conta dentro de uma fatura herda o vencimento e o status dela, refletidos em `effectiveStatus` e `effectiveDueDate`.
