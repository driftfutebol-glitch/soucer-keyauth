param(
    [string]$BasePath = "keyauth-source"
)

$ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -ne "WellKnown"
    } |
    Select-Object -ExpandProperty IPAddress

if (-not $ips) {
    Write-Output "Nenhum IP LAN encontrado."
    exit 1
}

foreach ($ip in $ips) {
    Write-Output "----------------------------------------"
    Write-Output "IP: $ip"
    Write-Output "Site:        http://$ip/$BasePath/"
    Write-Output "API 1.2:     http://$ip/$BasePath/api/1.2/"
    Write-Output "Bridge desk: http://$ip/$BasePath/api/desktop/"
}
