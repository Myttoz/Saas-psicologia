/* Teste: privacidade/LGPD — autorização por paciente e apagar dados */
const fs = require('fs');
const vm = require('vm');
const raiz = require('path').resolve(__dirname, '..') + '/';
const base = raiz + 'js/';

function el(id) {
  const children = [];
  const e = {
    id: id || '', value: '', textContent: '', _html: '', style: {}, className: '', files: [],
    selectionStart: 0, selectionEnd: 0,
    children,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c) { if (this._s.has(c)) { this._s.delete(c); return false; } this._s.add(c); return true; }
    },
    addEventListener() {}, appendChild(c) { children.push(c); }, removeChild() {},
    click() {}, reset() {}, focus() {}, select() {}, setSelectionRange() {},
    scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    contains() { return false; }
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); if (v === '') children.length = 0; }
  });
  return e;
}

const els = {};
const titulos = {};
const IDs = ['pacNome', 'pacCpf', 'pacFonte', 'pacValor', 'pacConsentimento',
  'tbodyPacientes', 'pacBuscaResumo', 'toast'];
IDs.forEach(id => { els[id] = el(id); });
global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector(sel) {
    if (sel && sel.indexOf('.modal-title') !== -1) {
      const chave = sel.split(' ')[0];
      return titulos[chave] || (titulos[chave] = el('titulo'));
    }
    return null;
  },
  querySelectorAll() { return []; },
  addEventListener() {}, createElement(tag) { return el(tag); }, body: el('body')
};
const memoria = {};
global.localStorage = {
  getItem: k => (k in memoria ? memoria[k] : null),
  setItem: (k, v) => { memoria[k] = String(v); },
  removeItem: k => { delete memoria[k]; }
};
const sessao = {};
global.sessionStorage = {
  getItem: k => (k in sessao ? sessao[k] : null),
  setItem: (k, v) => { sessao[k] = String(v); }, removeItem: k => { delete sessao[k]; }
};
global.window = global;
global.addEventListener = () => {};
let confirmResposta = true;
let promptResposta = '';
global.confirm = () => confirmResposta;
global.prompt = () => promptResposta;
global.open = () => ({ fechou: true });

const trilha = [];
const toasts = [];
let reautenticacoes = 0;
let saves = 0;
global.segurancaModulo = {
  registrar(acao, detalhe) { trilha.push({ acao, detalhe }); },
  lerRegistroChave() { return ''; },
  estaDesbloqueado() { return true; }
};
global.Backend = { salvarSeConectado() {}, registrarAuditoria() {} };
global.backupModulo = {
  registrarAlteracao() { saves++; },
  _reautenticar(cb) { reautenticacoes++; cb(); }
};
global.prontuarioModulo = {
  _cache: {},
  garantirCache() { return Promise.resolve(true); },
  plain(ev) { return this._cache[ev.id] || (ev.cifrado ? null : { paciente: ev.paciente }); },
  limparCache() { this._cache = {}; }
};
global.hojeModulo = { sessao: null, salvarSessao() {} };
global.app = {
  toast(m) { toasts.push(m); },
  abrirModal() {}, fecharModal() {},
  botaoAcao(rotulo, onclick) { return '<button onclick="' + onclick + '">' + rotulo + '</button>'; }
};
global.obterFontePorId = id => fontes.find(f => f.id === id) || null;
global.preencherFontesSelects = () => {};

