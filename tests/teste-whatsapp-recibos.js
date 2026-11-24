/* Teste simulado: WhatsApp, recibos, cards do Painel Hoje, backup v3 e modelos rápidos */
const fs = require('fs');
const vm = require('vm');
const base = require('path').resolve(__dirname, '..') + '/js/';
const raiz = require('path').resolve(__dirname, '..') + '/';

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
const titulos = {};
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
  addEventListener() {},
  execCommand() { copiado = 'fallback'; return true; },
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
global.FileReader = class { readAsText(arquivo) { this.onload({ target: { result: arquivo._conteudo } }); } };
global.print = () => { impressoes++; };

let jsonExportado = '';
let impressoes = 0;
let copiado = '';
let urlAberta = '';
let abrirRetorna = {};
Object.defineProperty(global, 'navigator', {
  value: { clipboard: { writeText: t => { copiado = t; } } }, configurable: true, writable: true
});
global.open = (url) => { urlAberta = url; return abrirRetorna; };
global.execCommand = () => { copiado = 'fallback'; return true; };

const arquivos = ['data.js', 'meses.js', 'hoje.js', 'seguranca.js', 'app.js', 'pacientes.js',
  'fontes.js', 'lancamentos.js', 'situacao.js', 'resumos.js', 'backup.js', 'agenda.js',
  'prontuario.js', 'whatsapp.js', 'recibos.js'];
