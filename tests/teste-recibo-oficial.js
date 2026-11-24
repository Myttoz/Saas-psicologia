/* Teste: recibo oficial da Receita Federal + CPF do paciente */
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
const IDs = ['pacNome', 'pacFonte', 'pacValor', 'pacCpf', 'tbodyPacientes', 'pacBuscaResumo',
  'reciboCpfPaciente', 'reciboLancamentoId', 'reciboCodigo', 'reciboDataEmissao',
  'reciboResumo', 'reciboTexto', 'reciboStatus', 'areaImpressao'];
IDs.forEach(id => { els[id] = el(id); });
let copiado = '';
let urlAberta = '';
let abrirRetorna = { fechou: true };
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
  addEventListener() {}, createElement(tag) { return el(tag); },
  execCommand() { copiado = 'fallback'; return true; }, body: el('body')
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
global.setTimeout = fn => 1;
global.confirm = () => true;
global.prompt = () => null;
global.open = url => { urlAberta = url; return abrirRetorna; };
Object.defineProperty(global, 'navigator', {
  value: { clipboard: { writeText: t => { copiado = t; } } }, configurable: true, writable: true
});
global.print = () => {};

const trilha = [];
global.segurancaModulo = {
  registrar(acao, detalhe) { trilha.push({ acao, detalhe }); },
  lerRegistroChave() { return ''; }
};
let renderizou = 0;
global.preencherFontesSelects = () => {};

['data.js', 'meses.js', 'lancamentos.js', 'backup.js', 'whatsapp.js',
 'pacientes.js', 'app.js', 'recibos.js'].forEach(f =>
  vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));
global.lancamentosRender = () => { renderizou++; };

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

// ---------- CPF ----------
check('formatar CPF completo', formatarCpf('52998224725') === '529.982.247-25', formatarCpf('52998224725'));
check('formatar CPF parcial', formatarCpf('52998') === '529.98', formatarCpf('52998'));
check('descarta não números', formatarCpf('52a9.9/82') === '529.982', formatarCpf('52a9.9/82'));
check('CPF válido aceito', cpfValido('529.982.247-25') === true);
check('CPF repetido recusado', cpfValido('11111111111') === false);
check('CPF com dígito errado recusado', cpfValido('12345678900') === false);
check('CPF curto recusado', cpfValido('123') === false);

const campoMascara = el('teste');
campoMascara.value = '529982247';
campoMascara.selectionStart = 9;
app.mascaraCpf(campoMascara);
check('máscara ao digitar', campoMascara.value === '529.982.247', campoMascara.value);

// ---------- Cadastro do paciente ----------
fontes = [{ id: 2, nome: 'Particular', tipo: 'variavel', valorFixo: null, percentual: '70' }];
pacientes = [];
lancamentos = [];
els.pacNome.value = 'Ana Silva';
els.pacFonte.value = '2';
els.pacValor.value = '180,00';
els.pacCpf.value = '529.982.247-25';
pacientesModulo.salvar();
check('salvar paciente com CPF válido', pacientes.length === 1);
check('CPF guardado só com números', pacientes[0].cpf === '52998224725', pacientes[0].cpf);

els.pacCpf.value = '111.111.111-11';
pacientesModulo.salvar();
check('CPF inválido impede o cadastro', pacientes.length === 1 && pacientes[0].cpf === '52998224725');
els.pacCpf.value = '529.982.247-25';

pacientesModulo.editar(pacientes[0].id);
check('edição mostra CPF formatado', els.pacCpf.value === '529.982.247-25', els.pacCpf.value);
pacientesRender();
const linhaPaciente = (els.tbodyPacientes.children[0] || { innerHTML: '' }).innerHTML;
check('tabela mostra o CPF', linhaPaciente.includes('CPF 529.982.247-25'), linhaPaciente.slice(0, 200));
pacientesModulo.buscar('529982');
check('busca encontra pelo CPF', els.pacBuscaResumo.textContent.includes('1 paciente'));
pacientesModulo.limparBusca();

// ---------- Preparo do recibo ----------
dadosProfissional = { nome: 'Lívia Ferreira', crp: '04/74163', cpf: '123.456.789-00', assinatura: '' };
const l = {
  id: 902, data: hojeStr, horario: '14:00', paciente: 'Ana Silva', tipo: 'normal',
  fonteId: 2, valor: 250, pagamento: 'pix', status: 'pago', suaParte: 175, presenca: 'compareceu'
};
lancamentos = [l];
recibosModulo.abrir(902);
check('modal traz o CPF do cadastro', els.reciboCpfPaciente.value === '529.982.247-25', els.reciboCpfPaciente.value);
check('id do atendimento está no modal', els.reciboLancamentoId.value === '902');
check('resumo mostra paciente, data e valor', els.reciboResumo.innerHTML.includes('Ana Silva') &&
  els.reciboResumo.innerHTML.includes('250,00'));
const texto = els.reciboTexto.value;
check('texto traz nome e CPF', texto.includes('Ana Silva') && texto.includes('529.982.247-25'));
check('texto traz valor e CRP', texto.includes('250,00') && texto.includes('CRP 04/74163'));
check('texto traz tipo e data', texto.includes('atendimento psicológico') && texto.includes(formatarData(hojeStr)));

