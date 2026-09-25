<div align="center">

# FinanceBoard

Controle financeiro para empresas de terraplenagem e transporte — contas a pagar, faturas, retenções de impostos, fluxo de caixa por competência e por caixa, e custo por obra.

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## Sobre o projeto

A operação acontece sob dois CNPJs — uma empresa de terraplenagem e locações e outra de transporte e serviços. Toda conta pertence a uma dessas entidades, e os relatórios podem ser vistos por entidade isolada ou consolidados.

O sistema resolve quatro problemas que uma planilha não resolve bem:

- **Competência x caixa.** A mesma base de dados conta duas histórias: quando a despesa foi gerada (data de emissão) e quando o dinheiro saiu (data de pagamento). O usuário escolhe qual visão está vendo.
- **Faturas que atravessam meses.** Uma fatura agrupa contas de meses diferentes. Essas contas saem do fluxo de caixa do mês de emissão delas e passam a contar no mês em que a fatura vence ou é paga — sem duplicar nem sumir com valor nenhum.
- **Retenções de impostos.** O valor bruto da nota difere do valor efetivamente pago. O sistema guarda bruto, cada retenção (INSS, ISS, IRRF, PIS/COFINS/CSLL) e o líquido, com relatório por período e por entidade.
- **Custo por obra.** Quanto cada obra consumiu no período, com quebra por categoria e comparação entre obras. Despesas administrativas sem obra aparecem em um grupo separado.

---

## Stack

| Camada    | Tecnologia                        |
|-----------|-----------------------------------|
| API       | NestJS 10 + TypeScript            |
| ORM       | Prisma 5                          |
| Banco     | PostgreSQL 16 (via Docker Compose)|
| Validação | class-validator                   |
| Frontend  | React 19 + Vite + Mantine 9       |
| Auth      | JWT + refresh rotativo, Argon2id  |

Valores monetários usam `Decimal` do Prisma (`NUMERIC` no Postgres), nunca float. A API é REST pura, sem renderização no backend — a formatação de datas (dd/mm/aaaa) e de moeda fica a cargo do frontend.

---

## Como rodar

Requisitos: **Node.js 20+** e **Docker**.

```bash
git clone https://github.com/J0aoSoares/FinanceBoard.git
cd FinanceBoard/backend

# 1. Configure as variáveis de ambiente
#    Preencha JWT_SECRET (32+ caracteres), CORS_ORIGINS e SEED_ADMIN_NAME/EMAIL/PASSWORD —
#    sem eles a API se recusa a subir e o seed falha (não há senha padrão no código).
cp .env.example .env

# 2. Suba o Postgres
docker compose up -d

# 3. Instale as dependências
npm install

# 4. Crie as tabelas
npm run prisma:migrate

# 5. Crie o ADMIN inicial (SEED_ADMIN_* no .env). Para também popular um banco
#    vazio com dados de exemplo, defina SEED_SAMPLE_DATA=true no .env antes.
npm run prisma:seed

# 6. Rode a API
npm run start:dev
```

A API sobe em **http://localhost:3000**.

Com a API no ar, suba a interface em outro terminal:

```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

O frontend sobe em **http://localhost:5173**.

Para rodar em **produção num servidor da empresa** (Docker Compose único com HTTPS e backup diário, acessado pelos outros PCs via navegador), siga [`deploy/README-ubuntu.md`](deploy/README-ubuntu.md) — ou [`deploy/README.md`](deploy/README.md) se o servidor for Windows.

A documentação completa das rotas, com exemplos de payload, está em [`backend/README.md`](backend/README.md). As decisões do frontend — camadas de dinheiro e data, design tokens e estado global — estão em [`frontend/README.md`](frontend/README.md).

---

## Estrutura

```
FinanceBoard/
├── backend/
│   ├── docker-compose.yml       # Postgres
│   ├── prisma/
│   │   ├── schema.prisma        # Models e relações
│   │   ├── migrations/          # Histórico do schema
│   │   └── seed.ts              # Base de exemplo
│   ├── test/                    # Suíte e2e contra Postgres real
│   └── src/
│       ├── auth/                # Login, JWT, refresh rotativo, guards e papéis
│       ├── user/                # Usuários (ADMIN / OPERATOR)
│       ├── config/              # Validação das variáveis de ambiente
│       ├── company/             # Entidades (CNPJs)
│       ├── project/             # Obras / centros de custo
│       ├── supplier/            # Fornecedores
│       ├── category/            # Categorias de despesa
│       ├── bill/                # Contas a pagar
│       ├── invoice/             # Faturas (agrupam contas)
│       ├── receivable/          # Contas a receber
│       ├── report/              # Fluxo de caixa, retenções, custo por obra
│       ├── prisma/              # PrismaService (conexão)
│       └── common/              # Utilitários de período
└── frontend/
    └── src/
        ├── api/                 # Tipos e chamadas por recurso
        ├── auth/                # AuthProvider, rotas protegidas e admin-only
        ├── components/          # Primitivos: campos, exibição, layout, navegação
        ├── features/
        │   ├── auth/            # Tela de login
        │   ├── bills/           # Contas a pagar
        │   ├── invoices/        # Faturas: lista, detalhe, composição
        │   ├── receivables/     # Contas a receber
        │   ├── reports/         # Fluxo de caixa, retenções, custo por obra
        │   ├── companies/ projects/ suppliers/ categories/   # Cadastros
        │   └── users/           # Usuários e senhas (ADMIN)
        ├── hooks/               # Filtros globais e queries
        ├── lib/                 # money, date, http — as camadas críticas
        ├── styles/              # tokens.css: fonte da verdade do design
        └── theme/               # Tema Mantine lendo os tokens
```

O backend é REST puro e não assume nada sobre o frontend. A interface cobre toda a API: contas a pagar, faturas (composição e pagamento em cascata), contas a receber, os três relatórios e os cadastros (empresas, obras, fornecedores, categorias e usuários), com login por JWT e restrição por papel.

---

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.
