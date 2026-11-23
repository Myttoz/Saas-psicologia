# Sobe as alterações do SaaS da psicóloga para o GitHub (Windows 11 / PowerShell).
#
# Padrão adotado (iguais ao atalho subirpsi, do Linux):
#   feat:     nova função          -> v1.4.0  (2º número sobe)
#   fix:      correção             -> v1.3.1  (3º número sobe)
#   security: segurança            -> v1.3.1
#   docs:     manual/textos        -> v1.3.1
#   style:    aparência            -> v1.3.1
#   refactor: reorganizar código   -> v1.3.1
#   test:     testes               -> v1.3.1
#   chore:    automação/config     -> v1.3.1
#   feat!:    muda o jeito de usar -> v2.0.0  (1º número sobe)
#
# Uso (na pasta do projeto):
#   .\scripts\publicar.ps1                          -> sugere mensagem e versão
#   .\scripts\publicar.ps1 "corrige o filtro"       -> sugere o prefixo e a versão
#   .\scripts\publicar.ps1 "feat: agenda nova"      -> sugere só a versão
#   .\scripts\publicar.ps1 "fix: texto" v1.3.1 -Simular
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

$tiposPermitidos = @('feat', 'fix', 'security', 'docs', 'style', 'refactor', 'test', 'chore')

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

function Get-ArquivosMudados {
    $linhas = Get-GitTexto @('status', '--porcelain', '-uall')
    if ([string]::IsNullOrWhiteSpace($linhas)) {
        return @()
    }
    return @($linhas -split "`n" | Where-Object { $_.Trim() } | ForEach-Object {
        $caminho = $_.Substring(3)
        if ($caminho -match ' -> ') {
            $caminho = ($caminho -split ' -> ')[-1]
        }
        $caminho
    })
}

function Test-CodigoNovo {
    $linhas = Get-GitTexto @('status', '--porcelain', '-uall')
    if ([string]::IsNullOrWhiteSpace($linhas)) {
        return $false
    }
    return [bool](@($linhas -split "`n" | Where-Object { $_ -match '^\?\? .*\.js$' }).Count)
}

function Test-CodigoDoSite {
    $arquivos = @(Get-ArquivosMudados)
    if ($arquivos.Count -eq 0) {
        return $false
    }
    return [bool](@($arquivos | Where-Object {
        $_ -match '^(js/|css/|assets/|index\.html$|\.github/workflows/|_headers$|sw\.js$)'
    }).Count)
}

function Get-MensagemSugerida {
    $arquivos = @(Get-ArquivosMudados)
    if ($arquivos.Count -eq 0) {
        return 'chore: atualiza projeto'
    }
    if (@($arquivos | Where-Object {
        $_ -match '^(js/(backend|seguranca|cripto)\.js|supabase/schema\.sql|_headers|sw\.js)$'
    }).Count -gt 0) {
        return 'security: reforça proteção de dados'
    }
    if (Test-CodigoNovo) {
        return 'feat: adiciona nova função'
    }
    if (-not (Test-CodigoDoSite) -and @($arquivos | Where-Object { $_ -match '\.md$' }).Count -gt 0) {
        return 'docs: atualiza manual e padrão de versões'
    }
    if (@($arquivos | Where-Object { $_ -match '^(css/|assets/)' }).Count -gt 0) {
        return 'style: ajusta aparência'
    }
    if (@($arquivos | Where-Object { $_ -match '^(\.github/workflows/|scripts/)' }).Count -gt 0) {
        return 'chore: ajusta publicação e automação'
    }
    if (@($arquivos | Where-Object { $_ -match '^js/' }).Count -gt 0) {
        return 'fix: corrige comportamento do site'
    }
    if (@($arquivos | Where-Object { $_ -match '^index\.html$' }).Count -gt 0) {
        return 'feat: ajusta interface do site'
    }
    return 'chore: atualiza projeto'
}

function Get-TipoPelaDescricao {
    param([string]$Texto)
    if ($Texto -match '^(corrige|conserta|resolve|ajusta o erro|remove (o )?bugs?)') { return 'fix' }
    if ($Texto -match '^(adiciona|cria|novo|nova|implementa|introduz)') { return 'feat' }
    if ($Texto -match '(senha|acesso|segurança|proteção|mfa|rls|criptograf)') { return 'security' }
    if ($Texto -match '(manual|readme|notas|documenta|texto)') { return 'docs' }
    if ($Texto -match '(cor|layout|visual|estilo|interface|botão|tela)') { return 'style' }
    if ($Texto -match 'testes?') { return 'test' }
    if ($Texto -match '(automação|workflow|script|deploy|feed|release|versão|tag|atalho)') { return 'chore' }
    return (Get-MensagemSugerida).Split(':')[0]
}

