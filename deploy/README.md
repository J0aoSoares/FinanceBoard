# FinanceBoard em produção — notebook-servidor na rede da empresa

Guia para deixar o sistema rodando 24/7 num notebook Windows 10 e acessá-lo dos outros PCs pelo navegador, com HTTPS. Não se instala nada nos PCs além do certificado (uma vez).

> **Existe um caminho melhor: [README-ubuntu.md](README-ubuntu.md).** Trocar o Windows por Ubuntu Server no notebook-servidor resolve o ponto mais fraco deste guia — no Windows, para os containers voltarem sozinhos depois de uma queda de energia, é preciso **desativar a tela de login** (passo 1.4), o que deixa destravado um equipamento com dados financeiros. No Ubuntu o Docker é serviço do sistema e sobe sem login nenhum. Use este guia aqui se quiser manter o Windows no notebook.

```
[Notebook-servidor]  IP fixo, ligado 24/7, tampa fechada
  Docker Desktop
   ├─ postgres   banco (só visível dentro do Docker)
   ├─ api        NestJS
   ├─ web        Caddy: site + /api → api + HTTPS      ← portas 80 e 443
   └─ backup     pg_dump diário em .\backups (30 dias)

[PC 1] ─┐
        ├─ navegador → https://financeboard.local
[PC 2] ─┘
```

Todos os comandos abaixo são para **PowerShell como Administrador** no notebook, salvo indicação.

---

## Parte 1 — Preparar o notebook

### 1.1 Instalar o que falta

