/* Teste simulado: exportação de resumos e detalhes em CSV para o contador */
const fs = require('fs');
const vm = require('vm');
const base = require('path').resolve(__dirname, '..') + '/js/';

let csvConteudo = '';
let ultimoDownload = '';
let urlRevogada = false;

function el(id) {
  const children = [];
  const e = {
    id: id || '', value: '', textContent: '', _html: '', style: {}, className: '', files: [],
    children,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c) { if (this._s.has(c)) { this._s.delete(c); return false; } this._s.add(c); return true; }
    },
    addEventListener() {}, appendChild(c) { children.push(c); }, removeChild() {},
    click() {}, reset() {}, focus() {}, select() {}, setSelectionRange() {}, scrollIntoView() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; }
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); if (v === '') children.length = 0; }
  });
  return e;
}

global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement(tag) {
    if (tag === 'a') {
      const a = el('a');
      a.click = function() { ultimoDownload = a.download; };
      return a;
    }
    return el(tag);
  },
  body: el('body')
};
const els = {};
const memoria = {};
global.localStorage = {
  getItem: k => (k in memoria ? memoria[k] : null),
  setItem: (k, v) => { memoria[k] = String(v); },
  removeItem: k => { delete memoria[k]; }
};
global.window = global;
global.addEventListener = () => {};
global.setInterval = () => 1;
global.clearInterval = () => {};
global.confirm = () => true;
global.Blob = class { constructor(partes) { csvConteudo = partes.join(''); } };
global.URL = { createObjectURL: () => 'blob:csv', revokeObjectURL() { urlRevogada = true; } };

const arquivos = ['data.js', 'meses.js', 'hoje.js', 'seguranca.js', 'app.js', 'pacientes.js',
  'fontes.js', 'lancamentos.js', 'situacao.js', 'resumos.js', 'backup.js', 'agenda.js',
  'prontuario.js', 'whatsapp.js', 'recibos.js'];
arquivos.forEach(f => vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

mesesModulo.init();
mesesModulo.selecao.resumos = '2026-11';
mesesModulo.selecao.lancamentos = '1999-01'; // prova que a exportação usa o mês de Resumos

fontes = [
  { id: 1, nome: 'Clínica; Particular', tipo: 'variavel', percentual: 30 },
  { id: 2, nome: 'Unimed', tipo: 'variavel', percentual: null }
];
lancamentos = [
  { id: 1, data: '2026-11-02', horario: '09:00', paciente: 'Ana "Ana" Silva', tipo: 'normal', fonteId: 1, valor: 1000, pagamento: 'pix', status: 'pago', obs: 'linha1\nlinha2', suaParte: 300, presenca: 'compareceu' },
  { id: 2, data: '2026-11-03', horario: '10:00', paciente: '=SOMA(A1:A2)', tipo: 'avaliacao', fonteId: 2, valor: 500, pagamento: 'dinheiro', status: 'pendente', obs: '', suaParte: null, presenca: 'agendado' },
  { id: 3, data: '2026-12-01', horario: '08:00', paciente: 'Fora do mês', tipo: 'normal', fonteId: 1, valor: 100, pagamento: 'pix', status: 'pago', obs: '', suaParte: 30, presenca: 'compareceu' }
];

// ---------- Exportação enxuta para o contador ----------
resumosModulo.exportarContador();
check('nome do arquivo do contador', ultimoDownload === 'contador-2026-11.csv', ultimoDownload);
check('CSV começa com BOM para o Excel', csvConteudo.charCodeAt(0) === 0xFEFF);
check('cabeçalho do contador',
  csvConteudo.indexOf('Data;Convênio;Forma de pagamento;Valor;Ganho;Repasse;Observações') !== -1);
check('usou o mês de Resumos', csvConteudo.indexOf('Fora do mês') === -1);
check('convênio com ponto e vírgula entre aspas', csvConteudo.indexOf('"Clínica; Particular"') !== -1);
check('ganho e repasse da sessão', csvConteudo.indexOf('1000,00;300,00;700,00') !== -1);
check('convênio sem percentual fica em branco', csvConteudo.indexOf('500,00;;;') !== -1);
check('total com aviso parcial',
  csvConteudo.indexOf('TOTAL;;;1500,00;300,00;700,00;Parcial: convênio sem percentual') !== -1);
check('observação com quebra de linha entre aspas', csvConteudo.indexOf('"linha1\nlinha2"') !== -1);
check('URL temporária liberada', urlRevogada === true);
const linhas = csvConteudo.split('\r\n').filter(l => l.length > 0);
check('cabeçalho + 2 atendimentos + total', linhas.length === 4, String(linhas.length));

// ---------- Mês vazio ----------
mesesModulo.selecao.resumos = '1999-01';
ultimoDownload = '';
resumosModulo.exportarContador();
check('mês vazio não baixa arquivo', ultimoDownload === '');
check('mês vazio avisa', (els['toast'] && els['toast'].textContent || '').indexOf('Não há atendimentos') !== -1,
  els['toast'] && els['toast'].textContent);

//console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas === 0 ? 0 : 1);