els.reciboCpfPaciente.value = '52998224725';
recibosModulo.atualizarTexto();
check('atualizar texto usa o CPF digitado', els.reciboTexto.value.includes('529.982.247-25'));
recibosModulo.copiarPreparado();
check('copiar texto funcionou', copiado.includes('Ana Silva') && copiado.includes('529.982.247-25'));

recibosModulo.abrirReceita();
check('botão abre o e-CAC da Receita', urlAberta.includes('receita.fazenda.gov.br'), urlAberta);

// ---------- Código e envio ----------
check('salvar sem código é recusado', recibosModulo.salvarCodigo() === false && !l.recibo);
els.reciboCodigo.value = 'REC-2026-ABC123';
els.reciboDataEmissao.value = hojeStr;
check('salvar código', recibosModulo.salvarCodigo() === true && l.recibo.codigo === 'REC-2026-ABC123');
check('CPF também fica no recibo', l.recibo.cpf === '52998224725');
check('emissão fica registrada na trilha', trilha.some(x => x.acao === 'Recibo oficial registrado'));
check('status mostra código salvo', els.reciboStatus.textContent.includes('Código salvo'));
check('tabela passa a mostrar Recibo salvo', renderizou > 0);

urlAberta = '';
recibosModulo.marcarEnviado();
check('marcar enviado grava a data', l.recibo.enviadoEm === hojeStr);
check('envio entra na trilha', trilha.some(x => x.acao === 'Recibo enviado ao paciente'));
check('WhatsApp leva o código de verificação',
  decodeURIComponent(urlAberta).includes('REC-2026-ABC123') && urlAberta.includes('wa.me'),
  decodeURIComponent(urlAberta).slice(0, 120));
check('status mostra enviado', els.reciboStatus.textContent.includes('Enviado ao paciente'));
check('texto do envio não traz CPF', !decodeURIComponent(urlAberta).includes('529.982'));

// ---------- Comprovante simples ----------
recibosModulo.gerar(902);
const comprovante = els.areaImpressao.innerHTML;
check('comprovante diz que não é oficial',
  comprovante.includes('COMPROVANTE SIMPLES') && comprovante.includes('sem validade oficial'));
check('comprovante não se chama RECIBO', !comprovante.includes('>RECIBO<'));

// ---------- Backup / nuvem ----------
const copia = backupModulo.montarDados();
check('backup sobe para versão 6', copia.versao === 6);
const normal = backupModulo.normalizar(JSON.parse(JSON.stringify(copia)));
check('recibo sobrevive ao backup', normal.versao === 6 && normal.lancamentos[0].recibo.codigo === 'REC-2026-ABC123' &&
  normal.lancamentos[0].recibo.enviadoEm === hojeStr);
check('cpf do paciente sobrevive ao backup', normal.pacientes[0].cpf === '52998224725');

const hostil = JSON.parse(JSON.stringify(copia));
hostil.lancamentos[0].recibo = {
  codigo: { toString: 'injeção' },
  cpf: 'abc52998224725xyz',
  emitidoEm: '2026-99-99',
  enviadoEm: hojeStr,
  onclick: 'alert(1)'
};
const limpo = backupModulo.normalizar(hostil).lancamentos[0].recibo;
check('código hostil vira texto', typeof limpo.codigo === 'string' && limpo.codigo.length <= 80);
check('cpf hostil fica só com números', limpo.cpf === '52998224725', limpo.cpf);
check('data inválida é descartada', limpo.emitidoEm === '');
check('chaves extras são removidas', !('onclick' in limpo), Object.keys(limpo).join(','));

const antigo = {
  app: 'saas-livia', versao: 5, fontes: [], pacientes: [], evolucoes: [],
  lancamentos: [{ id: 7, data: hojeStr, valor: 10 }], dadosProfissional: {}, criptografia: {}
};
const antigoNormal = backupModulo.normalizar(antigo);
check('backup antigo ainda é aceito', antigoNormal.versao === 6 && !antigoNormal.lancamentos[0].recibo);

// ---------- Arquivos ----------
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const la = fs.readFileSync(base + 'lancamentos.js', 'utf8');
const hj = fs.readFileSync(base + 'hoje.js', 'utf8');
const si = fs.readFileSync(base + 'situacao.js', 'utf8');
const sw = fs.readFileSync(raiz + 'sw.js', 'utf8');
const notas = fs.readFileSync(raiz + 'RELEASE_NOTES_v1.4.0.md', 'utf8');
check('modal de preparo existe no HTML', html.includes('id="modalPrepararRecibo"') && html.includes('id="pacCpf"'));
check('botões abrem o preparo, não imprimem direto',
  la.includes('recibosModulo.abrir(') && hj.includes('recibosModulo.abrir(') && si.includes('recibosModulo.abrir('));
check('service worker atualizou o cache', sw.includes('saatendimentos-v5'));
check('notas da v1.4.0 existem', notas.includes('v1.4.0') && notas.includes('Receita Federal'));

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas ? 1 : 0);
