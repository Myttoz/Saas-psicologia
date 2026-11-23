# Sobe as alterações do SaaS da psicóloga para o GitHub (Windows 11 / PowerShell).
#
# Uso (na pasta do projeto):
#   .\scripts\publicar.ps1 "mensagem do commit"
#   .\scripts\publicar.ps1 "mensagem do commit" v1.1.0
#   .\scripts\publicar.ps1 "mensagem do commit" v1.1.0 -Simular
#
# Se o Windows bloquear o script, rode uma vez:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
param(
    [string]$Mensagem = "",
    [string]$Versao = "",
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

function Invoke-Git {
    param([string[]]$Argumentos)
    if ($Simular) {
        Write-Host "SIMULAR: git $($Argumentos -join ' ')"
        return
    }
    & git @Argumentos
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Argumentos -join ' ') falhou (codigo $LASTEXITCODE)"
    }
}

Set-Location $Projeto

$ramoAtual = Get-GitTexto @('symbolic-ref', '--short', 'HEAD')
if ($ramoAtual -ne 'main') {
    throw "Voce esta no ramo '$ramoAtual'. Esperei 'main'."
}

if ([string]::IsNullOrWhiteSpace($Mensagem)) {
    $Mensagem = "Atualiza $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

if ($Versao) {
    if ($Versao -notmatch '^v\d+\.\d+\.\d+$') {
        throw "Versao invalida '$Versao'. Use o formato v1.1.0."
    }
    if (-not (Test-Path (Join-Path $Projeto "RELEASE_NOTES_$Versao.md"))) {
        throw "Falta RELEASE_NOTES_$Versao.md (copie .github/RELEASE_TEMPLATE.md)."
    }
    if (-not $Simular) {
        & git ls-remote --exit-code --tags origin "refs/tags/$Versao" >$null 2>&1
        if ($LASTEXITCODE -eq 0) {
            throw "A tag $Versao ja existe no GitHub. Use outra versao (nunca reaproveite)."
        }
    }
}

Write-Host '=== 1/5: estado local ==='
Write-Host (Get-GitTexto @('status', '--short'))
$alteracoes = Get-GitTexto @('status', '--porcelain')

Write-Host ''
Write-Host '=== 2/5: commit ==='
Invoke-Git @('add', '-A')
if ($alteracoes) {
    Invoke-Git @('commit', '-m', $Mensagem)
} else {
    Write-Host '(nada para commitar)'
}

Write-Host ''
Write-Host '=== 3/5: trazer alteracoes do GitHub (rebase) ==='
if ($Simular) {
    Write-Host 'SIMULAR: git pull --rebase origin main'
} else {
    & git pull --rebase origin 'main'
    if ($LASTEXITCODE -ne 0) {
        & git rebase --abort 2>$null
        throw 'Falha no rebase. Seu trabalho continua salvo localmente (tentei: git rebase --abort).'
    }
}

Write-Host ''
Write-Host '=== 4/5: enviar para origin/main (publica o site) ==='
Invoke-Git @('push', 'origin', 'main')

if ($Versao) {
    Write-Host ''
    Write-Host "=== 5/5: criar e enviar a tag $Versao (publica a release) ==="
    if ($Simular) {
        Write-Host "SIMULAR: git tag -a $Versao -m $Versao"
    } else {
        & git rev-parse -q --verify "refs/tags/$Versao" >$null 2>&1
        if ($LASTEXITCODE -ne 0) {
            Invoke-Git @('tag', '-a', $Versao, '-m', $Versao)
        } else {
            Write-Host "A tag $Versao ja existe localmente - vou apenas envia-la."
        }
    }
    Invoke-Git @('push', 'origin', $Versao)
    Write-Host "Release $Versao disparada. O feed releases.rss sera atualizado sozinho."
}

Write-Host ''
Write-Host 'OK: concluido.'
