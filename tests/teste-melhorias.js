/* Teste simulado: assinatura do recibo, buscas e seleção em massa */
const fs = require('fs');
const vm = require('vm');
const base = require('path').resolve(__dirname, '..') + '/js/';

function el(id) {
  const children = [];
  const e = {
    id: id || '', value: '', textContent: '', title: '', _html: '', style: {},
    className: '', files: [], checked: false, indeterminate: false, disabled: false,
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
let jsonExportado = '';
let impressoes = 0;

global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector(sel) {
    if (sel && sel.indexOf('.modal-title') !== -1) return els['titulo-modal'] || (els['titulo-modal'] = el('titulo'));
    return null;
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement(tag) { return el(tag); },
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
global.Blob = class { constructor(partes) { jsonExportado = partes.join(''); } };
global.URL = { createObjectURL: () => 'blob:teste', revokeObjectURL() {} };
global.FileReader = class {
  readAsText(arquivo) { this.onload({ target: { result: arquivo._conteudo } }); }
  readAsDataURL(arquivo) { this.onload({ target: { result: arquivo._data } }); }
};
global.Image = class {
  set src(v) { this._src = v; if (this.width === undefined) this.width = 500; if (this.height === undefined) this.height = 120; if (this.onload) this.onload(); }
};
global.HTMLCanvasElement = class {};
global.document.createElement = function(tag) {
  if (tag === 'canvas') {
    return {
      width: 0, height: 0,
      getContext() { return { drawImage() {}, fillRect() {}, set fillStyle(v) {} }; },
      toDataURL(tipo) { return 'data:' + tipo + ';base64,TESTE'; }
    };
  }
  return el(tag);
};
global.print = () => { impressoes++; };

const arquivos = ['data.js', 'meses.js', 'hoje.js', 'seguranca.js', 'app.js', 'pacientes.js',
  'fontes.js', 'lancamentos.js', 'situacao.js', 'resumos.js', 'backup.js', 'agenda.js',
  'prontuario.js', 'whatsapp.js', 'recibos.js'];
arquivos.forEach(f => vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
function linhas() { return els['tbodyHoje'].children.length; }
function conteudoLinhas(id) { return els[id].children.map(c => c.innerHTML).join(''); }
function htmlTbody() { return conteudoLinhas('tbodyHoje'); }
function htmlPacientes() { return conteudoLinhas('tbodyPacientes'); }

// ----------Base de teste----------
const hoje = hojeStr;
mesesModulo.init();
const mes = hoje.slice(0, 7);
mesesModulo.selecao.lancamentos = mes;

fontes = [
  { id: 1, nome: 'Clínica', tipo: 'variavel', percentual: 30 },
  { id: 2, nome: 'Particular', tipo: 'variavel', percentual: 70 },
  { id: 3, nome: 'Unimed', tipo: 'variavel', percentual: null }
];
pacientes = [
  { id: 1, nome: 'Ana Silva', fonteId: 1, valor: 180 },
  { id: 2, nome: 'Bruno Costa', fonteId: 2, valor: 200 },
  { id: 3, nome: 'Carla Dias', fonteId: 3, valor: 150 }
];
lancamentos = [
  { id: 101, data: hoje, horario: '09:00', paciente: 'Ana Silva', tipo: 'normal', fonteId: 1, valor: 180, pagamento: 'pix', status: 'pendente', obs: '', suaParte: 54, presenca: 'agendado' },
  { id: 102, data: hoje, horario: '10:00', paciente: 'Bruno Costa', tipo: 'avaliacao', fonteId: 2, valor: 200, pagamento: 'dinheiro', status: 'pago', obs: '', suaParte: 140, presenca: 'compareceu' },
  { id: 103, data: hoje, horario: '14:00', paciente: 'Carla Dias', tipo: 'normal', fonteId: 3, valor: 150, pagamento: 'cartao', status: 'pendente', obs: '', suaParte: null, presenca: 'faltou' }
];

// ----------Assinatura do recibo----------
dadosProfissional.assinatura = 'data:image/png;base64,ASSINADA';
recibosModulo.abrirConfig();
check('prévia mostra assinatura salva', els['reciboAssinaturaPreview'].innerHTML.indexOf('<img') !== -1);

recibosModulo.removerAssinatura();
check('remover assinatura mostra aviso', els['reciboAssinaturaPreview'].innerHTML.indexOf('Nenhuma assinatura') !== -1);
els['reciboNome'].value = 'Psicóloga Teste';
recibosModulo.salvarConfig();
check('remoção é salva', dadosProfissional.assinatura === '');

recibosModulo.processarAssinatura({ files: [{ type: 'image/png', _data: 'data:image/png;base64,original' }] });
check('imagem escolhida gera prévia', els['reciboAssinaturaPreview'].innerHTML.indexOf('<img') !== -1);
recibosModulo.salvarConfig();
check('assinatura reduzida é salva', dadosProfissional.assinatura.indexOf('data:image/png;base64,TESTE') === 0,
  dadosProfissional.assinatura);

const antesImpressao = impressoes;
recibosModulo.gerar(102);
check('recibo usa imagem da assinatura', els['areaImpressao'].innerHTML.indexOf('recibo-assinatura-img') !== -1);
check('recibo dispara impressão', impressoes === antesImpressao + 1);

backupModulo.exportar();
const backup = JSON.parse(jsonExportado);
check('backup inclui assinatura', backup.versao >= 4 && backup.dadosProfissional.assinatura === dadosProfissional.assinatura);
dadosProfissional.assinatura = '';
backupModulo.processarArquivo({ files: [{ _conteudo: jsonExportado }] });
check('importar recupera assinatura', dadosProfissional.assinatura.indexOf('data:image/png;base64,TESTE') === 0);

// ----------Busca na Agenda----------
agendaModulo.termo = '';
agendaModulo.filtroData = '';
agendaModulo.render();
const htmlAgendaTodos = els['agendaGrid'].innerHTML;
check('agenda mostra todos sem filtro', htmlAgendaTodos.indexOf('Ana Silva') !== -1 && htmlAgendaTodos.indexOf('Bruno Costa') !== -1);

agendaModulo.buscarNome('bruno');
check('agenda filtra por nome', els['agendaGrid'].innerHTML.indexOf('Bruno Costa') !== -1 && els['agendaGrid'].innerHTML.indexOf('Ana Silva') === -1);
check('resumo da agenda informa 1', els['agendaBuscaResumo'].textContent === '1 agendamento encontrado', els['agendaBuscaResumo'].textContent);

agendaModulo.buscarData(hoje);
check('agenda com data filtrada usa 1 coluna', els['agendaGrid'].classList.contains('filtrada') && agendaModulo.filtroData === hoje);
agendaModulo.buscarNome('ninguém');
check('agenda sem resultados avisa', els['agendaBuscaResumo'].textContent === 'Nenhum agendamento encontrado');

agendaModulo.limparBusca();
check('limpar busca da agenda restaura grade', agendaModulo.termo === '' && agendaModulo.filtroData === '' && !els['agendaGrid'].classList.contains('filtrada'));

// ----------Busca em Pacientes----------
pacientesModulo.buscar('clinica');
check('pacientes buscam por convênio sem acento', els['tbodyPacientes'].children.length === 1 && htmlPacientes().indexOf('Ana Silva') !== -1);
pacientesModulo.buscar('bruno');
check('pacientes buscam por nome', els['tbodyPacientes'].children.length === 1 && htmlPacientes().indexOf('Bruno Costa') !== -1);
pacientesModulo.buscar('nao existe');
check('pacientes sem resultado avisam', els['tbodyPacientes'].innerHTML.indexOf('Nenhum paciente encontrado') !== -1);
pacientesModulo.limparBusca();
check('limpar busca de pacientes restaura lista', els['tbodyPacientes'].children.length === 3 && els['pacBusca'].value === '');

// ----------Busca em Lançamentos----------
lancamentosRender();
check('lançamentos mostram os 3 do mês', linhas() === 3, String(linhas()));

lancamentosModulo.buscar('bruno');
check('busca por paciente', linhas() === 1 && htmlTbody().indexOf('Bruno Costa') !== -1);
lancamentosModulo.buscar('avaliacao');
check('busca sem acento encontra Avaliação', linhas() === 1 && htmlTbody().indexOf('Avaliação') !== -1);
lancamentosModulo.buscar('140,00');
check('busca por valor a receber', linhas() === 1 && htmlTbody().indexOf('Bruno Costa') !== -1);
lancamentosModulo.buscar('pix');
check('busca por forma de pagamento', linhas() === 1 && htmlTbody().indexOf('Ana Silva') !== -1);
lancamentosModulo.buscar(hoje.split('-')[2] + '/' + hoje.split('-')[1]);
check('busca por data formatada', linhas() === 3);
lancamentosModulo.buscar('cancelou');
check('busca sem resultado', linhas() === 0 && els['tbodyHoje'].innerHTML.indexOf('Nenhum atendimento encontrado') !== -1);
lancamentosModulo.limparBusca();
check('limpar busca de lançamentos', linhas() === 3 && els['lancBusca'].value === '');

// ----------Seleção em massa----------
check('caixas de seleção nas linhas', (htmlTbody().match(/chk-lanc/g) || []).length === 6);
lancamentosModulo.marcar(101, 'status', true);
check('resumo da seleção', els['lancMassaResumo'].textContent.indexOf('1 status') !== -1, els['lancMassaResumo'].textContent);
check('cabeçalho fica indeterminado', els['chkTodosStatus'].indeterminate === true && els['chkTodosStatus'].checked === false);
check('botão aplicar status habilitado', els['btnAplicarStatus'].disabled === false);
check('botão aplicar presença desabilitado', els['btnAplicarPresenca'].disabled === true);

lancamentosModulo.marcarTodos('presenca', true);
check('marcar todos os visíveis', Object.keys(lancamentosModulo.selecionados.presenca).length === 3);
check('cabeçalho de presença marcado', els['chkTodosPresenca'].checked === true && els['chkTodosPresenca'].indeterminate === false);
lancamentosModulo.marcar(102, 'presenca', false);
check('desmarcar um fica indeterminado', els['chkTodosPresenca'].indeterminate === true);

document.getElementById('massaStatus').value = 'pago';
lancamentosModulo.aplicarEmMassa('status');
check('status alterado em massa', lancamentos[0].status === 'pago' && lancamentos[1].status === 'pago');
check('status salvo no navegador', JSON.parse(localStorage.getItem('saas_lancamentos'))[0].status === 'pago');
check('presenças não foram alteradas', lancamentos[0].presenca === 'agendado');

document.getElementById('massaPresenca').value = 'compareceu';
lancamentosModulo.aplicarEmMassa('presenca');
check('presença alterada em massa', lancamentos[0].presenca === 'compareceu' && lancamentos[1].presenca === 'compareceu');

lancamentosModulo.marcarTodos('status', false);
check('desmarcar todos', Object.keys(lancamentosModulo.selecionados.status).length === 0 && els['chkTodosStatus'].checked === false);
lancamentosModulo.limparSelecao();
check('limpar seleção limpa as duas colunas', Object.keys(lancamentosModulo.selecionados.presenca).length === 0);
check('sem seleção, botões desabilitados', els['btnAplicarStatus'].disabled === true && els['btnAplicarPresenca'].disabled === true);

lancamentosModulo.marcar(101, 'status', true);
mesesModulo.selecionar('lancamentos', '2020-01');
check('trocar de mês limpa seleção', Object.keys(lancamentosModulo.selecionados.status).length === 0);
mesesModulo.selecionar('lancamentos', mes);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas === 0 ? 0 : 1);
