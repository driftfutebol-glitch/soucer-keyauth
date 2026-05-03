# Deploy em Rede (Outro PC) - KeyAuth Source + Painel C#

Este guia conecta:
- site/painel web (`keyauth-source`)
- app desktop C# (`KeyAuthDesktopPanel.exe`)

Resultado: chave gerada no `.exe` funciona no site e na API do KeyAuth.

## 1) Requisitos no PC servidor

No PC que vai hospedar:
- Apache + PHP + MySQL (XAMPP/Laragon/WAMP)
- Redis Server
- Extensao PHP Redis habilitada

Observacao: essa source exige Redis para cache/rate-limit.

## 2) Publicar a source no servidor web

Copie a pasta para o webroot.

Exemplo XAMPP:
- `C:\xampp\htdocs\keyauth-source`

## 3) Configurar credenciais

1. Renomeie:
- `includes/credentials.example.php` -> `includes/credentials.php`

2. Ajuste:
- `$databaseHost`
- `$databaseUsername`
- `$databasePassword`
- `$databaseName`
- `$redisPass` (se houver senha no Redis)

## 4) Criar banco

1. Crie banco MySQL (ex: `main`)
2. Importe:
- `db_structure.sql`

## 5) Subir servicos

No servidor:
- Apache: ON
- MySQL: ON
- Redis: ON

## 6) Liberar acesso de outro PC

Execute PowerShell como admin no PC servidor:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\open-firewall-http.ps1
```

Depois pegue o IP LAN e endpoints:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\show-endpoints.ps1 -BasePath keyauth-source
```

## 7) Endpoints para o .exe (no outro PC)

No `KeyAuthDesktopPanel.exe`, preencher:
- `API KeyAuth`: `http://IP_DO_SERVIDOR/keyauth-source/api/1.2/`
- `Bridge URL`: `http://IP_DO_SERVIDOR/keyauth-source/api/desktop/`
- `OwnerID`: do seu app
- `SellerKey`: do seu app

## 8) Seguranca da bridge desktop

Arquivo novo:
- `api/desktop/index.php`

Protecoes aplicadas:
- valida `ownerid`, `name`, `sellerkey`
- rate-limit por IP
- whitelist opcional por app (`sellerApiWhitelist`)

Se quiser restringir apenas seu PC cliente:
- no app settings da KeyAuth, campo `sellerApiWhitelist`: IP(s) separados por virgula

Exemplo:
- `192.168.1.50,192.168.1.51`

## 9) Teste rapido

1. Gerar no `.exe` via botao `Gerar no KeyAuth`
2. Ir no site `Licenses` e confirmar que a key apareceu
3. Testar login/license no cliente usando API `1.2`

## 10) Producao (recomendado)

- Use dominio + HTTPS
- Coloque `api/desktop` atras de reverse proxy
- Limite por IP (whitelist)
- Troque `sellerkey` periodicamente

## 11) Subir para seu GitHub rapido

Na pasta `keyauth-source`, rode:

```powershell
.\tools\publish-github.ps1 -RepoUrl "https://github.com/SEU_USUARIO/SEU_REPO.git"
```