- [Git para Windows](https://git-scm.com/download/win)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — na instalação, mantenha "Use WSL 2". Reinicie se pedir.
- Em Docker Desktop → Settings → General, marque **Start Docker Desktop when you sign in**.

### 1.2 Limitar a memória do Docker

Copie `deploy/wslconfig.example` deste repositório para `C:\Users\<seu-usuario>\.wslconfig` e rode:

```powershell
wsl --shutdown
```

### 1.3 Nunca dormir, nunca hibernar, tampa fechada = nada

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 10
powercfg /hibernate off
# Fechar a tampa não faz nada (na tomada e na bateria):
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setactive SCHEME_CURRENT
```

### 1.4 Voltar sozinho depois de queda de luz

O Docker Desktop só sobe depois que alguém faz login no Windows. Para o sistema voltar sem ninguém por perto:

1. Na BIOS/UEFI do notebook, ative **Power On after AC loss / Restore on AC power** (o nome varia). Se não houver, a bateria do notebook já cobre quedas curtas.
2. Login automático: `netplwiz` → desmarque "Os usuários devem digitar um nome de usuário e senha" → informe a senha. *(Se a opção não aparecer: Configurações → Contas → Opções de entrada → desligue "Exigir entrada com Windows Hello" e tente de novo.)*
3. Bloqueie a tela após o login automático para ninguém usar o notebook aberto: `Win+L` sempre que sair — os containers continuam rodando com a tela bloqueada.

### 1.5 IP fixo

No roteador da empresa, crie uma **reserva DHCP** para o endereço MAC do notebook (é mais confiável que IP estático no Windows). Anote o IP — os exemplos abaixo usam `192.168.1.50`. Para descobrir o MAC e o IP atual:

```powershell
ipconfig /all | Select-String "Ethernet|Wi-Fi|Físico|IPv4"
```

Prefira **cabo de rede** a Wi-Fi para o servidor.

### 1.6 Liberar as portas no firewall do Windows

```powershell
netsh advfirewall firewall add rule name="FinanceBoard HTTP"  dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="FinanceBoard HTTPS" dir=in action=allow protocol=TCP localport=443
```

### 1.7 Windows Update sem surpresas

Configurações → Windows Update → Alterar horário ativo → defina o horário comercial. As reinicializações ficam fora do expediente e os containers voltam sozinhos (`restart: always`).

---

## Parte 2 — Subir o FinanceBoard

### 2.1 Código e configuração

```powershell
cd C:\
git clone https://github.com/J0aoSoares/FinanceBoard.git financeboard
cd C:\financeboard
Copy-Item .env.production.example .env.production
notepad .env.production
```

Preencha no `.env.production`:

| Variável | O que colocar |
|---|---|
| `POSTGRES_PASSWORD` | senha longa qualquer (o banco não é exposto, mas não deixe a padrão) |
| `SITE_ADDRESS` | `financeboard.local` (ou outro nome — precisa ser o mesmo nos PCs) |
| `JWT_SECRET` | saída de `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` — ou qualquer texto aleatório com 32+ caracteres |
| `SEED_ADMIN_NAME / EMAIL / PASSWORD` | o primeiro usuário ADMIN; senha com 10+ caracteres, letra e número |
| `SEED_SAMPLE_DATA` | **`false`** — `true` enche o banco com empresas e contas fictícias |

### 2.2 Subir

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

A primeira vez baixa imagens e compila — 5 a 10 minutos. Acompanhe:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f migrate api
```

Estado esperado ao final: `migrate` com **Exited (0)**, `postgres`, `api`, `web` e `backup` com **Up** (api e postgres marcados *healthy*).

Teste no próprio notebook: abra `https://localhost` — o navegador vai reclamar do certificado (normal, ainda não instalamos a CA) e deve mostrar a tela de login.

> Para não digitar o comando longo toda vez, o repositório traz `deploy\fb.ps1`, que encapsula o `docker compose --env-file ... -f ...`. Daqui em diante os exemplos usam `.\deploy\fb.ps1 <comando>` — sempre a partir de `C:\financeboard`. Se o PowerShell bloquear scripts, rode uma vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

---

## Parte 3 — Configurar os PCs (uma vez em cada)

### 3.1 Exportar o certificado raiz (no notebook)

```powershell
cd C:\financeboard
docker compose --env-file .env.production -f docker-compose.prod.yml cp web:/data/caddy/pki/authorities/local/root.crt .\deploy\root.crt
```

Copie `deploy\root.crt` para os PCs (pendrive, rede, e-mail — não é secreto: é só a chave **pública** da CA).

### 3.2 Em cada PC (PowerShell como Administrador)

```powershell
# 1. Confiar na CA interna do servidor (cadeado verde)
certutil -addstore -f Root C:\caminho\para\root.crt

# 2. Fazer o nome apontar para o notebook (troque o IP pelo da reserva DHCP)
Add-Content C:\Windows\System32\drivers\etc\hosts "`n192.168.1.50 financeboard.local"
```

Feche e abra o navegador. Acesse **https://financeboard.local** e faça login com o ADMIN do `.env.production`.

Chrome/Edge usam o repositório de certificados do Windows e já confiam. **Firefox** tem repositório próprio: em `about:config` ative `security.enterprise_roots.enabled` = true.

---

## Operação do dia a dia

Todos no notebook, em `C:\financeboard`. Para encurtar, o arquivo `deploy/fb.ps1` encapsula o compose; use `.\deploy\fb.ps1 <comando>` no lugar de `docker compose --env-file ... -f ...`.

| Tarefa | Comando |
|---|---|
| Ver estado | `.\deploy\fb.ps1 ps` |
| Logs da API | `.\deploy\fb.ps1 logs -f api` |
| **Atualizar** para a versão nova | `git pull` e depois `.\deploy\fb.ps1 up -d --build` |
| Reiniciar tudo | `.\deploy\fb.ps1 restart` |
| Parar | `.\deploy\fb.ps1 down` (dados ficam no volume) |
| Backup manual agora | `.\deploy\fb.ps1 exec backup sh -c 'pg_dump --no-owner \| gzip > /backups/manual-$(date +%Y%m%d-%H%M).sql.gz'` |
| Trocar a senha do ADMIN | edite `SEED_ADMIN_PASSWORD` e rode `.\deploy\fb.ps1 up -d migrate` — ou use a tela de Usuários |

### Backups

Ficam em `C:\financeboard\backups\financeboard-AAAAMMDD-HHMM.sql.gz`, um por dia, 30 dias. **Copie essa pasta para fora do notebook periodicamente** (OneDrive/Google Drive sincronizando a pasta resolve). O backup protege contra erro humano e disco ruim; não protege contra o notebook ser roubado junto com a pasta.

**Restaurar** (substitui o banco atual pelo do arquivo — tenha certeza). Copia o arquivo para dentro do container e restaura lá, sem depender de pipe binário do PowerShell:

```powershell
.\deploy\fb.ps1 stop api backup
.\deploy\fb.ps1 cp .\backups\financeboard-20260918-0300.sql.gz postgres:/tmp/restore.sql.gz
.\deploy\fb.ps1 exec postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && gunzip -c /tmp/restore.sql.gz | psql -U $POSTGRES_USER -d $POSTGRES_DB --set ON_ERROR_STOP=1 && rm /tmp/restore.sql.gz'
.\deploy\fb.ps1 start api backup
```

### O que acontece se…

- **Cair a luz**: bateria do notebook segura; se acabar, ao voltar a energia o notebook liga (BIOS), faz login sozinho, o Docker Desktop sobe e os containers voltam. Nada a fazer.
- **O Windows atualizar e reiniciar**: mesma coisa.
- **Trocar o IP do notebook**: os PCs param de achar `financeboard.local`. Corrija a reserva DHCP ou edite o `hosts` nos PCs.
- **Mudar o nome em `SITE_ADDRESS`**: o Caddy emite certificado novo automaticamente; a CA é a mesma, os PCs não precisam reinstalar nada — só o `hosts`.

---

## Futuro: acesso de fora da empresa (Tailscale)

Quando precisar acessar de casa/celular, sem abrir porta no roteador:

1. Instale o [Tailscale](https://tailscale.com/download) no notebook-servidor e em cada dispositivo remoto, logando na mesma conta.
2. No notebook, anote o IP Tailscale (`tailscale ip -4`, algo como `100.x.y.z`).
3. Num PC remoto, aponte `financeboard.local` para esse IP no arquivo `hosts` (igual à Parte 3.2, só muda o IP) e instale o `root.crt`. Pronto — o mesmo endereço funciona dentro e fora da empresa.
4. Para celular (onde não há arquivo `hosts`), o caminho é usar o nome MagicDNS do Tailscale (`notebook.tailXXXX.ts.net`) como segundo endereço do site. Isso pede uma linha a mais no `frontend/Caddyfile` — me chame quando chegar a hora.

Nada muda no compose; o Caddy continua respondendo nas mesmas portas, só que agora também pela interface do Tailscale.

---

## Rede com inspeção de TLS (antivírus / firewall corporativo)

Sintoma: o `up -d --build` falha no passo `npm ci` com `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `unable to verify the first certificate`. Algum equipamento ou antivírus na rede está substituindo os certificados dos sites; o Windows confia nele, mas o container que faz o build não.

Solução: exporte esse certificado raiz do Windows e coloque em `deploy\ca-certs\` — o build passa a confiar nele automaticamente.

```powershell
# 1. Descubra o nome do emissor "estranho" que assina os sites para você
#    (o normal seria DigiCert, Let's Encrypt, Google Trust Services...):
echo | openssl s_client -connect registry.npmjs.org:443 -servername registry.npmjs.org 2>$null | Select-String "i:"
#    Se não tiver openssl: abra https://registry.npmjs.org no Chrome → cadeado → "Certificado" → aba "Caminho de certificação" → o nome do topo.

# 2. Exporte-o do repositório de raízes confiáveis (troque "NOME" por parte do nome que apareceu):
$c = Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root | Where-Object { $_.Subject -like "*NOME*" } | Select-Object -First 1
$pem = "-----BEGIN CERTIFICATE-----`n" + [Convert]::ToBase64String($c.RawData, "InsertLineBreaks") + "`n-----END CERTIFICATE-----"
Set-Content -Path C:\financeboard\deploy\ca-certs\rede-empresa.crt -Value $pem -Encoding ascii

# 3. Refaça o build
.\deploy\fb.ps1 up -d --build
```

A pasta pode ter vários `.crt`. Ela **não** é enviada para os PCs nem afeta o HTTPS do FinanceBoard — só ensina o build a falar com a internet por trás dessa inspeção.

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `migrate` termina com erro `SEED_ADMIN_PASSWORD deve ter…` | senha do admin fraca no `.env.production` | 10+ caracteres com letra e número; `up -d` de novo |
| `api` reinicia em loop, log diz `Configuração de ambiente inválida` | `JWT_SECRET` vazio ou curto | preencha com 32+ caracteres; `up -d` |
| Navegador do PC: "não foi possível conectar" | firewall, IP errado no `hosts`, ou Docker parado no notebook | `Test-NetConnection 192.168.1.50 -Port 443` no PC; no notebook `.\deploy\fb.ps1 ps` |
| Cadeado com aviso mesmo após instalar o `root.crt` | navegador aberto durante a instalação, ou Firefox | feche e reabra; Firefox ver Parte 3.2 |
| Login dá `Erro inesperado na API` | `web` não alcança `api` | `.\deploy\fb.ps1 logs api`; verifique se `api` está *healthy* |
| Notebook lento | Docker sem limite de memória | Parte 1.2 (`.wslconfig`) |
| Build falha em `npm ci` com `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | rede inspeciona TLS | seção "Rede com inspeção de TLS" acima |
