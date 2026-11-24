/* Teste simulado: exportação enxuta para o contador (7 colunas) */
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

const els = {};
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
  { id: 1, data: '2026-11-02', horario: '09:00', paciente: 'Ana Silva', tipo: 'normal', fonteId: 1, valor: 1000, pagamento: 'pix', status: 'pago', obs: 'linha1\nlinha2', suaParte: 300, presenca: 'compareceu' },
  { id: 2, data: '2026-11-03', horario: '10:00', paciente: 'Bruno Costa', tipo: 'avaliacao', fonteId: 2, valor: 500, pagamento: 'dinheiro', status: 'pendente', obs: '=SOMA(A1:A2)', suaParte: null, presenca: 'agendado' },
  { id: 3, data: '2026-12-01', horario: '08:00', paciente: 'Fora do mês', tipo: 'normal', fonteId: 1, valor: 100, pagamento: 'pix', status: 'pago', obs: '', suaParte: 30, presenca: 'compareceu' }
];

resumosModulo.exportarContador();

check('nome do arquivo', ultimoDownload === 'contador-2026-11.csv', ultimoDownload);
check('CSV começa com BOM para o Excel', csvConteudo.charCodeAt(0) === 0xFEFF);
check('cabeçalho tem só as 7 colunas pedidas',
  csvConteudo.indexOf('Data;Convênio;Forma de pagamento;Valor;Ganho;Repasse;Observações') !== -1);
check('não trouxe paciente', csvConteudo.indexOf('Ana Silva') === -1 && csvConteudo.indexOf('Bruno Costa') === -1);
check('não trouxe horário, tipo, status ou presença',
  csvConteudo.indexOf('09:00') === -1 && csvConteudo.indexOf('Normal') === -1 &&
  csvConteudo.indexOf('Pendente') === -1 && csvConteudo.indexOf('Agendado') === -1);
check('não trouxe coluna de percentual nem resumo por categoria',
  csvConteudo.indexOf('Percentual') === -1 &&
  csvConteudo.indexOf('TOTAL;Atendimentos') === -1 &&
  csvConteudo.indexOf('TOTAL;Geral') === -1);
check('usou o mês de Resumos', csvConteudo.indexOf('Fora do mês') === -1);
check('convênio com ponto e vírgula entre aspas', csvConteudo.indexOf('"Clínica; Particular"') !== -1);
check('data e valores do primeiro atendimento',
  csvConteudo.indexOf('02/11/2026;"Clínica; Particular";Pix;1000,00;300,00;700,00;') !== -1);
check('convênio sem percentual fica com ganho/repasse vazios',
  csvConteudo.indexOf('03/11/2026;Unimed;Dinheiro;500,00;;;') !== -1);
check('observação com quebra de linha entre aspas', csvConteudo.indexOf('"linha1\nlinha2"') !== -1);
check('fórmula na observação neutralizada', csvConteudo.indexOf("'=SOMA(A1:A2)") !== -1);
check('linha TOTAL com somas e aviso parcial',
  csvConteudo.indexOf('TOTAL;;;1500,00;300,00;700,00;Parcial: convênio sem percentual') !== -1);
const linhas = csvConteudo.split('\r\n').filter(l => l.length > 0);
check('2 atendimentos + cabeçalho + TOTAL', linhas.length === 4, String(linhas.length));
check('linha TOTAL mantém as 7 colunas', linhas[3].split(';').length === 7, String(linhas[3].split(';').length));
check('URL temporária liberada', urlRevogada === true);

// com todos os percentuais informados, o TOTAL não precisa de aviso
fontes[1].percentual = 40;
resumosModulo.exportarContador();
check('TOTAL soma ganho e repasse quando todos têm percentual',
  csvConteudo.indexOf('TOTAL;;;1500,00;500,00;1000,00;') !== -1);
check('sem aviso parcial quando está completo', csvConteudo.indexOf('Parcial:') === -1);

mesesModulo.selecao.resumos = '1999-01';
ultimoDownload = '';
resumosModulo.exportarContador();
check('mês vazio não baixa arquivo', ultimoDownload === '');
check('mês vazio avisa', els['toast'].textContent === 'Não há atendimentos neste mês para exportar.', els['toast'].textContent);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas === 0 ? 0 : 1);
