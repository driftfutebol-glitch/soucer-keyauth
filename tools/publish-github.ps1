param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,

  [string]$Branch = "main",
  [string]$CommitMessage = "chore: custom keyauth source setup"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
  $existingOrigin = ""
  try {
    $existingOrigin = (git remote get-url origin 2>$null).Trim()
  } catch {
    $existingOrigin = ""
  }

  $officialRepo = "https://github.com/KeyAuth/KeyAuth-Source-Code.git"
  if ($existingOrigin -eq $officialRepo -and $RepoUrl -ne $officialRepo) {
    git remote rename origin upstream
    git remote add origin $RepoUrl
  } elseif ($existingOrigin) {
    git remote set-url origin $RepoUrl
  } else {
    git remote add origin $RepoUrl
  }

  git add -A
  $hasChanges = (git status --porcelain)
  if ($hasChanges) {
    git commit -m $CommitMessage | Out-Null
  } else {
    Write-Host "Nenhuma alteracao pendente para commit."
  }

  git branch -M $Branch
  git push -u origin $Branch

  Write-Host ""
  Write-Host "Push concluido com sucesso."
  Write-Host "Repositorio: $RepoUrl"
  Write-Host "Branch: $Branch"
  Write-Host ""
} finally {
  Pop-Location
}
