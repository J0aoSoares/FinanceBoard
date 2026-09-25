# FinanceBoard — Frontend

Interface React do FinanceBoard. Consome a API descrita em [`../backend/README.md`](../backend/README.md).

## Setup

O backend precisa estar no ar antes.

```bash
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm install
npm run dev               # http://localhost:5173
```

| Comando            | O que faz                                  |
|--------------------|--------------------------------------------|
| `npm run dev`      | Servidor de desenvolvimento com HMR        |
| `npm run build`    | Typecheck + build de produção em `dist/`   |
| `npm run lint`     | ESLint + Prettier com `--fix`              |
| `npm run format`   | Prettier em `src/`                         |
| `npm run preview`  | Serve o `dist/` para conferência           |

## Stack

| Camada            | Escolha                  | Por quê |
|-------------------|--------------------------|---------|
| Build             | Vite + React 19 + TS     | React 19.2 é peer do Mantine 9 |
| UI                | Mantine 9                | v9 é 100% CSS-variables, o que permite o tema ler os tokens |
| Datas             | `@mantine/dates` + dayjs | Valores em string `YYYY-MM-DD`, sem objeto `Date` |
| Formulário        | `@mantine/form`          | `getInputProps` e `insertListItem` para a lista de retenções |
| Estado de servidor| TanStack Query           | Cache e invalidação após mutação |
| Rotas             | React Router             | `useSearchParams` é o store dos filtros globais |

Não usamos `decimal.js` (soma em centavos inteiros basta) nem lib de estado global (a URL é o store).

## As duas camadas que não podem ser contornadas

Sistema financeiro quebra em dois lugares. Cada um tem um módulo único, e nenhum componente pode fazer o trabalho por conta própria.

### `src/lib/money.ts` — dinheiro é string

A API envia e recebe decimal como string (`"1234.56"`), nunca number. **Nada de `parseFloat` em valor monetário**: `1234.56 * 100` em float dá `123455.99999999999`.

```
parseMoneyInput('1.234,56')  ->  '1234.56'      entrada pt-BR -> canônico da API
formatMoney('1000')          ->  '1.000,00'     canônico -> exibição pt-BR
toCents / fromCents / sumMoney / subtractMoney  aritmética em centavos inteiros
```

Atenção a um detalhe do backend: campos de registro chegam **como o Postgres devolve** — `grossAmount` pode vir `"8450"`, sem casas. Totais calculados chegam com duas (`"8450.00"`). `formatMoney` normaliza os dois.

### `src/lib/date.ts` — data sem fuso

O backend grava meia-noite **UTC** e devolve ISO completo. O usuário está em UTC-3, então a conversão ingênua volta um dia:

```
new Date('2026-05-20T00:00:00.000Z').toLocaleDateString('pt-BR')  ->  19/05/2026   errado
formatDate('2026-05-20T00:00:00.000Z')                            ->  20/05/2026   certo
```

`apiDate()` faz **recorte de string** (`slice(0, 10)`), não parsing. Só este arquivo importa dayjs ou usa `new Date`.

`@mantine/dates` v9 já trabalha com strings `YYYY-MM-DD` sem fuso, então o picker nunca cria um `Date`. O `MonthPickerInput` emite o primeiro dia do mês, e `MonthField` é quem traduz para `aaaa-mm` — é o único ponto dessa conversão.

## Design tokens

`src/styles/tokens.css` é a fonte da verdade, em dois níveis:

- **Primitivos** — paleta, espaçamento, radius, tipografia. Definidos **uma vez** em `:root`.
- **Semânticos** — `--fb-surface`, `--fb-text`, `--fb-border`, e os financeiros `--fb-inflow`, `--fb-outflow`, `--fb-status-pending/paid/overdue`. Só estes são redefinidos sob `[data-mantine-color-scheme='dark']`; a paleta nunca é escrita duas vezes.

`src/theme/theme.ts` monta o `createTheme()` com as escalas preenchidas por `var(--fb-*)` — nenhum valor de cor hardcoded no objeto de tema. Trocar um token no CSS reflete em todos os componentes Mantine sem editar TypeScript.

`src/theme/css-variables-resolver.ts` liga os semânticos ao que o Mantine espera (`--mantine-color-body`, `--mantine-color-text`, …). Ele passa o **mesmo** objeto para `light` e `dark` de propósito: o resolver padrão do Mantine define essas variáveis nos dois blocos de esquema, que têm especificidade maior que `:root`; sobrescrevendo ambos com a mesma indireção, quem decide a troca é o `tokens.css`.