arquivos.forEach(f => vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

const amanha = new Date();
amanha.setDate(amanha.getDate() + 1);
const amanhaStr = amanha.getFullYear() + '-' +
  String(amanha.getMonth() + 1).padStart(2, '0') + '-' +
  String(amanha.getDate()).padStart(2, '0');

mesesModulo.init();
pacientes = [{ id: 1, nome: 'Ana Silva', fonteId: 2, valor: 180 }];
lancamentos = [
  { id: 901, data: hojeStr, horario: '09:00', paciente: 'Ana Silva', tipo: 'normal',
    fonteId: 2, valor: 180, pagamento: 'pix', status: 'pendente', suaParte: 126,
    presenca: 'agendado', obs: '' },
  { id: 902, data: hojeStr, horario: '14:00', paciente: 'Bruno Costa', tipo: 'avaliacao',
    fonteId: 2, valor: 250, pagamento: 'cartao', status: 'pago', suaParte: 175,
    presenca: 'compareceu', obs: '' },
  { id: 903, data: amanhaStr, horario: '10:00', paciente: 'Carla Dias', tipo: 'normal',
    fonteId: 2, valor: 180, pagamento: 'dinheiro', status: 'pago', suaParte: 126,
    presenca: 'agendado', obs: '' }
];

// ===========================================================================
// 1. Correção dos modelos rápidos
// ===========================================================================
segurancaModulo.desbloqueado = true;
segurancaModulo.registrarAtividade();
prontuarioModulo.mostrarModal({});

prontuarioModulo.aplicarModelo('retorno');
const textoQueixaRetorno = els.evoQueixa.value;
const textoPlanoRetorno = els.evoPlano.value;
check('modelo retorno preenche campos', !!textoQueixaRetorno && !!textoPlanoRetorno);

prontuarioModulo.aplicarModelo('ansiedade');
check('trocar de modelo muda a queixa', els.evoQueixa.value !== textoQueixaRetorno,
  els.evoQueixa.value);
check('trocar de modelo muda o plano', els.evoPlano.value !== textoPlanoRetorno);

els.evoEvolucao.value = 'Texto digitado pela profissional';
prontuarioModulo.aplicarModelo('inicial');
check('texto digitado manualmente é preservado',
  els.evoEvolucao.value === 'Texto digitado pela profissional');
check('modelo inicial aplicado nos demais campos', els.evoQueixa.value.includes('primeira sessão'));

// ===========================================================================
// 2. WhatsApp
// ===========================================================================
const msg = whatsappModulo.mensagem(lancamentos[0]);
check('mensagem cumprimenta pelo primeiro nome', msg.startsWith('Olá, Ana!'), msg.slice(0, 40));
check('mensagem traz data e horário', msg.includes(formatarData(hojeStr)) && msg.includes('09:00'));
check('mensagem pede confirmação', msg.includes('confirma sua presença'));
const msgAvaliacao = whatsappModulo.mensagem(lancamentos[1]);
check('mensagem de avaliação usa palavra avaliação', msgAvaliacao.includes('avaliação'));

abrirRetorna = { focus() {} };
whatsappModulo.enviarConfirmacao(901);
check('abre link wa.me', urlAberta.startsWith('https://wa.me/?text='), urlAberta.slice(0, 45));
check('texto da URL é a mensagem', decodeURIComponent(urlAberta.split('?text=')[1]) === msg);
check('aviso ao abrir WhatsApp', els.toast.textContent.includes('Mensagem pronta'));

abrirRetorna = null;
urlAberta = '';
whatsappModulo.enviarConfirmacao(901);
check('sem WhatsApp, copia mensagem', copiado === msg);
check('aviso de fallback', els.toast.textContent.includes('copiada'));

copiado = '';
whatsappModulo.copiar(901);
check('botão copiar usa a mensagem', copiado === msg);

// fallback sem navigator.clipboard
Object.defineProperty(global, 'navigator', { value: {}, configurable: true, writable: true });
whatsappModulo.copiar(901);
check('fallback de cópia funciona', copiado === 'fallback');

// ===========================================================================
// 3. Dados do recibo e geração
// ===========================================================================
recibosModulo.abrirConfig();
check('modal de dados abre', els.modalDadosRecibo.classList.contains('show-modal'));
check('nome vazio e CRP padrão na primeira vez',
  els.reciboNome.value === '' && els.reciboCrp.value === '04/74163');

els.reciboNome.value = 'Lívia Ferreira';
els.reciboCrp.value = '06/123456';
els.reciboCpf.value = '000.000.000-00';
recibosModulo.salvarConfig();
check('dados salvos', dadosProfissional.nome === 'Lívia Ferreira' &&
  dadosProfissional.crp === '06/123456' && dadosProfissional.cpf === '000.000.000-00');
check('modal fechado após salvar', !els.modalDadosRecibo.classList.contains('show-modal'));
check('dados persistidos no Store', !!memoria.saas_dados_profissional &&
  JSON.parse(memoria.saas_dados_profissional).crp === '06/123456');

recibosModulo.gerar(902);
const recibo = els.areaImpressao.innerHTML;
check('recibo gerado', recibo.includes('COMPROVANTE SIMPLES') && recibo.includes('Ref. 902'));
check('recibo com nome configurado', recibo.includes('Lívia Ferreira') && recibo.includes('CRP 06/123456'));
check('recibo com CPF', recibo.includes('CPF: 000.000.000-00'));
check('recibo com paciente', recibo.includes('Bruno Costa'));
check('recibo com valor', recibo.includes(formatarMoeda(250)));
check('recibo com forma de pagamento', recibo.includes('Cartão'));
check('recibo identifica avaliação', recibo.includes('Avaliação psicológica'));
check('recibo com quitação', recibo.includes('dou quitação'));
check('chama impressão', impressoes === 1, impressoes);
check('aviso de Salvar como PDF', els.toast.textContent.includes('Salvar como PDF'));
check('linha para assinar presente', recibo.includes('recibo-linha-assinatura'));
check('logo como marca d água abaixo do nome/CRP',
  recibo.includes('class="recibo-marca"') && recibo.includes('src="assets/logo.jpeg"'));

// com assinatura cadastrada, a imagem vem junto com a linha (não a substitui)
dadosProfissional.assinatura = 'data:image/png;base64,abc';
recibosModulo.gerar(902);
check('assinatura imagem aparece', els.areaImpressao.innerHTML.includes('recibo-assinatura-img'));
check('linha continua com assinatura imagem', els.areaImpressao.innerHTML.includes('recibo-linha-assinatura'));
check('marca continua com assinatura imagem', els.areaImpressao.innerHTML.includes('recibo-marca'));
dadosProfissional.assinatura = '';

check('forma de pagamento dinheiro', recibosModulo.formaPagamento('dinheiro') === 'Dinheiro');
check('forma de pagamento pix', recibosModulo.formaPagamento('pix') === 'Pix');
check('forma de pagamento desconhecida', recibosModulo.formaPagamento('') === '-');

// padrão genérico quando não há dados
dadosProfissional = { nome: '', crp: '', cpf: '' };
recibosModulo.gerar(901);
check('padrão Psicóloga', els.areaImpressao.innerHTML.includes('Psicóloga'));
check('CRP 04/74163 impresso', els.areaImpressao.innerHTML.includes('CRP 04/74163'));
check('não aparece linha para digitar CRP', !els.areaImpressao.innerHTML.includes('CRP: ___'));
check('linha para assinar à mão presente', els.areaImpressao.innerHTML.includes('recibo-linha-assinatura'));
check('CRP padrão cadastrado', CRP_PADRAO === '04/74163' && dadosProfissional.crp !== undefined);
const cssRecibo = fs.readFileSync(raiz + 'css/style.css', 'utf8');
check('linha tem espaço para assinar à mão',
  cssRecibo.includes('height: 34px') && cssRecibo.includes('border-bottom: 1px solid #000'));
check('sem CPF quando vazio', !els.areaImpressao.innerHTML.includes('CPF:'));
check('recibo de sessão normal', els.areaImpressao.innerHTML.includes('Atendimento psicológico'));

// escape de HTML
lancamentos.push({ id: 905, data: hojeStr, horario: '16:00', paciente: '<script>alert(1)</script>',
  tipo: 'normal', valor: 100, pagamento: 'pix', status: 'pago', suaParte: 70, presenca: 'compareceu' });
recibosModulo.gerar(905);
check('escape de HTML no recibo', !els.areaImpressao.innerHTML.includes('<script>') &&
  els.areaImpressao.innerHTML.includes('&lt;script&gt;'));
lancamentos.pop();

// ===========================================================================
// 4. Cards e botões do Painel Hoje
// ===========================================================================
hojeModulo.render();
const itens = els.hojeLista.children;
check('Painel Hoje lista 2 atendimentos de hoje', itens.length === 2, itens.length);
const htmlAgendado = itens[0].innerHTML; // 09:00 agendado
const htmlPago = itens[1].innerHTML;     // 14:00 compareceu/pago
check('agendado tem Enviar confirmação', htmlAgendado.includes('whatsappModulo.enviarConfirmacao(901)'));
check('agendado tem Copiar mensagem', htmlAgendado.includes('whatsappModulo.copiar(901)'));
check('agendado tem Iniciar sessão', htmlAgendado.includes('hojeModulo.iniciarSessao(901)'));
check('pagamento pago tem Recibo', htmlPago.includes('recibosModulo.abrir(902)'));
check('pendente tem Marcar como pago', htmlAgendado.includes('hojeModulo.marcarPago(901)'));
check('pago não tem Marcar como pago', !htmlPago.includes('hojeModulo.marcarPago(902)'));

check('card Faltam confirmar existe', !!els.hojeConfirmar);
check('card Quem deve existe', !!els.hojeQuemDeve);
check('Faltam confirmar lista 2 agendados', els.hojeConfirmar.children.length === 2,
  els.hojeConfirmar.children.length);
const htmlConfirmar = els.hojeConfirmar.children.map(x => x.innerHTML).join('');
const htmlDeve = els.hojeQuemDeve.children.map(x => x.innerHTML).join('');
check('Faltam confirmar traz Ana e Carla', htmlConfirmar.includes('Ana Silva') &&
  htmlConfirmar.includes('Carla Dias'));
check('Faltam confirmar tem botão de WhatsApp',
  htmlConfirmar.includes('whatsappModulo.enviarConfirmacao(901)'));
check('Faltam confirmar tem botão de copiar mensagem',
  htmlConfirmar.includes('whatsappModulo.copiar(901)'));
check('Quem deve lista só o pendente', els.hojeQuemDeve.children.length === 1,
  els.hojeQuemDeve.children.length);
check('Quem deve traz o valor a receber', htmlDeve.includes(formatarMoeda(126)));
check('Quem deve tem atalho para marcar pago', htmlDeve.includes('hojeModulo.marcarPago(901)'));
check('resumo de quem deve mostra total', els.hojeQuemDeveResumo.textContent === formatarMoeda(126),
  els.hojeQuemDeveResumo.textContent);

// ação do card
els.hojeModuloOK = true;
hojeModulo.marcarPago(901);
check('marcar pago pelo card funciona', lancamentos[0].status === 'pago');
check('card esvazia após pagamento', els.hojeQuemDeve.innerHTML.includes('Tudo quitado neste mês'));
lancamentos[0].status = 'pendente';
hojeModulo.render();

// ===========================================================================
// 5. Botões de recibo em Lançamentos e Situação Paciente
// ===========================================================================
lancamentosRender();
const linhasLanc = els.tbodyHoje.children;
check('Lançamentos tem linhas', linhasLanc.length === 3, linhasLanc.length);
check('Lançamentos mostra Recibo só nos pagos',
  linhasLanc[0].innerHTML.includes('recibosModulo.abrir(') === false &&
  linhasLanc[1].innerHTML.includes('recibosModulo.abrir(902)') &&
  linhasLanc[2].innerHTML.includes('recibosModulo.abrir(903)'));

situacaoModulo.render();
const linhasSit = els.tbodySituacao.children;
check('Situação mostra Recibo no pago', linhasSit[1].innerHTML.includes('recibosModulo.abrir(902)'));
check('Situação mostra Voltar para pendente no pago',
  linhasSit[1].innerHTML.includes('situacaoModulo.marcarPendente(902)'));
check('Situação mostra Marcar como pago no pendente',
  linhasSit[0].innerHTML.includes('situacaoModulo.marcarPago(901)'));

// ===========================================================================
// 6. Backup versão 3 e compatibilidade
// ===========================================================================
dadosProfissional = { nome: 'Lívia Ferreira', crp: '06/123456', cpf: '000.000.000-00' };
backupModulo.exportar();
const exportado = JSON.parse(jsonExportado);
check('backup versão 4 ou superior', exportado.versao >= 4, exportado.versao);
check('backup inclui dados do recibo', exportado.dadosProfissional.nome === 'Lívia Ferreira');
check('backup inclui evoluções', Array.isArray(exportado.evolucoes));

const v1 = { app: 'saas-livia', versao: 1, exportadoEm: '2026-01-01T00:00:00.000Z',
  fontes: fontes, pacientes: pacientes, lancamentos: lancamentos };
backupModulo.processarArquivo({ value: '', files: [{ _conteudo: JSON.stringify(v1) }] });
check('backup v1 importado', lancamentos.length === 3);
check('dados do recibo zerados ao importar v1', dadosProfissional.nome === '' && dadosProfissional.cpf === '');

const v2 = Object.assign({}, v1, { versao: 2, evolucoes: [{ id: 1, paciente: 'Teste' }] });
backupModulo.processarArquivo({ value: '', files: [{ _conteudo: JSON.stringify(v2) }] });
check('backup v2 importado com evoluções', evolucoes.length === 1);
check('CRP padrão mantido ao importar v2 sem CRP', dadosProfissional.crp === '04/74163');

const v3 = Object.assign({}, v2, { versao: 3,
  dadosProfissional: { nome: 'Nova Nome', crp: '99/9', cpf: '111' } });
backupModulo.processarArquivo({ value: '', files: [{ _conteudo: JSON.stringify(v3) }] });
check('backup v3 importado com dados do recibo', dadosProfissional.nome === 'Nova Nome' &&
  dadosProfissional.crp === '99/9');

// ===========================================================================
// 7. Store com dados do recibo
// ===========================================================================
dadosProfissional = { nome: 'Teste Store', crp: '1', cpf: '2' };
Store.salvar();
dadosProfissional = { nome: '', crp: '', cpf: '' };
Store.carregar();
check('Store recarrega dados do recibo', dadosProfissional.nome === 'Teste Store' &&
  dadosProfissional.cpf === '2');

console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
process.exit(falhas === 0 ? 0 : 1);
