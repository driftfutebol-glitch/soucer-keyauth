param(
    [string]$DbHost = "localhost",
    [string]$DbUser = "root",
    [string]$DbPass = "",
    [string]$DbName = "main",
    [string]$RedisPass = ""
)

$root = Split-Path -Parent $PSScriptRoot
$examplePath = Join-Path $root "includes\\credentials.example.php"
$targetPath = Join-Path $root "includes\\credentials.php"

if (-not (Test-Path $examplePath)) {
    Write-Error "Arquivo base nao encontrado: $examplePath"
    exit 1
}

$content = Get-Content $examplePath -Raw
$content = $content -replace '\$databaseHost = ".*?";', ('$databaseHost = "{0}";' -f $DbHost)
$content = $content -replace '\$databaseUsername = ".*?";', ('$databaseUsername = "{0}";' -f $DbUser)
$content = $content -replace '\$databasePassword = ".*?";', ('$databasePassword = "{0}";' -f $DbPass)
$content = $content -replace '\$databaseName = ".*?";', ('$databaseName = "{0}";' -f $DbName)
$content = $content -replace '\$redisPass = ".*?";', ('$redisPass = "{0}";' -f $RedisPass)

Set-Content -Path $targetPath -Value $content -Encoding UTF8
Write-Output "Credenciais criadas em: $targetPath"
