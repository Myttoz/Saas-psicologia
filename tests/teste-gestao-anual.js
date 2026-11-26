/* Teste: Gestão Anual — anos limpos, troca de ano, exclusão e backup */
const fs = require('fs');
const vm = require('vm');
const raiz = require('path').resolve(__dirname, '..') + '/';

function el(id) {
  const e = {
    id: id || '', value: '', textContent: '', title: '', _html: '', style: {},
    children: [], files: [], checked: false,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c) { if (this._s.has(c)) { this._s.delete(c); return false; } this._s.add(c); return true; }
    },
    addEventListener() {}, appendChild(c) { e.children.push(c); }, removeChild() {},
    click() {}, reset() {}, focus() {}, querySelector() { return null; },
    querySelectorAll() { return []; }, contains() { return false; }, scrollIntoView() {}
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; }, set(v) { this._html = String(v); }
  });
  return e;
}

const els = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector() { return null; }, querySelectorAll() { return []; },
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
let respostaPrompt = null;
let respostaConfirm = true;
global.prompt = () => respostaPrompt;
global.confirm = () => respostaConfirm;
global.app = { toast() {}, renderizarPagina() {} };
const trilha = [];
global.segurancaModulo = {
  registrar(acao, detalhe) { trilha.push({ acao, detalhe }); },
  lerRegistroChave() { return ''; }
};

['data.js', 'anos.js', 'meses.js', 'backup.js'].forEach(f =>
  vm.runInThisContext(fs.readFileSync(raiz + 'js/' + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
const anoAtual = new Date().getFullYear();

// ---------- base ----------
anos = [];
anoAtivo = anoAtual;
lancamentos = [
  { id: 1, data: anoAtual + '-03-10', horario: '10:00', valor: 100 },
  { id: 2, data: (anoAtual - 1) + '-05-10', horario: '11:00', valor: 200 },
  { id: 3, data: (anoAtual - 1) + '-06-10', horario: '12:00', valor: 300 }
];
evolucoes = [{ id: 1, data: (anoAtual - 1) + '-05-11', cifrado: true, iv: 'a', dados: 'Yg==' }];

check('existe lista de anos e ano em uso', Array.isArray(anos) && anoAtivo === anoAtual);
check('inicializar cria o ano atual e inclui anos com dados',
  gestaoAnualModulo.inicializar() === true && anos.length === 2,
  JSON.stringify(anos));
check('meses acompanham o ano em uso', mesesModulo.ano === anoAtual &&
  mesesModulo.mesAtual('lancamentos').indexOf(anoAtual + '-') === 0);
check('anos com dados entram na lista',
  gestaoAnualModulo.anosDisponiveis().join(',') === (anoAtual - 1) + ',' + anoAtual,
  gestaoAnualModulo.anosDisponiveis().join(','));
check('contagem do ano anterior', gestaoAnualModulo.contar(anoAtual - 1).atendimentos === 2 &&
  gestaoAnualModulo.contar(anoAtual - 1).evolucoes === 1);

// ---------- criar ----------
anos = normalizarAnos(anos);
respostaPrompt = String(anoAtual + 1);
gestaoAnualModulo.criar();
check('criar ano novo deixa os antigos intactos', lancamentos.length === 3 && evolucoes.length === 1);
check('ano novo entra vazio e vira o ativo',
  anoAtivo === anoAtual + 1 && gestaoAnualModulo.contar(anoAtual + 1).total === 0);
check('criação entra na trilha', trilha.some(x => x.acao === 'Ano criado'));

// ---------- trocar ----------
check('trocar de ano atualiza os meses', gestaoAnualModulo.definirAno(anoAtual - 1) === true &&
  mesesModulo.ano === anoAtual - 1 &&
  els['mesesLancamentos'].innerHTML.indexOf(String(anoAtual - 1)) !== -1);
check('troca entra na trilha', trilha.some(x => x.acao === 'Ano ativo alterado'));

// ---------- excluir ----------
respostaConfirm = true;
respostaPrompt = '9999'; // confirmação errada
gestaoAnualModulo.excluir(anoAtual - 1);
check('confirmação errada não apaga nada', lancamentos.length === 3 && evolucoes.length === 1 &&
  !trilha.some(x => x.acao === 'Ano excluído'));

respostaPrompt = String(anoAtual - 1);
gestaoAnualModulo.excluir(anoAtual - 1);
check('exclusão remove só os dados daquele ano', lancamentos.length === 1 && evolucoes.length === 0,
  'lancamentos=' + lancamentos.length + ' evolucoes=' + evolucoes.length);
check('ano excluído sai da lista', gestaoAnualModulo.anosDisponiveis().indexOf(anoAtual - 1) === -1);
check('exclusão entra na trilha', trilha.some(x => x.acao === 'Ano excluído'));

// ---------- backup / nuvem ----------
const copia = backupModulo.montarDados();
check('backup grava versão 6, anos e ano ativo', copia.versao === 6 &&
  copia.anos.length === 2 && copia.anoAtivo === anoAtivo, JSON.stringify(copia.anos));
const normalizado = backupModulo.normalizar(JSON.parse(JSON.stringify(copia)));
check('backup novo é aceito na volta', normalizado.versao === 6 &&
  normalizado.anos.length === 2 && normalizado.anoAtivo === anoAtivo);

const antigo = {
  app: 'saas-livia', versao: 4, fontes: [], pacientes: [], evolucoes: [],
  lancamentos: [{ id: 9, data: '2024-01-02', valor: 50 }],
  dadosProfissional: {}, criptografia: {}
};
const antigoNormal = backupModulo.normalizar(antigo);
check('backup antigo sem anos é aceito', antigoNormal.versao >= 4 && antigoNormal.anos.length === 0);
anos = antigoNormal.anos;
anoAtivo = antigoNormal.anoAtivo;
lancamentos = antigoNormal.lancamentos;
evolucoes = antigoNormal.evolucoes;
gestaoAnualModulo.garantirAnos();
check('backup antigo recupera os anos dos dados',
  gestaoAnualModulo.anosDisponiveis().indexOf(2024) !== -1);

Store.salvar();
check('localStorage guarda anos e ano ativo',
  JSON.parse(memoria.saas_anos).length === 2 && Number(memoria.saas_ano_ativo) === anoAtivo);

// ---------- arquivos ----------
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const appJs = fs.readFileSync(raiz + 'js/app.js', 'utf8');
const sw = fs.readFileSync(raiz + 'sw.js', 'utf8');
const css = fs.readFileSync(raiz + 'css/style.css', 'utf8');
check('menu e página de Anos existem', /trocarPagina\('anos'\)/.test(html) && /id="page-anos"/.test(html));
check('script de anos é carregado', /js\/anos\.js/.test(html));
check('app renderiza a página de anos', /id === 'anos'/.test(appJs) && /anos: 'Anos'/.test(appJs));
check('service worker cacheia anos.js', /js\/anos\.js/.test(sw) && /saatendimentos-v\d+/.test(sw));
check('CSS da lista de anos existe', /\.ano-linha/.test(css));

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas ? 1 : 0);