['data.js', 'pacientes.js'].forEach(f =>
  vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
const esperar = () => new Promise(resolve => process.nextTick(resolve));

(async function() {
  console.log('\n[1] Autorização no cadastro');
  fontes = [{ id: 2, nome: 'Particular', tipo: 'variavel', valorFixo: null }];
  pacientes = [];
  lancamentos = [];
  evolucoes = [];
  els.pacNome.value = 'Ana Silva';
  els.pacCpf.value = '';
  els.pacFonte.value = '2';
  els.pacValor.value = '180,00';
  els.pacConsentimento.value = 'pendente';
  pacientesModulo.salvar();
  check('novo paciente começa aguardando',
    pacientes.length === 1 && pacientes[0].consentimento === 'pendente' &&
    pacientes[0].consentimentoEm === '');

  const id = pacientes[0].id;
  pacientesModulo.editar(id);
  els.pacConsentimento.value = 'aceito';
  pacientesModulo.salvar();
  check('autorização fica registrada com data',
    pacientes[0].consentimento === 'aceito' && pacientes[0].consentimentoEm === hojeStr,
    pacientes[0].consentimentoEm);

  pacientesRender();
  const linha = els.tbodyPacientes.children[0].innerHTML;
  check('tabela mostra a situação da LGPD', linha.includes('LGPD: Autorizado'));
  check('tabela oferece Apagar dados', linha.includes('Apagar dados'));

  els.pacConsentimento.value = 'value-estranho';
  pacientesModulo.salvar();
  check('valor inválido volta para aguardando',
    pacientes[0].consentimento === 'pendente' && pacientes[0].consentimentoEm === '');

  console.log('\n[2] Apagar dados com senha e código');
  pacientes = [
    { id: 10, nome: 'Ana Silva', consentimento: 'aceito', consentimentoEm: hojeStr },
    { id: 11, nome: 'Bruno Lima', consentimento: 'pendente', consentimentoEm: '' }
  ];
  lancamentos = [
    { id: 100, paciente: 'Ana Silva', data: '2026-11-24' },
    { id: 101, paciente: 'Bruno Lima', data: '2026-11-24' }
  ];
  evolucoes = [
    { id: 1, cifrado: false, paciente: 'Ana Silva', queixa: 'x' },
    { id: 2, cifrado: false, paciente: 'Bruno Lima', queixa: 'y' }
  ];
  prontuarioModulo._cache = {};
  hojeModulo.sessao = { id: 100, inicio: Date.now() };
  trilha.length = 0;
  toasts.length = 0;
  reautenticacoes = 0;
  saves = 0;
  confirmResposta = true;
  promptResposta = 'ana silva';
  pacientesModulo.apagarDados(10);
  await esperar();
  check('pediu senha e código', reautenticacoes === 1);
  check('paciente removido', pacientes.length === 1 && pacientes[0].id === 11);
  check('atendimentos do paciente removidos', lancamentos.length === 1 && lancamentos[0].id === 101);
  check('evoluções do paciente removidas', evolucoes.length === 1 && evolucoes[0].id === 2);
  check('cronômetro da sessão encerrado', hojeModulo.sessao === null);
  check('retrato automático e nuvem atualizados', saves === 1);
  check('exclusão entrou na trilha',
    trilha.some(r => r.acao === 'Dados do paciente apagados' && r.detalhe.indexOf('Ana***') === 0),
    JSON.stringify(trilha));
  check('nome mascarado na trilha', !JSON.stringify(trilha).includes('Ana Silva'));

  confirmResposta = true;
  promptResposta = 'Outro Nome';
  reautenticacoes = 0;
  pacientesModulo.apagarDados(11);
  await esperar();
  check('nome diferente não apaga nada',
    reautenticacoes === 0 && pacientes.length === 1 && lancamentos.length === 1);
  check('aviso quando o nome não confere', toasts.some(m => m.indexOf('Nome diferente') === 0));

  confirmResposta = false;
  promptResposta = 'Bruno Lima';
  pacientesModulo.apagarDados(11);
  await esperar();
  check('cancelar não apaga nada', pacientes.length === 1 && reautenticacoes === 0);

  console.log('\n[3] Backup e nuvem');
  const sandbox = {
    CRP_PADRAO: '04/74163',
    anoValido: v => Number(v) || 2026,
    normalizarAnos: v => (Array.isArray(v) ? v : []),
    console, Date, JSON, Math, RegExp, Array, Object, String, Number, isFinite, Promise
  };
  vm.createContext(sandbox);
  sandbox.window = sandbox;
  vm.runInContext(fs.readFileSync(base + 'backup.js', 'utf8'), sandbox);
  const dados = {
    app: 'saas-livia', versao: 6, fontes: [], lancamentos: [], evolucoes: [],
    dadosProfissional: {}, anos: [], anoAtivo: 2026, criptografia: {},
    pacientes: [{ id: 1, nome: 'Ana', consentimento: 'aceito', consentimentoEm: hojeStr }]
  };
  const normal = sandbox.backupModulo.normalizar(dados);
  check('backup guarda o consentimento',
    normal.pacientes[0].consentimento === 'aceito' &&
    normal.pacientes[0].consentimentoEm === hojeStr);
  dados.pacientes[0].consentimento = 'inventado';
  check('consentimento inválido é sanitizado',
    sandbox.backupModulo.normalizar(dados).pacientes[0].consentimento === 'pendente');
  const antigo = JSON.parse(JSON.stringify(dados));
  delete antigo.pacientes[0].consentimento;
  delete antigo.pacientes[0].consentimentoEm;
  check('backup antigo continua aceito',
    sandbox.backupModulo.normalizar(antigo).pacientes.length === 1);

  console.log('\n[4] Arquivos e regras');
  const html = fs.readFileSync(raiz + 'index.html', 'utf8');
  const pacJs = fs.readFileSync(base + 'pacientes.js', 'utf8');
  const lancJs = fs.readFileSync(base + 'lancamentos.js', 'utf8');
  const backupJs = fs.readFileSync(base + 'backup.js', 'utf8');
  const sw = fs.readFileSync(raiz + 'sw.js', 'utf8');
  const schema = fs.readFileSync(raiz + 'supabase/schema.sql', 'utf8');
  const manual = fs.readFileSync(raiz + 'MANUAL.md', 'utf8');
  check('aviso curto no login', html.includes('Você pode apagar os dados de um paciente'));
  check('aviso curto na lista de pacientes', html.includes('Apagar dados</strong>'));
  check('campo de autorização existe no cadastro', html.includes('id="pacConsentimento"'));
  check('criação automática começa aguardando', lancJs.includes("consentimento: 'pendente'"));
  check('exclusão pede senha e código', pacJs.includes('backupModulo._reautenticar(executar)'));
  check('exclusão pede o nome completo', pacJs.includes('digite o nome completo do paciente'));
  check('aviso fala dos backups antigos', pacJs.includes('Backups já exportados'));
  check('exclusão é registrada na trilha', pacJs.includes("'Dados do paciente apagados'"));
  check('tabela de auditoria existe no banco', schema.includes('create table if not exists public.auditoria'));
  check('whitelist aceita os campos novos',
    backupJs.includes("chave === 'consentimento'") &&
    backupJs.includes("chave === 'consentimentoEm'"));
  check('cache do celular foi atualizado', sw.includes('saatendimentos-v9'));
  check('manual explica a exclusão', manual.includes('Apagar dados') && manual.includes('LGPD'));

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
  process.exit(falhas ? 1 : 0);
})().catch(erro => {
  console.log('ERRO inesperado: ' + (erro && erro.stack ? erro.stack : erro));
  process.exit(1);
});