function Get-TipoDaMensagem {
    param([string]$Texto)
    $tipo = ''
    if ($Texto -match '^([a-z]+)(\([^)]*\))?!?:') {
        $tipo = $Matches[1]
    }
    return $tipo
}

function Test-EhBreaking {
    param([string]$Texto)
    return [bool]($Texto -match '^[a-z]+(\([^)]*\))?!:')
}

function Get-ProximaVersao {
    param([string]$Texto)
    $tags = Get-GitTexto @('tag', '--list', 'v[0-9]*.[0-9]*.[0-9]*', '--sort=-v:refname')
    $ultima = if ([string]::IsNullOrWhiteSpace($tags)) { 'v0.0.0' } else { ($tags -split "`n")[0].Trim() }
    $numeros = ($ultima -replace '^v', '').Split('.')
    [int]$maior = $numeros[0]
    [int]$menor = $numeros[1]
    [int]$patch = $numeros[2]

    if (Test-EhBreaking $Texto) {
        $maior += 1; $menor = 0; $patch = 0
    } elseif ((Get-TipoDaMensagem $Texto) -eq 'feat') {
        $menor += 1; $patch = 0
    } else {
        $patch += 1
    }
    return ('v{0}.{1}.{2}' -f $maior, $menor, $patch)
}

Set-Location $Projeto

$ramoAtual = Get-GitTexto @('symbolic-ref', '--short', 'HEAD')
if ($ramoAtual -ne 'main') {
    throw "Voce esta no ramo '$ramoAtual'. Esperei 'main'."
}

Invoke-Git @('fetch', '--tags', '--force')

if ([string]::IsNullOrWhiteSpace($Mensagem)) {
    $Mensagem = Get-MensagemSugerida
    Write-Host "Descrição sugerida: $Mensagem"
}

$tipo = Get-TipoDaMensagem $Mensagem
if ([string]::IsNullOrWhiteSpace($tipo)) {
    $tipo = Get-TipoPelaDescricao $Mensagem
    $Mensagem = '{0}: {1}' -f $tipo, $Mensagem
    Write-Host "Prefixo sugerido adicionado: $tipo"
} elseif ($tiposPermitidos -notcontains $tipo) {
    throw "Tipo '$tipo' não reconhecido. Use: $($tiposPermitidos -join ', ')."
}

if ([string]::IsNullOrWhiteSpace($Versao)) {
    $Versao = Get-ProximaVersao $Mensagem
    Write-Host "Versão sugerida: $Versao"
}

if ($Versao -notmatch '^v\d+\.\d+\.\d+$') {
    throw "Versao invalida '$Versao'. Use o formato v1.3.0."
}
if (-not $Simular) {
    & git ls-remote --exit-code --tags origin "refs/tags/$Versao" >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        throw "A tag $Versao ja existe no GitHub. Use outra versao (nunca reaproveite)."
    }
}

$nota = "RELEASE_NOTES_$Versao.md"
$modelo = '.github/RELEASE_TEMPLATE.md'
if (-not (Test-Path $nota)) {
    if (-not (Test-Path $modelo)) {
        throw "Falta $modelo para criar $nota."
    }
    if ($Simular) {
        Write-Host "SIMULAR: copia $modelo -> $nota (e troca vX.Y.Z / DD/MM/AAAA)"
    } else {
        Copy-Item $modelo $nota
        $conteudo = Get-Content $nota -Raw -Encoding UTF8
        $conteudo = $conteudo -replace 'vX\.Y\.Z', $Versao
        $conteudo = $conteudo -replace 'DD/MM/AAAA', (Get-Date -Format 'dd/MM/yyyy')
        Set-Content -Path $nota -Value $conteudo -Encoding UTF8 -NoNewline
    }
    Write-Host "Nota de release criada: $nota (preencha com as novidades antes de publicar)."
}

Write-Host ''
Write-Host '=== Publicação ==='
Write-Host "Descrição: $Mensagem"
Write-Host "Versão:    $Versao"
Write-Host "Notas:     $nota"

Write-Host ''
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
Write-Host '=== 3/5: trazer alterações do GitHub (rebase) ==='
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

Write-Host ''
Write-Host "=== 5/5: criar e enviar a tag $Versao (publica a release) ==="
if (-not $Simular) {
    & git rev-parse -q --verify "refs/tags/$Versao" >$null 2>&1
}
if ($Simular -or $LASTEXITCODE -ne 0) {
    Invoke-Git @('tag', '-a', $Versao, '-m', $Versao)
} else {
    Write-Host "A tag $Versao ja existe localmente - vou apenas envia-la."
}
Invoke-Git @('push', 'origin', $Versao)
Write-Host "Release $Versao disparada. O feed releases.rss sera atualizado sozinho."

Write-Host ''
Write-Host 'OK: concluido.'
