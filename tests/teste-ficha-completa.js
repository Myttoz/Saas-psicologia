/* Teste: ficha do paciente mais completa (nascimento, telefone, responsável, carteira) */
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
  'pacNascimento', 'pacTelefone', 'pacResponsavel', 'pacCarteira',
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
global.setInterval = () => 1;
global.clearInterval = () => {};
global.confirm = () => true;
global.prompt = () => '';
global.open = () => ({ fechou: true });
global.Backend = { salvarSeConectado() {}, registrarAuditoria() {} };
global.backupModulo = { registrarAlteracao() {}, _reautenticar(cb) { cb(); } };
global.segurancaModulo = { registrar() {}, lerRegistroChave() { return ''; }, estaDesbloqueado() { return true; } };
global.app = global.app || {};
global.app.toast = () => {};
global.obterFontePorId = id => fontes.find(f => f.id === id) || null;
global.preencherFontesSelects = () => {};

['data.js', 'app.js', 'pacientes.js', 'lancamentos.js'].forEach(f =>
  vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

console.log('\n[1] Máscara do telefone');
check('telefone com 11 dígitos', formatarTelefone('11999998888') === '(11) 99999-8888', formatarTelefone('11999998888'));
check('telefone com 10 dígitos', formatarTelefone('1133334444') === '(11) 3333-4444', formatarTelefone('1133334444'));
check('telefone incompleto', formatarTelefone('119') === '(11) 9', formatarTelefone('119'));
check('telefone vazio', formatarTelefone('') === '');
els.pacTelefone.value = '(11) 99999-8888123';
app.mascaraTelefone(els.pacTelefone);
check('máscara limita a 11 dígitos', els.pacTelefone.value === '(11) 99999-8888', els.pacTelefone.value);

console.log('\n[2] Cadastro e edição');
fontes = [{ id: 2, nome: 'Particular', tipo: 'variavel', valorFixo: null, percentual: 70 }];
pacientes = [];
lancamentos = [];
evolucoes = [];
els.pacNome.value = 'Ana Silva';
els.pacCpf.value = '';
els.pacFonte.value = '2';
els.pacValor.value = '180,00';
els.pacConsentimento.value = 'pendente';
els.pacNascimento.value = '1990-01-15';
els.pacTelefone.value = '(11) 99999-8888';
els.pacResponsavel.value = '  Maria Silva  ';
els.pacCarteira.value = '  123456  ';
pacientesModulo.salvar();
const p = pacientes[0];
check('cadastro guardou os quatro campos',
  !!p && p.nascimento === '1990-01-15' && p.telefone === '11999998888' &&
  p.responsavel === 'Maria Silva' && p.carteira === '123456', JSON.stringify(p));

pacientesModulo.editar(p.id);
check('edição abre nascimento em ISO', els.pacNascimento.value === '1990-01-15', els.pacNascimento.value);
check('edição abre telefone com máscara', els.pacTelefone.value === '(11) 99999-8888', els.pacTelefone.value);
check('edição abre responsável e carteira',
  els.pacResponsavel.value === 'Maria Silva' && els.pacCarteira.value === '123456');

els.pacNascimento.value = '1988-05-20';
els.pacTelefone.value = '21 3333-4444';
els.pacResponsavel.value = 'João Silva';
els.pacCarteira.value = '999';
pacientesModulo.salvar();
check('edição atualiza os campos',
  pacientes[0].nascimento === '1988-05-20' && pacientes[0].telefone === '2133334444' &&
  pacientes[0].responsavel === 'João Silva' && pacientes[0].carteira === '999',
  JSON.stringify(pacientes[0]));

els.pacNascimento.value = '2026-13-99';
pacientesModulo.salvar();
check('data inválida é descartada sem apagar o paciente',
  pacientes.length === 1 && pacientes[0].nascimento === '');

pacientes[0].nascimento = '1990-01-15';
pacientes[0].telefone = '11999998888';
pacientes[0].responsavel = 'Maria Silva';
pacientes[0].carteira = '123456';

console.log('\n[3] Tabela e busca');
pacientesRender();
const htmlLinha = els.tbodyPacientes.children[0].innerHTML;
check('tabela mostra nascimento e telefone',
  htmlLinha.includes('Nasc. 15/01/1990') && htmlLinha.includes('Tel (11) 99999-8888'), htmlLinha);
check('tabela mostra responsável e carteira',
  htmlLinha.includes('Resp.: Maria Silva') && htmlLinha.includes('Carteira: 123456'));

pacientes[0].responsavel = '<img src=x onerror=alert(1)>';
pacientesRender();
check('texto novo é escapado na tabela',
  !els.tbodyPacientes.children[0].innerHTML.includes('<img') &&
  els.tbodyPacientes.children[0].innerHTML.includes('&lt;img'),
  els.tbodyPacientes.children[0].innerHTML);
pacientes[0].responsavel = 'Maria Silva';

pacientesModulo.buscar('999998888');
check('busca encontra pelo telefone', els.tbodyPacientes.children.length === 1);
pacientesModulo.buscar('maria silva');
check('busca encontra pelo responsável', els.tbodyPacientes.children.length === 1);
pacientesModulo.buscar('123456');
check('busca encontra pela carteira', els.tbodyPacientes.children.length === 1);
pacientesModulo.buscar('15/01/1990');
check('busca não encontra pela data formatada', els.tbodyPacientes.children.length === 0);
pacientesModulo.buscar('');
check('busca limpa restaura a lista', els.tbodyPacientes.children.length === 1);

console.log('\n[4] Backup e compatibilidade');
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
  pacientes: [{ id: 1, nome: 'Ana', nascimento: '1990-01-15', telefone: '(11) 99999-8888',
    responsavel: 'Maria Silva', carteira: '123456' }]
};
const normal = sandbox.backupModulo.normalizar(dados);
check('backup guarda os campos novos',
  normal.versao === 6 && normal.pacientes[0].nascimento === '1990-01-15' &&
  normal.pacientes[0].telefone === '11999998888' &&
  normal.pacientes[0].responsavel === 'Maria Silva' &&
  normal.pacientes[0].carteira === '123456', JSON.stringify(normal.pacientes[0]));
