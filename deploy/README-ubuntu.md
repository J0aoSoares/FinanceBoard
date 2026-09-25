# FinanceBoard em produção — notebook com Ubuntu Server

Guia para transformar o notebook antigo da empresa num servidor Ubuntu rodando 24/7, acessado pelos outros PCs pelo navegador com HTTPS. **Este é o caminho recomendado.** Se preferir manter o Windows no notebook, use [README.md](README.md).

```
[Notebook-servidor]  Ubuntu Server, IP fixo, ligado 24/7, tampa fechada
  Docker (serviço do sistema — sobe sem ninguém fazer login)
   ├─ postgres   banco (só visível dentro do Docker)
   ├─ api        NestJS
   ├─ web        Caddy: site + /api → api + HTTPS      ← portas 80 e 443
   └─ backup     pg_dump diário em ~/financeboard/backups (30 dias)

[PC 1] ─┐
        ├─ navegador → https://financeboard.local
[PC 2] ─┘           + SSH para administrar o servidor de longe
```

## Por que Ubuntu neste caso

| | Windows 10 + Docker Desktop | Ubuntu Server |
|---|---|---|
| Voltar após queda de luz | só depois de **alguém fazer login** — exige ligar login automático, o que deixa o notebook destravado | Docker é serviço do sistema: sobe sozinho, com a tela travada |
| RAM parada | ~2–3 GB (WSL 2 + Docker Desktop) | ~400 MB |
| Administrar de longe | precisa ir até o notebook | `ssh` do seu próprio PC |
| Reinícios forçados | Windows Update | você escolhe a janela |
| Antivírus quebrando o build | acontece (ver seção de TLS) | não se aplica |

O ganho decisivo é o primeiro: no Windows, para os containers voltarem sozinhos após uma queda de energia, é preciso desativar a tela de login — num equipamento que guarda dados financeiros. No Ubuntu esse problema não existe.

> ## ⚠️ Antes de qualquer coisa
>
> Instalar o Ubuntu **apaga o Windows e todos os arquivos do notebook**. Antes de começar:
> 1. Ligue o notebook e veja o que há nele (Documentos, Downloads, Área de Trabalho, e-mails do Outlook, fotos).
> 2. Copie o que interessa para um pendrive ou para um dos outros PCs.
> 3. Anote licenças de programas que estejam só nele.
>
> Não há como voltar atrás depois da Parte 1.

---

## O que você vai precisar

- Um pendrive de **4 GB ou mais** (será formatado).
- **Cabo de rede** ligando o notebook ao roteador. Wi-Fi funciona, mas cabo é mais estável para um servidor e evita configuração extra na instalação.
- Outro PC (com Windows) para baixar a imagem e gravar o pendrive.
- Acesso ao roteador da empresa (para a reserva de IP).

---

## Parte 1 — Instalar o Ubuntu Server

### 1.1 Baixar e gravar o pendrive (no seu PC)

