# FinanceBoard — API

Referência das rotas do backend. Base: `http://localhost:3000`.

## Sumário

- [Setup](#setup)
- [Convenções](#convenções)
- [Autenticação](#autenticação)
- [Usuários](#usuários-users)
- [Empresas](#empresas-companies)
- [Nomes únicos](#nomes-únicos-fornecedores-categorias-e-obras)
- [Obras](#obras-projects)
- [Fornecedores](#fornecedores-suppliers)
- [Categorias](#categorias-categories)
- [Boletos](#boletos-bills)
- [Faturas (fora da interface)](#faturas-invoices)
- [Contas a Receber](#contas-a-receber-receivables)
- [Relatórios](#relatórios-reports)

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

A suíte é **end-to-end**: sobe a aplicação inteira e bate nas rotas HTTP contra um Postgres real. Nada de mock — as regras que mais importam aqui (cálculo do líquido das NFs de serviço, soma dos boletos da NF, datas usadas por cada regime) vivem em consultas Prisma e aritmética de `Decimal`, e mock nenhum verifica isso.

Os testes rodam num banco **separado** (`financeboard_test`), criado e migrado automaticamente na primeira execução. Cada teste começa com as tabelas truncadas, então o banco de desenvolvimento nunca é tocado. Como a suíte apaga tudo, ela se recusa a rodar se a `DATABASE_URL` do `.env.test` não apontar para um banco com `financeboard_test` no nome.

| Arquivo                     | Cobre                                                        |
|-----------------------------|--------------------------------------------------------------|
| `auth.e2e-spec.ts`          | Login, papéis, rotação e reuso de refresh, logout, expurgo     |
| `user.e2e-spec.ts`          | CRUD de usuários, redefinição e troca de senha, desativação    |
| `company.e2e-spec.ts`       | CNPJ único e formatado, bloqueio de remoção com vínculos      |
| `catalog.e2e-spec.ts`       | Obras, categorias e fornecedores, com nomes únicos normalizados |
| `bill.e2e-spec.ts`          | Boletos, NF com vários boletos, linha digitável, filtros por data |
| `invoice.e2e-spec.ts`       | Módulo de faturas, mantido no backend fora da interface        |
| `receivable.e2e-spec.ts`    | NFs de serviço, retenções sofridas, recebimento, tomador, totais da obra |
| `report.e2e-spec.ts`        | Fluxo de caixa conferido com as telas, retenções sofridas, resultado por obra |

---

## Convenções

**Datas.** Entrada sempre em `aaaa-mm-dd`. Saída em ISO 8601. A formatação `dd/mm/aaaa` é responsabilidade do frontend.

**Valores.** Enviados e recebidos como string decimal (`"1234.56"`), nunca number — evita erro de ponto flutuante em dinheiro. Campos de registro (`grossAmount`, `netAmount`) vêm como o Postgres armazena (`"1000"`); totais calculados (resumo da NF, totais da obra e relatórios) vêm sempre com duas casas (`"1000.00"`).

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

CNPJ com exatamente 14 dígitos, sem pontuação, e único no sistema. Remover empresa com boletos ou contas a receber vinculados retorna 409.

---

## Nomes únicos: fornecedores, categorias e obras

Fornecedor, categoria e obra têm nome **único ignorando maiúsculas, acentos e espaços**. A API grava, ao lado do nome, uma chave normalizada (`nameKey`) com índice único: "Posto Ipiranga", "posto ipiranga " e "Pôsto Ipirangá" são o mesmo nome. Cadastrar ou renomear para um nome equivalente retorna 409, e os espaços nas pontas são removidos antes de gravar.

O frontend usa isso no cadastro na hora: se a API recusar por duplicidade (outra sessão criou o mesmo nome no meio-tempo), ele busca o registro existente e o seleciona, em vez de mostrar erro.

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

`clientName` é obrigatório. `status` aceita `ACTIVE` (padrão) ou `CLOSED`. Para encerrar uma obra: `PATCH /projects/:id` com `{"status": "CLOSED"}`.

Obra com boletos ou contas a receber vinculados **não pode ser removida** (409) — encerre em vez de remover. Apagá-la desvincularia os lançamentos, jogando o custo dela para as despesas administrativas no relatório.

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

`document` é opcional e aceita 11 dígitos (CPF) ou 14 (CNPJ), sem pontuação. Remover fornecedor com boletos vinculados retorna 409.

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

Remover categoria com boletos vinculados retorna 409.

---

## Boletos (`/bills`)

Os boletos que a empresa recebe e precisa pagar. Vários boletos podem pertencer à mesma NF do fornecedor; um boleto avulso é simplesmente uma NF com um boleto só.

| Método | Rota                             | Descrição                                   |
|--------|----------------------------------|---------------------------------------------|
| POST   | `/bills/installments`            | Cadastra uma NF com 1 a 60 boletos          |
| POST   | `/bills`                         | Cadastra um boleto isolado                  |
| GET    | `/bills`                         | Lista com filtros                           |
| GET    | `/bills/:id`                     | Detalhe                                     |
| PATCH  | `/bills/:id`                     | Atualiza um boleto                          |
| DELETE | `/bills/:id`                     | Remove um boleto (204)                      |
| DELETE | `/bills/installments/:groupId`   | Remove a NF inteira (204)                   |
| POST   | `/bills/:id/payment`             | Registra pagamento                          |
| DELETE | `/bills/:id/payment`             | Estorna pagamento                           |

### Cadastro da NF com os boletos

```json
POST /bills/installments
{
  "documentNumber": "NF-7788",
  "description": "Rompedor hidráulico para escavadeira",
  "issueDate": "2026-04-20",
  "companyId": "clx...",
  "projectId": "clx...",
  "categoryId": "clx...",
  "supplierId": "clx...",
  "totalAmount": "1000.00",
  "installments": [
    { "label": "A", "dueDate": "2026-05-15", "amount": "333.34", "digitableLine": "03395.55005 ..." },
    { "label": "B", "dueDate": "2026-06-15", "amount": "333.33" },
    { "label": "C", "dueDate": "2026-07-15", "amount": "333.33" }
  ]
}
```

Todos os boletos são criados **numa única transação**: se um falhar, nenhum é gravado. O vínculo entre os boletos da mesma NF é um **identificador de grupo persistido** (`groupId`), nunca inferido pelo número da NF — NFs de fornecedores diferentes podem ter o mesmo número.

Regras validadas:

- `description` é obrigatória; `documentNumber` (número da NF) e `issueDate` (emissão) são **opcionais** — o boleto pode chegar antes da nota
- de 1 a 60 boletos, com rótulos únicos na NF (sem diferenciar maiúsculas)
- nenhum vencimento anterior à emissão da NF (quando informada)
- `totalAmount` é **opcional**: se informado, a soma dos boletos precisa ser igual a ele (conferido em `Decimal`); se omitido, a NF vale a soma dos boletos
- `projectId` é opcional (despesas administrativas não têm obra)
- empresa, obra, categoria ou fornecedor inexistentes retornam 400 com a mensagem específica

Boleto tem um valor só: a API grava `grossAmount = netAmount = amount` e nenhuma retenção. Enviar `grossAmount` ou `withholdings` retorna 400.

`POST /bills` cadastra um boleto isolado, sem grupo, com `description`, `amount`, `dueDate`, `digitableLine` (opcional), `paymentDate` (opcional), `documentNumber` e `issueDate` (opcionais) e as relações.

### Número do documento / linha digitável (`digitableLine`)

Opcional, até 60 caracteres. Guarda o **número do documento** do boleto (texto livre, ex.: `"1909223"`) ou a **linha digitável**. Quando o valor tem o formato de uma linha digitável completa — 47 dígitos (boleto bancário) ou 48 (arrecadação, começando com 8), aceitando colagem com espaços e pontos — ele é gravado só com dígitos e validado pelos **dígitos verificadores** de cada campo e do código de barras; linha inválida retorna 400 com o motivo, por exemplo `"Linha digitável inválida: dígito verificador do 2º campo não confere"`. Qualquer outro valor é gravado como foi digitado (sem espaços nas pontas). Para apagar o campo de um boleto, envie `"digitableLine": null` no `PATCH`.

### Boleto já pago no cadastro

`POST /bills` e cada item de `installments` em `POST /bills/installments` aceitam `paymentDate` (opcional, `aaaa-mm-dd`). Com ele, o boleto já nasce `PAID` com essa data de pagamento; sem ele, nasce `PENDING`. No `PATCH` o campo não é aceito — pagamento e estorno continuam em `/bills/:id/payment`.

### Edição, pagamento e exclusão

Pagar, estornar e editar são **por boleto**, com uma exceção: `documentNumber` e `issueDate` são dados da NF e, ao editar um boleto de grupo, são gravados em **todos os boletos do grupo** (enviar `null` limpa). Boleto pago só aceita `PATCH` com esses dois campos — é assim que se completa a NF que chegou depois do pagamento; para mudar o resto, estorne antes com `DELETE /bills/:id/payment`.

```json
POST /bills/:id/payment
{ "paymentDate": "2026-06-18" }
```

`DELETE /bills/installments/:groupId` remove a NF inteira e é recusado (409) se algum boleto dela estiver pago. Remover o último boleto de uma NF remove também o grupo.

**Boletos antigos com retenções.** Contas lançadas antes do modelo de boletos podem ter retenções e bruto diferente do líquido. Elas continuam no banco como histórico: os demais campos podem ser editados, mas o valor não (409), e o valor do boleto é o líquido.

### Filtros

`GET /bills?companyId=&projectId=&categoryId=&supplierId=&status=&month=aaaa-mm&dateBasis=issue|due|payment`

- `status`: `PENDING`, `PAID` ou `OVERDUE`
- `month` + `dateBasis` escolhe a data usada: `issue` (emissão da NF), `due` (vencimento — é o que a tela de Boletos usa) ou `payment` (pagamento)
- sem `dateBasis`, vale o parâmetro antigo `regime` (`accrual` = emissão, `cash` = pagamento); informar os dois retorna 400

### Resposta

Além dos campos do registro e das relações, cada boleto traz `effectiveStatus` e o resumo da NF a que pertence:

```json
"group": { "id": "clx...", "position": 2, "billCount": 3, "paidCount": 1, "totalAmount": "1000.00" }
```

`group` é `null` para boleto isolado. `position` é a ordem do boleto na NF ("boleto B · 2/3") e é recalculada quando um boleto é removido.

---

## Faturas (`/invoices`)

**Fora da interface.** A empresa não registra faturas. O módulo continua no backend por compatibilidade — a decisão de removê-lo é separada —, mas o frontend não o usa e o seed não cria faturas. A migração `20260929120100_detach_bills_from_invoices` desvinculou os boletos que estavam em faturas, preservando o vencimento, o status e a data de pagamento que valiam para cada um. Desde então os boletos se comportam pelas próprias datas.

As rotas (`POST/GET/PATCH/DELETE /invoices`, `POST/DELETE /invoices/:id/payment`) seguem funcionando e cobertas por `invoice.e2e-spec.ts`. Um boleto dentro de fatura herda o vencimento e o status dela e só pode ser pago pela fatura.

---

## Contas a Receber (`/receivables`)

As NFs de serviço que a própria empresa emite para obras e clientes pagarem. É aqui que moram as **retenções sofridas**: quem sofre retenção é a empresa, como prestadora, quando o tomador paga a NF.

| Método | Rota                          | Descrição                                   |
|--------|-------------------------------|---------------------------------------------|
| POST   | `/receivables`                | Cadastra NF de serviço                      |
| GET    | `/receivables`                | Lista com filtros                           |
| GET    | `/receivables/client-names`   | Tomadores já usados (`?companyId=`)         |
| GET    | `/receivables/summary`        | Totais de uma obra (`?projectId=`)          |
| GET    | `/receivables/:id`            | Detalhe                                     |
| PATCH  | `/receivables/:id`            | Atualiza                                    |
| DELETE | `/receivables/:id`            | Remove (204)                                |
| POST   | `/receivables/:id/receipt`    | Registra recebimento                        |
| DELETE | `/receivables/:id/receipt`    | Estorna recebimento                         |

```json
POST /receivables
{
  "number": "NFS-0101",
  "companyId": "clx...",
  "clientName": "Construtora Vale Verde",
  "projectId": "clx...",
  "competence": "2026-05",
  "issueDate": "2026-05-30",
  "description": "Medição 03 - Loteamento Vale Verde",
  "grossAmount": "48000.00",
  "withholdings": [
    { "type": "INSS", "amount": "5280.00" },
    { "type": "ISS", "amount": "2400.00" }
  ],
  "dueDate": "2026-06-30"
}
```

- `number` é único **por empresa emissora** (409 se repetir na mesma empresa; outra empresa pode usar o mesmo número)
- `clientName` é o tomador (quem paga); `projectId` é **opcional** — há NFs emitidas para clientes sem obra
- `competence` no formato `aaaa-mm`
- retenções: `INSS`, `ISS`, `IRRF`, `PIS_COFINS_CSLL`, no máximo uma de cada tipo, cada uma maior que zero, e a soma **menor que o bruto** (400)
- **o líquido é calculado pelo backend**: `netAmount = grossAmount − Σ retenções`; enviar `netAmount` retorna 400
- a resposta traz `withholdings` e `withholdingTotal`

As retenções sofridas ficam em `receivable_withholdings`. As retenções antigas, lançadas em contas a pagar antes deste modelo, continuam em `tax_withholdings` como histórico; as duas tabelas usam o mesmo enum de tipos.

```json
POST /receivables/:id/receipt
{ "receiptDate": "2026-06-28" }
```

O valor esperado no recebimento é o **líquido**, e é ele que entra no fluxo de caixa. NF recebida não pode ser editada; estorne antes.

**Filtros:** `?companyId=&projectId=&clientName=&status=&month=aaaa-mm&dateBasis=competence|issue|receipt`. A tela de Contas a Receber usa `dateBasis=competence`. `clientName` compara o tomador exatamente, com os valores devolvidos por `/receivables/client-names`.

**Totais da obra:** `GET /receivables/summary?projectId=` devolve `invoiceCount`, `receivedCount`, `grossInvoiced`, `withholdingTotal`, `netInvoiced`, `received` (líquido das NFs recebidas) e `outstanding` (líquido das NFs pendentes) — é o que a tela de detalhe da obra mostra.

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

### Qual data cada regime usa

| Lançamento       | Competência (`accrual`)           | Caixa (`cash`)            |
|------------------|-----------------------------------|---------------------------|
| NF de serviço    | mês de **competência** da NF      | data de recebimento       |
| Boleto           | data de **emissão** da NF (sem NF: vencimento) | data de pagamento |

Os testes de `report.e2e-spec.ts` provam, mês a mês e nos dois regimes, que os totais do fluxo de caixa são iguais à soma das listagens de Boletos (`dateBasis=issue` / `payment`) e de Contas a Receber (`dateBasis=competence` / `receipt`).

### Fluxo de caixa — `GET /reports/cashflow`

```json
{
  "regime": "accrual",
  "from": "2026-05",
  "to": "2026-09",
  "consolidated": true,
  "months": [
    {
      "month": "2026-05",
      "inflow": "40320.00",
      "inflowGross": "48000.00",
      "inflowWithholdings": "7680.00",
      "outflow": "19130.00",
      "balance": "21190.00",
      "accumulatedBalance": "21190.00"
    }
  ],
  "totals": { "inflow": "...", "inflowGross": "...", "inflowWithholdings": "...", "outflow": "...", "balance": "..." }
}
```

`inflow` é o **líquido** das NFs de serviço; `inflowGross` e `inflowWithholdings` mostram o faturado bruto e as retenções sofridas. `outflow` é o valor dos boletos. Meses sem movimento aparecem zerados, e `accumulatedBalance` acumula desde o início do período consultado.

### Retenções sofridas — `GET /reports/withholdings`

As retenções sofridas nas NFs de serviço — o valor que a contabilidade compensa.

```json
{
  "companies": [
    { "companyId": "clx...", "legalName": "...", "cnpj": "...", "invoiceCount": 2, "total": "7680.00", "byType": [{ "type": "INSS", "amount": "5280.00" }] }
  ],
  "projects": [
    { "projectId": "clx...", "name": "...", "invoiceCount": 2, "total": "7680.00", "byType": [ ... ] }
  ],
  "invoices": [
    { "number": "NFS-0101", "legalName": "...", "projectName": "...", "clientName": "...", "competence": "...", "grossAmount": "48000.00", "withholdingTotal": "7680.00", "netAmount": "40320.00", "amountsByType": { "INSS": "5280.00", "ISS": "2400.00", "IRRF": "0.00", "PIS_COFINS_CSLL": "0.00" } }
  ],
  "totals": { "invoiceCount": 2, "total": "...", "grossAmount": "...", "netAmount": "...", "byType": [ ... ] },
  "legacy": { "bills": [ ... ], "totals": { "billCount": 2, "total": "774.00", "byType": [ ... ] } }
}
```

`legacy` traz, em separado, as retenções antigas lançadas em boletos antes deste modelo. Elas **não entram** em `totals` — não são retenções sofridas — e aparecem na tela num bloco recolhido de histórico, com exportação própria.

### Resultado por obra — `GET /reports/project-results`

```json
{
  "projects": [
    {
      "projectId": "clx...",
      "name": "Pavimentação Rodovia Municipal",
      "revenue": { "invoiceCount": 1, "grossAmount": "65000.00", "withholdingTotal": "4225.00", "netAmount": "60775.00" },
      "received": "60775.00",
      "outstanding": "0.00",
      "cost": { "billCount": 2, "total": "27400.00", "byCategory": [ { "name": "Locação de Equipamentos", "billCount": 1, "total": "15400.00" } ] },
      "result": "33375.00"
    }
  ],
  "administrative": { "billCount": 3, "total": "7100.00", "byCategory": [ ... ] },
  "unassignedRevenue": { "revenue": { ... }, "received": "...", "outstanding": "..." },
  "totals": { "revenue": { ... }, "received": "...", "outstanding": "...", "projectCost": "...", "administrativeCost": "...", "cost": "...", "result": "..." }
}
```

- **receita**: NFs de serviço da obra no período (bruto, retenções e líquido)
- **recebido**: líquido das NFs recebidas **dentro do período**, qualquer que seja a competência
- **custo**: boletos lançados na obra no período, com quebra por categoria; boletos antigos com retenções entram pelo valor bruto
- **resultado** = recebido − custo
- `administrative` agrupa os boletos sem obra: ficam fora do resultado das obras, mas somam no consolidado; `unassignedRevenue` faz o mesmo com as NFs sem obra
- consolidado: `totals.result` = recebido total − (custo das obras + despesas administrativas)
