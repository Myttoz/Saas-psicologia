/* Teste: relatório mensal exportável (resumo, entradas, pendências e faltas) */
const fs = require('fs');
const vm = require('vm');
const raiz = require('path').resolve(__dirname, '..') + '/';
const base = raiz + 'js/';

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

['data.js', 'meses.js', 'hoje.js', 'app.js', 'lancamentos.js', 'resumos.js'].forEach(f =>
  vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

mesesModulo.init();
mesesModulo.selecao.resumos = '2026-11';
mesesModulo.selecao.lancamentos = '1999-01'; // prova que o relatório usa o mês de Resumos

fontes = [
  { id: 1, nome: 'Clínica', tipo: 'variavel', valorFixo: null, percentual: 30 },
  { id: 2, nome: 'Unimed', tipo: 'fixo', valorFixo: 400, percentual: null }
];
pacientes = [
  { id: 10, nome: 'Ana Silva', cpf: '52998224725', telefone: '11999998888',
    responsavel: 'Maria Silva', carteira: '123456' },
  { id: 11, nome: 'Bruno Costa' }
];
lancamentos = [
  { id: 1, data: '2026-11-02', horario: '09:00', paciente: 'Ana Silva', tipo: 'normal',
    fonteId: 1, valor: 1000, pagamento: 'pix', status: 'pago', presenca: 'compareceu', obs: 'linha1\nlinha2' },
  { id: 2, data: '2026-11-03', horario: '10:00', paciente: 'bruno costa', tipo: 'avaliacao',
    fonteId: 2, valor: 500, pagamento: 'dinheiro', status: 'pendente', presenca: 'agendado', obs: '=SOMA(A1:A2)' },
  { id: 3, data: '2026-11-04', horario: '11:00', paciente: 'Carla Dias', tipo: 'normal',
    fonteId: 1, valor: 300, pagamento: 'pix', status: 'pendente', presenca: 'faltou', obs: '' },
  { id: 4, data: '2026-11-05', horario: '12:00', paciente: 'Diego Paz', tipo: 'normal',
    fonteId: 1, valor: 200, pagamento: 'pix', status: 'pendente', presenca: 'cancelou', obs: '' },
  { id: 5, data: '2026-11-06', horario: '13:00', paciente: 'Ana Silva', tipo: 'normal',
    fonteId: 1, valor: 100, pagamento: 'pix', status: 'pago', presenca: 'faltou', obs: 'pagamento da falta' },
  { id: 6, data: '2026-12-01', horario: '08:00', paciente: 'Fora do mês', tipo: 'normal',
    fonteId: 1, valor: 999, pagamento: 'pix', status: 'pago', presenca: 'compareceu', obs: '' }
];

console.log('\n[1] Arquivo e resumo');
resumosModulo.exportarRelatorio();
check('nome do arquivo', ultimoDownload === 'relatorio-2026-11.csv', ultimoDownload);
check('CSV começa com BOM para o Excel', csvConteudo.charCodeAt(0) === 0xFEFF);
check('cabeçalho identifica período', csvConteudo.indexOf('RELATORIO MENSAL;2026-11') !== -1);
check('bloco RESUMO existe', csvConteudo.indexOf('\r\nRESUMO\r\n') !== -1);
check('usou o mês de Resumos', csvConteudo.indexOf('Fora do mês') === -1 && csvConteudo.indexOf('2026-12') === -1);
check('contagem de atendimentos do mês', csvConteudo.indexOf('Atendimentos no mês;5') !== -1);
check('contagem de entradas pagas', csvConteudo.indexOf('Entradas (pagos);2') !== -1);
check('contagem de pendências (sem falta/cancelamento)', csvConteudo.indexOf('Pendências;1') !== -1);
check('contagem de faltas', csvConteudo.indexOf('Faltas;2') !== -1);
check('contagem de cancelamentos', csvConteudo.indexOf('Cancelamentos;1') !== -1);
check('total recebido', csvConteudo.indexOf('Total recebido;1100,00') !== -1);
check('total pendente', csvConteudo.indexOf('Total pendente;500,00') !== -1);

console.log('\n[2] Blocos e contato da ficha');
const pEntradas = csvConteudo.indexOf('\r\nENTRADAS\r\n');
const pPend = csvConteudo.indexOf('\r\nPENDÊNCIAS\r\n');
const pFaltas = csvConteudo.indexOf('\r\nFALTAS\r\n');
check('blocos na ordem certa', pEntradas > 0 && pPend > pEntradas && pFaltas > pPend);
const cabecalho = 'Data;Horário;Paciente;Contato;Convênio;Tipo;Pagamento;Presença;Observações;Valor';
check('cabeçalho das 10 colunas existe', csvConteudo.indexOf(cabecalho) !== -1);
check('contato completo saiu da ficha',
  csvConteudo.indexOf('02/11/2026;09:00;Ana Silva;Tel (11) 99999-8888 | Resp.: Maria Silva | Carteira: 123456 | CPF 529.982.247-25;Clínica;Atendimento;Pix;Compareceu;"linha1\nlinha2";1000,00') !== -1);
check('paciente sem ficha fica com contato vazio',
  csvConteudo.indexOf('03/11/2026;10:00;bruno costa;;Unimed;Avaliação;Dinheiro;Agendado;') !== -1);
check('fórmula na observação foi neutralizada', csvConteudo.indexOf("'=SOMA(A1:A2)") !== -1);
check('cancelado não entra em nenhum bloco', csvConteudo.indexOf('Diego Paz') === -1);
check('falta aparece no bloco de faltas', csvConteudo.indexOf('04/11/2026;11:00;Carla Dias;;Clínica;Atendimento;Pix;Faltou;;300,00') !== -1);
check('falta paga aparece também nas entradas e nas faltas',
  csvConteudo.indexOf('06/11/2026;13:00;Ana Silva;') !== -1 &&
  csvConteudo.slice(pFaltas).indexOf('06/11/2026;13:00;Ana Silva;') !== -1);

const linhas = csvConteudo.split('\r\n').filter(l => l.length > 0);
const indiceCabecalhos = [];
linhas.forEach((l, i) => { if (l === cabecalho) indiceCabecalhos.push(i); });
check('três blocos com cabeçalho', indiceCabecalhos.length === 3, String(indiceCabecalhos.length));
check('todas as linhas de dados têm 10 colunas',
  indiceCabecalhos.every(indice => {
    let j = indice + 1;
    while (j < linhas.length && linhas[j] !== '' && !/^(ENTRADAS|PENDÊNCIAS|FALTAS)$/.test(linhas[j])) {
      if (linhas[j].split(';').length !== 10) return false;
      j++;
    }
    return true;
  }));
check('URL temporária liberada', urlRevogada === true);

console.log('\n[3] Mês vazio e exportação do contador');
mesesModulo.selecao.resumos = '1999-01';
ultimoDownload = '';
els.toast.textContent = '';
resumosModulo.exportarRelatorio();
check('mês vazio não baixa arquivo', ultimoDownload === '');
check('mês vazio avisa', els.toast.textContent === 'Não há atendimentos neste mês para exportar.', els.toast.textContent);

mesesModulo.selecao.resumos = '2026-11';
resumosModulo.exportarContador();
check('exportação do contador continua intacta', ultimoDownload === 'contador-2026-11.csv', ultimoDownload);
check('CSV do contador mantém as 7 colunas',
  csvConteudo.indexOf('Data;Convênio;Forma de pagamento;Valor;Ganho;Repasse;Observações') !== -1);

console.log('\n[4] Arquivos e regras');
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const resJs = fs.readFileSync(base + 'resumos.js', 'utf8');
const sw = fs.readFileSync(raiz + 'sw.js', 'utf8');
const manual = fs.readFileSync(raiz + 'MANUAL.md', 'utf8');
check('botão do relatório existe no HTML', html.includes('onclick="resumosModulo.exportarRelatorio()"'));
check('botão do contador continua no HTML', html.includes('onclick="resumosModulo.exportarContador()"'));
check('função nova usa o CSV existente', resJs.includes('this.baixarCsv(\'relatorio-\' + mes + \'.csv\', linhas)'));
check('contato casado pelo nome normalizado', resJs.includes('normalizarTexto(p.nome) !== alvo'));
check('nenhum arquivo JS novo no cache', !sw.includes('relatorio.js'));
check('manual explica o relatório', manual.includes('Relatório mensal') && manual.includes('relatorio-AAAA-MM.csv'));

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas ? 1 : 0);