1. Baixe **Ubuntu Server 26.04.1 LTS** em <https://ubuntu.com/download/server> (arquivo `.iso`, ~3 GB). É a versão com suporte até abril de 2031.
2. Baixe o [Rufus](https://rufus.ie) (ou [balenaEtcher](https://etcher.balena.io)).
3. No Rufus: selecione o pendrive, aponte o `.iso`, deixe o resto no padrão e clique em **INICIAR**.

> Se o notebook for muito antigo (anterior a ~2010), confirme que é 64 bits. Se for 32 bits, o Ubuntu Server atual não roda — me avise que ajustamos o plano.

### 1.2 Dar boot pelo pendrive

Com o notebook desligado, espete o pendrive e ligue apertando a tecla de boot — varia por fabricante: **F12** (Dell, Lenovo), **F9** (HP), **F2/Del** (entrar na BIOS e mudar a ordem de boot). Escolha o pendrive (aparece como "USB" ou o nome do fabricante dele).

Aproveite que está na BIOS e já ative, se existir, a opção **Restore on AC Power Loss** / **Power On After Power Failure** (às vezes em "Power Management"). É ela que faz o notebook religar sozinho quando a energia volta.

### 1.3 Seguir o instalador

Escolhas que importam (o resto é *Enter*):

| Tela | O que escolher |
|---|---|
| Language | English (os nomes das opções aqui seguem o inglês) |
| Keyboard | **Portuguese (Brazil)** — layout ABNT2 |
| Type of install | Ubuntu Server (não o *minimized*) |
| Network | deve pegar IP sozinho pelo cabo. Anote o IP que aparecer |
| Proxy / Mirror | deixe em branco / padrão |
| Storage | **Use an entire disk** → confirme em **Continue** na tela que avisa que os dados serão apagados |
| Profile | seu nome, um **nome de servidor** (ex.: `financeboard`), usuário e senha — **anote a senha** |
| Upgrade to Ubuntu Pro | Skip for now |
| SSH Setup | ✅ **Install OpenSSH server** — marque, é o que permite administrar de longe |
| Featured snaps | não marque nenhum |

Ao final, **Reboot Now** e **retire o pendrive** quando pedir.

### 1.4 Primeiro login

Na tela preta, digite o usuário e a senha (a senha não aparece enquanto você digita — é normal). Depois:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo timedatectl set-timezone America/Sao_Paulo
ip -4 addr show | grep inet        # anote o IP, ex.: 192.168.1.50
```

Daqui em diante você pode largar o notebook e continuar **do seu próprio PC**, pelo PowerShell:

```powershell
ssh seu-usuario@192.168.1.50
```

É mais confortável — dá para copiar e colar os comandos.

---

## Parte 2 — Preparar o notebook como servidor

### 2.1 Tampa fechada e sem dormir

```bash
sudo sed -i 's/^#*HandleLidSwitch=.*/HandleLidSwitch=ignore/;
             s/^#*HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/;
             s/^#*HandleLidSwitchDocked=.*/HandleLidSwitchDocked=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

Confira: `grep HandleLidSwitch /etc/systemd/logind.conf` deve mostrar as três linhas com `ignore`, sem `#`.

### 2.2 Instalar o Docker

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

> Se o `apt update` reclamar que não existe repositório para o codinome do Ubuntu (acontece quando a versão é muito nova), use os pacotes do próprio Ubuntu, que servem igual:
> ```bash
> sudo rm /etc/apt/sources.list.d/docker.list && sudo apt update
> sudo apt install -y docker.io docker-compose-v2 && sudo systemctl enable --now docker
> ```

### 2.3 Usar o Docker sem `sudo`

```bash
sudo usermod -aG docker $USER
```

**Saia e entre de novo** (`exit` e reconecte o SSH) para valer. Teste: `docker run --rm hello-world`.

### 2.4 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### 2.5 IP fixo

No roteador da empresa, crie uma **reserva DHCP** amarrando o endereço MAC do notebook ao IP que você anotou. É mais confiável do que fixar o IP no sistema. O MAC aparece em:

```bash
ip link show | grep -A1 "state UP" | grep ether
```

### 2.6 Atualizações de segurança automáticas

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades      # responda "Yes"
sudo tee /etc/apt/apt.conf.d/52financeboard-reboot > /dev/null <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
EOF
```

Correções de segurança entram sozinhas e, se alguma exigir reinício, ele acontece às 4h. Os containers voltam sozinhos.

---

## Parte 3 — Subir o FinanceBoard

```bash
sudo apt install -y git
git clone https://github.com/J0aoSoares/FinanceBoard.git ~/financeboard
cd ~/financeboard
cp .env.production.example .env.production
chmod +x deploy/fb.sh
nano .env.production
```

Preencha (no `nano`, salve com **Ctrl+O**, **Enter**, e saia com **Ctrl+X**):

| Variável | O que colocar |
|---|---|
| `POSTGRES_PASSWORD` | senha longa qualquer (o banco não é exposto, mas não deixe a padrão) |
| `SITE_ADDRESS` | `financeboard.local` (precisa ser o mesmo nos PCs) |
| `JWT_SECRET` | rode `openssl rand -base64 48` e cole a saída |
| `SEED_ADMIN_NAME / EMAIL / PASSWORD` | o primeiro usuário ADMIN; senha com 10+ caracteres, letra e número |
| `SEED_SAMPLE_DATA` | **`false`** — `true` enche o banco com empresas e contas fictícias |

Suba:

```bash
./deploy/fb.sh up -d --build
```

A primeira vez baixa imagens e compila — 5 a 15 minutos num notebook antigo. Acompanhe com `./deploy/fb.sh logs -f migrate api` (saia com Ctrl+C).

Confira o estado:

```bash
./deploy/fb.sh ps
```

Esperado: `migrate` **Exited (0)**; `postgres`, `api`, `web` e `backup` em **Up**, com `postgres` e `api` marcados *healthy*.

Teste ali mesmo no servidor:

```bash
curl -sk https://localhost/ | grep title                      # <title>FinanceBoard</title>
curl -sk -o /dev/null -w "%{http_code}\n" https://localhost/api/auth/me   # 401
```

401 é o esperado: significa que a API está de pé e exigindo login.

---

## Parte 4 — Configurar os PCs (uma vez em cada)

### 4.1 Exportar o certificado raiz

No servidor:

```bash
./deploy/fb.sh cp web:/data/caddy/pki/authorities/local/root.crt ~/financeboard/deploy/root.crt
```

No seu PC (PowerShell), traga o arquivo:

```powershell
scp seu-usuario@192.168.1.50:financeboard/deploy/root.crt $HOME\Desktop\root.crt
```

O `root.crt` não é secreto — é a chave **pública** da CA. Pode ir por pendrive ou rede para o outro PC.

### 4.2 Em cada PC (PowerShell como Administrador)

```powershell
# 1. Confiar na CA interna do servidor (cadeado verde)
certutil -addstore -f Root $HOME\Desktop\root.crt

# 2. Fazer o nome apontar para o notebook (troque pelo IP da reserva DHCP)
Add-Content C:\Windows\System32\drivers\etc\hosts "`n192.168.1.50 financeboard.local"
```

Feche e abra o navegador. Acesse **https://financeboard.local** e entre com o ADMIN do `.env.production`.

Chrome e Edge usam o repositório do Windows e já confiam. **Firefox** tem o dele: em `about:config`, ative `security.enterprise_roots.enabled`.

---

## Operação do dia a dia

Por SSH, do seu PC. Todos a partir de `~/financeboard`.

| Tarefa | Comando |
|---|---|
| Ver estado | `./deploy/fb.sh ps` |
| Logs da API | `./deploy/fb.sh logs -f api` |
| **Atualizar** para a versão nova | `git pull && ./deploy/fb.sh up -d --build` |
| Reiniciar tudo | `./deploy/fb.sh restart` |
| Parar | `./deploy/fb.sh down` (os dados ficam no volume) |
| Backup manual agora | `./deploy/fb.sh exec backup sh -c 'pg_dump --no-owner \| gzip > /backups/manual-$(date +%Y%m%d-%H%M).sql.gz'` |
| Espaço em disco | `df -h /` e `docker system df` |
| Desligar o servidor | `sudo poweroff` |

### Backups

Ficam em `~/financeboard/backups/financeboard-AAAAMMDD-HHMM.sql.gz`, um por dia, 30 dias. Quem os gera é o container, então pertencem ao root — mas saem legíveis para o seu usuário, dá para copiá-los sem `sudo`.

**Copie essa pasta para fora do notebook periodicamente** — o backup protege contra erro de digitação e disco ruim, não contra o notebook sumir. O jeito mais simples é puxar de um dos PCs, pelo PowerShell:

```powershell
scp -r seu-usuario@192.168.1.50:financeboard/backups $HOME\OneDrive\FinanceBoard-backups
```

Para automatizar de verdade, o [rclone](https://rclone.org) envia direto para Google Drive/OneDrive a partir do servidor — me chame quando quiser montar isso.

**Restaurar** (substitui o banco atual pelo do arquivo — tenha certeza):

```bash
cd ~/financeboard
./deploy/fb.sh stop api backup
./deploy/fb.sh cp ./backups/financeboard-20260922-0300.sql.gz postgres:/tmp/restore.sql.gz
./deploy/fb.sh exec postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && gunzip -c /tmp/restore.sql.gz | psql -U $POSTGRES_USER -d $POSTGRES_DB --set ON_ERROR_STOP=1 && rm /tmp/restore.sql.gz'
./deploy/fb.sh start api backup
```

### O que acontece se…

- **Cair a luz**: a bateria do notebook segura (é um no-break embutido). Se acabar, ao voltar a energia o notebook religa pela BIOS, o Docker sobe como serviço e os containers voltam — **sem ninguém fazer login**. O Postgres é resistente a desligamento abrupto; não corrompe por queda de energia.
- **O sistema atualizar e reiniciar às 4h**: mesma coisa, volta sozinho.
- **Mudar o IP do notebook**: os PCs param de achar `financeboard.local`. Corrija a reserva DHCP ou o arquivo `hosts` dos PCs.
- **Mudar o `SITE_ADDRESS`**: o Caddy emite certificado novo sozinho; a CA é a mesma, os PCs não reinstalam nada — só o `hosts`.
- **A tela do notebook apagar**: normal, é só o monitor. Mexa no teclado para acordar.

---

## Futuro: acesso de fora da empresa (Tailscale)

Quando precisar acessar de casa ou do celular, sem abrir porta no roteador:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale ip -4        # anote o 100.x.y.z
```

Instale o Tailscale também no dispositivo remoto, logando na mesma conta. Num PC remoto, aponte `financeboard.local` para esse `100.x.y.z` no arquivo `hosts` e instale o `root.crt` como na Parte 4 — o mesmo endereço passa a funcionar dentro e fora da empresa.

Para celular (onde não há arquivo `hosts`), o caminho é usar o nome MagicDNS do Tailscale como segundo endereço do site, o que pede uma linha a mais no `frontend/Caddyfile` — me chame quando chegar a hora.

---

## Se você já tinha subido no Windows e quer migrar os dados

No notebook com Windows, antes de formatar:

```powershell
cd C:\financeboard
.\deploy\fb.ps1 exec backup sh -c 'pg_dump --no-owner | gzip > /backups/migracao.sql.gz'
```

Guarde `C:\financeboard\backups\migracao.sql.gz` fora do notebook. Depois de montar o Ubuntu e subir a stack, copie o arquivo para `~/financeboard/backups/` e siga o procedimento de **Restaurar** acima.

---

## Rede com inspeção de TLS

Sintoma: o `up -d --build` falha no `npm ci` com `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Significa que algum equipamento da rede substitui os certificados dos sites. É raro no Ubuntu (não há antivírus fazendo isso), mas pode acontecer com firewall corporativo. A solução é colocar o certificado raiz desse equipamento em `deploy/ca-certs/` como `.crt` — os Dockerfiles já confiam nessa pasta automaticamente. Veja o passo a passo em [README.md](README.md#rede-com-inspeção-de-tls-antivírus--firewall-corporativo).

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `docker: permission denied` | usuário ainda não está no grupo | saia e entre de novo no SSH (Parte 2.3) |
| `migrate` termina com erro `SEED_ADMIN_PASSWORD deve ter…` | senha do admin fraca | 10+ caracteres com letra e número; `./deploy/fb.sh up -d` |
| `api` reiniciando, log diz `Configuração de ambiente inválida` | `JWT_SECRET` vazio ou curto | preencha com 32+ caracteres; `./deploy/fb.sh up -d` |
| Navegador do PC: "não foi possível conectar" | firewall, IP errado no `hosts`, ou notebook desligado | no PC: `Test-NetConnection 192.168.1.50 -Port 443`; no servidor: `./deploy/fb.sh ps` |
| Cadeado com aviso após instalar o `root.crt` | navegador estava aberto, ou é o Firefox | feche e reabra; Firefox ver Parte 4.2 |
| Notebook fecha a tampa e some da rede | passo 2.1 não aplicado | refaça e confira com `grep HandleLidSwitch /etc/systemd/logind.conf` |
| SSH não conecta | OpenSSH não foi marcado na instalação | no notebook: `sudo apt install -y openssh-server && sudo systemctl enable --now ssh` |
| Disco enchendo | imagens antigas do Docker acumuladas | `docker image prune -a` (não apaga volumes nem dados) |