dados.pacientes[0].nascimento = 'data estranha';
dados.pacientes[0].telefone = { objeto: true };
check('valores inválidos são limpos sem quebrar o backup',
  sandbox.backupModulo.normalizar(dados).pacientes[0].nascimento === '' &&
  sandbox.backupModulo.normalizar(dados).pacientes[0].telefone === '');
const antigo = { app: 'saas-livia', versao: 6, fontes: [], lancamentos: [], evolucoes: [],
  dadosProfissional: {}, anos: [], anoAtivo: 2026, criptografia: {},
  pacientes: [{ id: 2, nome: 'Bruno' }] };
check('paciente de backup antigo continua aceito',
  sandbox.backupModulo.normalizar(antigo).pacientes.length === 1);

console.log('\n[5] Arquivos e regras');
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const pacJs = fs.readFileSync(base + 'pacientes.js', 'utf8');
const lancJs = fs.readFileSync(base + 'lancamentos.js', 'utf8');
const backupJs = fs.readFileSync(base + 'backup.js', 'utf8');
const appJs = fs.readFileSync(base + 'app.js', 'utf8');
const sw = fs.readFileSync(raiz + 'sw.js', 'utf8');
['pacNascimento', 'pacTelefone', 'pacResponsavel', 'pacCarteira'].forEach(id =>
  check('campo ' + id + ' existe no HTML', html.includes('id="' + id + '"')));
check('HTML traz a máscara do telefone', html.includes('oninput="app.mascaraTelefone(this)"'));
check('app registra a máscara', appJs.includes('app.mascaraTelefone(this)'));
check('busca inclui os campos novos', pacJs.includes("String(p.responsavel || '')"));
check('paciente criado pelo atendimento começa com os campos vazios',
  lancJs.includes("nascimento: '',") && lancJs.includes("telefone: '',") &&
  lancJs.includes("responsavel: '',") && lancJs.includes("carteira: ''"));
check('backup não ganhou versão nova', backupJs.includes('versao: 6'));
check('cache do celular foi atualizado para o portal', /saatendimentos-v\d+/.test(sw));
check('portal.js entrou no cache', sw.includes('./js/portal.js'));
check('portal-app.js entrou no cache', sw.includes('./js/portal-app.js'));
check('portal.html entrou no cache', sw.includes('./portal.html'));
check('nenhum arquivo JS inesperado entrou no cache',
  ['ficha.js', 'relatorio.js'].every(nome => !sw.includes(nome)));

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas ? 1 : 0);
