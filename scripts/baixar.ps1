# Traz a versão mais recente do SaaS da psicóloga do GitHub (Windows 11).
#
# Uso (na pasta do projeto):
#   .\scripts\baixar.ps1
#   .\scripts\baixar.ps1 -Simular
param(
    [string]$Projeto = "",
    [switch]$Simular
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Projeto)) {
    $Projeto = Split-Path -Parent $PSScriptRoot
}
if (-not (Test-Path (Join-Path $Projeto '.git'))) {
    throw "Pasta do projeto não encontrada: $Projeto"
}

function Get-GitTexto {
    param([string[]]$Argumentos)
    $saida = & git @Argumentos 2>$null
    $codigo = $LASTEXITCODE
    if ($codigo -ne 0) {
        throw "git $($Argumentos -join ' ') falhou (codigo $codigo)"
    }
    return (@($saida) -join "`n").Trim()
}

Set-Location $Projeto

$ramoAtual = Get-GitTexto @('symbolic-ref', '--short', 'HEAD')
if ($ramoAtual -ne 'main') {
    throw "Voce esta no ramo '$ramoAtual'. Esperei 'main'."
}

$alteracoes = Get-GitTexto @('status', '--porcelain')
if ($alteracoes) {
    Write-Host 'ERRO: ha alteracoes locais nao salvas. Envie-as antes de baixar:' -ForegroundColor Red
    Write-Host (Get-GitTexto @('status', '--short'))
    Write-Host 'Dica: .\scripts\publicar.ps1 (ele sugere a mensagem e a versao)'
    exit 1
}

Write-Host '=== baixando a ultima versao de origin/main (pull --rebase) ==='
if ($Simular) {
    Write-Host 'SIMULAR: git pull --rebase origin main'
} else {
    & git pull --rebase origin 'main'
    if ($LASTEXITCODE -ne 0) {
        & git rebase --abort 2>$null
        throw 'Falha no rebase. Para desfazer: git rebase --abort'
    }
}

Write-Host 'OK: sincronizado com main.'
