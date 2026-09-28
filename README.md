<div align="center">

# FinanceBoard

Controle financeiro para empresas de terraplenagem e transporte — boletos a pagar, NFs de serviço a receber com as retenções sofridas, fluxo de caixa por competência e por caixa, e resultado por obra.

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## Sobre o projeto

A operação acontece sob dois CNPJs — uma empresa de terraplenagem e locações e outra de transporte e serviços. Todo boleto e toda NF de serviço pertencem a uma dessas entidades, e os relatórios podem ser vistos por entidade isolada ou consolidados.

O sistema resolve quatro problemas que uma planilha não resolve bem:

- **Competência x caixa.** A mesma base de dados conta duas histórias: quando a receita e a despesa foram geradas (competência da NF de serviço e emissão da NF do fornecedor) e quando o dinheiro entrou ou saiu (recebimento e pagamento). O usuário escolhe qual visão está vendo.
- **Vários boletos da mesma NF.** Uma compra paga em vários boletos é cadastrada de uma vez, e cada boleto aparece no mês do próprio vencimento, com a posição na NF ("boleto C · 3/10") e o progresso de pagamento. A linha digitável é validada pelos dígitos verificadores.
- **Retenções sofridas.** Quando o tomador paga a NF de serviço, retém impostos (INSS, ISS, IRRF, PIS/COFINS/CSLL). O sistema guarda o bruto, cada retenção e o líquido — que é o que entra no caixa —, com relatório por empresa, por tipo e por obra para a contabilidade compensar.
- **Resultado por obra.** Receita das NFs emitidas, recebido no período, custo dos boletos lançados na obra (por categoria) e o resultado. Boletos sem obra aparecem como despesas administrativas, fora das obras mas somados no consolidado.

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
│       ├── bill/                # Boletos (NF do fornecedor com um ou mais boletos)
│       ├── invoice/             # Faturas (mantidas no backend, fora da interface)
│       ├── receivable/          # Contas a receber (NFs de serviço e retenções sofridas)
│       ├── report/              # Fluxo de caixa, retenções sofridas, resultado por obra
│       ├── prisma/              # PrismaService (conexão)
│       └── common/              # Período, linha digitável, nome normalizado
└── frontend/
    └── src/
        ├── api/                 # Tipos e chamadas por recurso
        ├── auth/                # AuthProvider, rotas protegidas e admin-only
        ├── components/          # Primitivos: campos, exibição, layout, navegação
        ├── features/
        │   ├── auth/            # Tela de login
        │   ├── bills/           # Boletos: NF com vários boletos, listagem por vencimento
        │   ├── receivables/     # Contas a receber: NFs de serviço
        │   ├── reports/         # Fluxo de caixa, retenções sofridas, resultado por obra
        │   ├── projects/        # Obras, com o detalhe de faturado e recebido
        │   ├── companies/ suppliers/ categories/   # Cadastros
        │   └── users/           # Usuários e senhas (ADMIN)
        ├── hooks/               # Filtros globais e queries
        ├── lib/                 # money, date, http — as camadas críticas
        ├── styles/              # tokens.css: fonte da verdade do design
        └── theme/               # Tema Mantine lendo os tokens
```

O backend é REST puro e não assume nada sobre o frontend. A interface cobre boletos, contas a receber, os três relatórios e os cadastros (empresas, obras, fornecedores, categorias e usuários), com login por JWT e restrição por papel. Fornecedor, categoria e obra podem ser cadastrados na hora, digitando o nome no próprio formulário. O módulo de faturas continua no backend, mas saiu da interface.

---

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.