**Uma limitação registrada:** `isLightColor()` do Mantine não consegue avaliar `var()` e sempre devolve `false`, o que quebraria `autoContrast`. Por isso o tema usa `autoContrast: false` e a cor de contraste vem do token `--fb-brand-contrast`. As demais funções de cor (`alpha`, `darken`, `lighten`) detectam `var()` e emitem `color-mix()`, então `variant="light"` funciona normalmente.

## Estado compartilhado entre telas

Três filtros valem para o app inteiro e vivem na **query string**, via `useGlobalFilters()`:

| Estado       | Param       | Padrão                    |
|--------------|-------------|---------------------------|
| Empresa      | `companyId` | ausente = **consolidado** |
| Competência  | `month`     | mês corrente              |
| Regime       | `regime`    | `accrual`                 |

Sem provider e sem lib de estado: a URL sobrevive a refresh e pode ser compartilhada. Os filtros próprios da tela (`projectId`, `categoryId`, `supplierId`, `status`) usam o mesmo mecanismo.

A **única exceção** é a identidade do usuário logado, em `src/auth/AuthProvider.tsx`: quem está logado não é filtro de tela, não faz sentido na URL e é lido por praticamente todo componente. Vale a pena o context.

## Autenticação

O backend fecha tudo com `JwtAuthGuard` global — só `POST /auth/login` e `POST /auth/refresh` são públicas.

- **Onde ficam os tokens** (`src/lib/auth-storage.ts`): o access token (15 min) vive só em memória; o refresh token, opaco, no `localStorage`. No boot o provider chama `GET /auth/me` sem header, toma 401 e deixa o cliente HTTP renovar — é a reidratação da sessão.
- **Refresh serializado** (`src/lib/http.ts`): o backend rotaciona o refresh token e **revoga a família inteira** se um token já usado reaparecer. Duas requisições que tomam 401 ao mesmo tempo não podem disparar dois refresh, então todas esperam a mesma promise (`ensureRefreshed`). Mexer nisso sem entender o motivo desloga o usuário em toda tela que carrega várias queries de uma vez.
- **403 não desloga** — só 401 derruba a sessão. Perfil sem permissão é erro de tela, não fim de sessão.
- **Papéis:** `canWrite` (do `useAuth()`) é falso para `VIEWER`, que a API recusa em qualquer verbo de escrita. As telas escondem botões e a coluna de ações em vez de deixar o usuário descobrir a restrição no 403. `isAdmin` libera `/users`.

## Conversando com a API

`src/lib/http.ts` concentra o acesso:

- Query string **omite** `undefined` e string vazia. Não é estética — o `ValidationPipe` roda com `whitelist + forbidNonWhitelisted`, e `projectId=''` retorna `400 "Obra informada não existe"`.
- Erro vira `ApiError` com `status` e `messages: string[]` (array nos 400 de validação, string nos 404/409). **A mensagem da API é exibida como veio**, já em português.

## Estrutura

```
src/
├── api/           tipos e chamadas por recurso
├── components/
│   ├── display/   MoneyText, StatusBadge
│   ├── fields/    DateField, MonthField, MoneyInput e os selects de entidade
│   └── layout/    AppLayout, GlobalFilterBar, ColorSchemeToggle
├── features/
│   └── bills/     tela de contas a pagar
├── hooks/         use-global-filters, use-bills, use-catalog
├── lib/           money, date, http, notify
├── styles/        tokens.css (fonte da verdade), global.css
└── theme/         tema Mantine lendo os tokens
```

## Estado atual

Pronto: **Contas a pagar** (`/bills`) — tabela com totais, filtros, cadastro e edição com retenções, pagar, estornar e excluir.

Pendente: faturas, contas a receber, relatórios e as telas de cadastro. Os selects já leem esses recursos; falta a manutenção.

Duas regras do backend que a tela reflete e vale conhecer:

- O status exibido é `effectiveStatus`, calculado na leitura — `OVERDUE` nunca é digitado.
- Conta dentro de uma fatura herda vencimento e status dela (`effectiveDueDate`) e **não pode ser paga individualmente**; o pagamento é registrado na fatura.
