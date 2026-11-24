/* Teste: padrão de commits/tags e sugestão automática nos atalhos */
const fs = require('fs');
const cp = require('child_process');
const raiz = require('path').resolve(__dirname, '..') + '/';
const linux = fs.readFileSync(raiz + 'scripts/subirpsi', 'utf8');
const win = fs.readFileSync(raiz + 'scripts/publicar.ps1', 'utf8');
const baixar = fs.readFileSync(raiz + 'scripts/baixarpsi', 'utf8');
const winBaixar = fs.readFileSync(raiz + 'scripts/baixar.ps1', 'utf8');
const readme = fs.readFileSync(raiz + 'README.md', 'utf8');
const manual = fs.readFileSync(raiz + 'MANUAL.md', 'utf8');
const supabase = fs.readFileSync(raiz + 'supabase/COMO_CONFIGURAR.md', 'utf8');

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
function rodar(args) {
  return cp.spawnSync(raiz + 'scripts/subirpsi', args, {
    cwd: raiz, encoding: 'utf8'
  });
}

// ---------- Linux ----------
check('atalho Linux aceita os 8 tipos',
  /TIPOS="feat\|fix\|security\|docs\|style\|refactor\|test\|chore"/.test(linux));
check('Linux sugere tipo pela descrição', /sugerir_tipo_pela_descricao\(\)/.test(linux));
check('Linux sobe 2º número para feat', /= "feat" \]; then[\s\S]{0,80}menor=\$\(\(menor \+ 1\)\)/.test(linux));
check('Linux sobe 1º número para breaking', /e_breaking[\s\S]{0,160}maior=\$\(\(maior \+ 1\)\); menor=0; patch=0/.test(linux));
check('Linux cria notas a partir do modelo', /cp \.github\/RELEASE_TEMPLATE\.md "\$NOTA"/.test(linux));
check('Linux recusa tag repetida', /git ls-remote --exit-code --tags origin/.test(linux));
check('Linux mostra o estado antes de publicar', /=== 1\/5: estado local ===/.test(linux));
check('baixarpsi agora só recomenda o nome do atalho', /Dica: subirpsi \(ele sugere/.test(baixar));

// O GitHub roda os testes com outro usuário e outra pasta. O atalho precisa
// encontrar o projeto por ele mesmo, não pelo endereço da casa da psicóloga.
const os = require('os');
const homeTemporaria = fs.mkdtempSync(require('path').join(os.tmpdir(), 'psi-home-'));
const rPortatil = cp.spawnSync(raiz + 'scripts/subirpsi', ['docs: texto', 'v9.9.9', '--dry-run'], {
  cwd: os.tmpdir(), encoding: 'utf8',
  env: Object.assign({}, process.env, { HOME: homeTemporaria })
});
check('atalho funciona em outra máquina/pasta',
  rPortatil.status === 0 && /Descrição: docs: texto/.test(rPortatil.stdout),
  String(rPortatil.stderr || '').trim().split('\n')[0]);

const ultima = cp.execSync('git tag --list "v[0-9]*.[0-9]*.[0-9]*" --sort=-v:refname',
  { cwd: raiz, encoding: 'utf8' }).trim().split('\n')[0].slice(1).split('.').map(Number);
const proxPatch = 'v' + ultima[0] + '.' + ultima[1] + '.' + (ultima[2] + 1);
const proxMinor = 'v' + ultima[0] + '.' + (ultima[1] + 1) + '.0';
const rx = s => new RegExp(s.replace(/\./g, '\\.'));

function estadoDasNotas() {
  return fs.readdirSync(raiz).filter(n => /^RELEASE_NOTES_.*\.md$/.test(n))
    .map(n => n + ':' + fs.readFileSync(raiz + n, 'utf8')).join('\n');
}
let r = rodar(['--dry-run']);
check('sem argumentos: sugere descrição válida',
  /Descrição sugerida: (feat|fix|security|docs|style|refactor|test|chore): /.test(r.stdout), (r.stdout || '').split('\n')[1]);
const descricaoSugerida = (String(r.stdout).match(/Descrição sugerida: ([^\n]+)/) || [])[1] || '';
const versaoSugerida = /^feat:/.test(descricaoSugerida) ? proxMinor : proxPatch;
check('sem argumentos: sugere ' + versaoSugerida, rx('Versão sugerida: ' + versaoSugerida).test(r.stdout));
// A versão sugerida pode já estar publicada (o GitHub roda isto depois da tag),
// então a checagem de não alterar arquivos usa uma versão que nunca existiu.
const notasAntes = estadoDasNotas();
const rSimulada = rodar(['docs: texto', 'v9.9.9', '--dry-run']);
check('modo simulação não altera as notas',
  rSimulada.status === 0 && estadoDasNotas() === notasAntes);

r = rodar(['corrige o filtro', '--dry-run']);
check('sem prefixo "corrige" vira fix', /Prefixo sugerido adicionado: fix/.test(r.stdout));
check('"corrige" gera patch', /Descrição: fix: corrige o filtro/.test(r.stdout) && rx('Versão:    ' + proxPatch).test(r.stdout));

r = rodar(['adiciona relatório mensal', '--dry-run']);
check('sem prefixo "adiciona" vira feat', /Prefixo sugerido adicionado: feat/.test(r.stdout));
check('"adiciona" gera minor', /Descrição: feat: adiciona relatório mensal/.test(r.stdout) && rx('Versão:    ' + proxMinor).test(r.stdout));

r = rodar(['feat!: muda o login', '--dry-run']);
check('breaking gera major', /Versão:    v2\.0\.0/.test(r.stdout));

r = rodar(['bug: teste', '--dry-run']);
check('prefixo desconhecido é recusado', r.status !== 0 && /não reconhecido/.test(r.stderr));

r = rodar(['docs: texto', 'v1.2.0', '--dry-run']);
check('versão já publicada é recusada', r.status !== 0 && /já existe no GitHub/.test(r.stderr));

// ---------- Windows ----------
check('Windows tem a mesma lista de tipos',
  /\$tiposPermitidos = @\('feat', 'fix', 'security', 'docs', 'style', 'refactor', 'test', 'chore'\)/.test(win));
check('Windows sugere tipo pela descrição', /function Get-TipoPelaDescricao/.test(win));
check('Windows calcula a versão', /function Get-ProximaVersao/.test(win) && /\$menor \+= 1/.test(win) && /\$maior \+= 1/.test(win));
check('Windows cria notas a partir do modelo', /Copy-Item \$modelo \$nota/.test(win));
check('Windows recusa tag repetida', /git ls-remote --exit-code --tags origin/.test(win));
check('Windows mostra o estado antes de publicar', /=== 1\/5: estado local ===/.test(win));
check('baixar.ps1 recomenda o publicar.ps1 sem argumentos', /publicar\.ps1 \(ele sugere/.test(winBaixar));

// ---------- Documentação ----------
for (const [nome, texto] of [['README', readme], ['MANUAL', manual], ['COMO_CONFIGURAR', supabase]]) {
  check(nome + ' explica feat/fix/docs', /`feat:/.test(texto) && /`fix:/.test(texto) && /`docs:/.test(texto));
  check(nome + ' explica as três posições da versão', /2º número/.test(texto) && /3º número/.test(texto) && /1º número/.test(texto));
}
check('MANUAL traz checklist de MFA e testes', /Confirmar a verificação em duas etapas nas \*\*duas\*\* contas/.test(manual) && /Importar backup/.test(manual));

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas ? 1 : 0);
