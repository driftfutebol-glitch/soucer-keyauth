$ErrorActionPreference = "Stop"

$ruleName = "KeyAuth HTTP Inbound 80"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($null -eq $existing) {
    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort 80 | Out-Null
    Write-Output "Regra criada: $ruleName"
} else {
    Write-Output "Regra ja existe: $ruleName"
}

Write-Output "Firewall HTTP pronto."
