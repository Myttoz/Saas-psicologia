/* Teste do histórico de recibos no portal (lado da psicóloga e do paciente) */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const raiz = path.resolve(__dirname, '..') + '/';

function el(id) {
  const filhos = [];
  const e = {
    id: id || '', value: '', textContent: '', _html: '', style: {}, className: '',
    files: [], children: filhos,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c) { if (this._s.has(c)) { this._s.delete(c); return false; } this._s.add(c); return true; }
    },
    addEventListener() {}, appendChild(c) { filhos.push(c); }, removeChild() {},
    click() { downloads.push(this.download); }, reset() {}, focus() {}, select() {},
    setSelectionRange() {}, scrollIntoView() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; }
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); if (v === '') filhos.length = 0; }
  });
  return e;
}

const downloads = [];
const els = {};
const avisos = [];
const modais = [];
const pedidos = [];
const base64Recibo = Buffer.from('PDF-DE-TESTE').toString('base64');
const listaRecibos = [{
  id: 'rec-1', nome: 'recibo-oficial.pdf', numero: 'Ref. 902', codigo: 'AB12CD34',
  criado_em: '2026-11-26T10:00:00Z'
}];

global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  createElement(tag) { return el(tag); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: { appendChild() {}, removeChild() {} },
  execCommand() { return true; }
};
global.window = global;
global.addEventListener = () => {};
global.confirm = () => true;
global.atob = function(s) { return Buffer.from(s, 'base64').toString('binary'); };
global.btoa = function(s) { return Buffer.from(s, 'binary').toString('base64'); };
global.URL = { createObjectURL: () => 'blob:teste', revokeObjectURL() {} };
global.Blob = class { constructor(partes) { this.partes = partes; } };
global.FileReader = class {
  readAsDataURL(arquivo) { this.onload({ target: { result: arquivo._conteudo } }); }
};
const memoria = {};
global.localStorage = {
  getItem(k) { return k in memoria ? memoria[k] : null; },
  setItem(k, v) { memoria[k] = String(v); },
  removeItem(k) { delete memoria[k]; }
};
global.sessionStorage = {
  getItem(k) { return k in memoria ? memoria[k] : null; },
  setItem(k, v) { memoria[k] = String(v); },
  removeItem(k) { delete memoria[k]; }
};

global.CONFIG = { supabaseUrl: 'https://teste.supabase.co', supabaseAnonKey: 'anon' };
global.Backend = {
  configurado() { return true; },
  conectado() { return true; },
  usuario() { return { id: 'prof-1' }; },
  base() { return 'https://teste.supabase.co'; },
  headers() { return { apikey: 'anon', Authorization: 'Bearer prof' }; },
  _resposta(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw new Error(d.message || 'Erro');
      return d;
    });
  }
};
global.app = {
  toast(m) { avisos.push(m); },
  abrirModal(id) { modais.push(id); },
  fecharModal() {},
  botaoAcao() { return ''; }
};
global.escapeHtml = function(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
global.formatarCpf = function(v) { return String(v); };
global.formatarData = function(v) { return String(v); };
global.formatarMoeda = function(v) { return 'R$ ' + v; };
global.formatarTelefone = function(v) { return String(v); };
global.cpfValido = () => true;
global.Store = { salvar() {}, carregar() {} };

global.fetch = function(url, opcoes) {
  pedidos.push({ url: String(url), opcoes: opcoes || {} });
  function resposta(dados) {
    return Promise.resolve({ ok: true, json: function() { return Promise.resolve(dados); } });
  }
  if (url.indexOf('portal_pacientes?select=id') >= 0) return resposta([{ id: 'pac-1' }]);
  if (url.indexOf('portal_recibos?select=nome,conteudo_base64') >= 0) {
    return resposta([{ nome: 'recibo-oficial.pdf', conteudo_base64: base64Recibo }]);
  }
  if (url.indexOf('portal_recibos?select=id,nome') >= 0) return resposta(listaRecibos);
  return resposta([]);
};

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
const esperar = () => new Promise(function(resolve) { setTimeout(resolve, 10); });

['data.js', 'pacientes.js', 'portal-app.js', 'recibos.js'].forEach(function(arquivo) {
  vm.runInThisContext(fs.readFileSync(raiz + 'js/' + arquivo, 'utf8'), { filename: arquivo });
});
pacientes = [{ id: 1, nome: 'Ana Silva', email: 'ana@teste.com' }];
lancamentos = [];
dadosProfissional = { nome: 'Lívia', crp: '04/74163', cpf: '', assinatura: '' };

(async function() {
  console.log('\n[1] Lado da psicóloga');
  pacientesModulo.abrirRecibosPortal(1);
  await esperar();
  check('modal de recibos aberta', modais.includes('modalPortalRecibos'));
  check('buscou o vínculo do paciente',
    pedidos.some(p => p.url.includes('/portal_pacientes?select=id')));
  const listagem = pedidos.filter(p => p.url.includes('/portal_recibos?select=id,nome'))[0];
  check('lista filtrada pelo paciente da psicóloga',
    !!listagem && listagem.url.includes('paciente_portal_id=eq.pac-1') &&
    listagem.url.includes('order=criado_em.desc'));
  const htmlProf = els.portalRecibosProfLista.innerHTML;
  check('mostra nome e código do recibo', htmlProf.includes('recibo-oficial.pdf') &&
    htmlProf.includes('AB12CD34'), htmlProf.slice(0, 120));
  check('tem botões de baixar e excluir',
    htmlProf.includes('pacientesModulo.baixarReciboPortal(') &&
    htmlProf.includes('pacientesModulo.excluirReciboPortal('));

  // envio de um PDF pelo arquivo
  els.portalReciboArquivo.files = [{
    name: 'recibo-2.pdf', type: 'application/pdf', size: 2048,
    _conteudo: 'data:application/pdf;base64,SGVsbG8='
  }];
  pacientesModulo.guardarReciboPortal(els.portalReciboArquivo);
  await esperar();
  const post = pedidos.filter(p => p.opcoes.method === 'POST').pop();
  check('PDF enviado por POST para portal_recibos', !!post && post.url.endsWith('/portal_recibos'));
  const corpo = post ? JSON.parse(post.opcoes.body) : {};
  check('payload usa vínculo, nome e base64',
    corpo.paciente_portal_id === 'pac-1' && corpo.nome === 'recibo-2.pdf' &&
    corpo.conteudo_base64 === 'SGVsbG8=', JSON.stringify(corpo).slice(0, 90));
  check('sem service_role em nenhuma chamada',
    !JSON.stringify(pedidos).includes('service_role'));

  // rejeita arquivo que não é PDF
  els.portalReciboArquivo.files = [{ name: 'foto.png', type: 'image/png', size: 100 }];
  pacientesModulo.guardarReciboPortal(els.portalReciboArquivo);
  await esperar();
  check('arquivo que não é PDF é recusado',
    els.portalRecibosProfStatus.textContent.includes('Escolha um arquivo PDF'),
    els.portalRecibosProfStatus.textContent);

  downloads.length = 0;
  pacientesModulo.baixarReciboPortal('rec-1');
  await esperar();
  check('busca o PDF pelo id e pelo paciente',
    pedidos.some(p => p.url.includes('id=eq.rec-1') && p.url.includes('paciente_portal_id=eq.pac-1')));
  check('psicóloga consegue baixar o PDF', downloads.includes('recibo-oficial.pdf'));

  const totalAntes = pedidos.length;
  pacientesModulo.excluirReciboPortal('rec-1');
  await esperar();
  check('exclusão filtra id e paciente', pedidos.some(p => p.opcoes.method === 'DELETE' &&
    p.url.includes('id=eq.rec-1') && p.url.includes('paciente_portal_id=eq.pac-1')));
  check('lista recarrega após excluir', pedidos.length > totalAntes + 1);

  console.log('\n[2] Lado do paciente');
  PortalApp._pacientePortalId = 'pac-1';
  downloads.length = 0;
  await PortalApp._carregarRecibos();
  const listagemPaciente = pedidos.filter(p => p.url.includes('/portal_recibos?select=id,nome'))[1];
  check('paciente consulta só o próprio vínculo',
    !!listagemPaciente && listagemPaciente.url.includes('paciente_portal_id=eq.pac-1') &&
    listagemPaciente.url.includes('order=criado_em.desc'));
  const htmlPaciente = els.portalRecibosLista.innerHTML;
  check('portal mostra o recibo e o botão de baixar',
    htmlPaciente.includes('recibo-oficial.pdf') && htmlPaciente.includes('PortalApp.abrirRecibo('),
    htmlPaciente.slice(0, 120));
  check('contador do portal atualizado', els.portalRecibosTag.textContent === '1',
    els.portalRecibosTag.textContent);
  check('sem HTML cru vindo do banco', !htmlPaciente.includes('<script>'));

  PortalApp.abrirRecibo('rec-1');
  await esperar();
  check('paciente baixa com filtro do próprio vínculo', downloads.includes('recibo-oficial.pdf'));
  check('aviso de download', els.portalMsgLogado.textContent.includes('Recibo baixado'),
    els.portalMsgLogado.textContent);

  // texto hostil no nome do arquivo precisa ser escapado
  PortalApp._renderRecibos([{ id: 'rec-2', nome: '<img src=x onerror=alert(1)>', criado_em: '' }]);
  check('nome do arquivo escapado no portal',
    !els.portalRecibosLista.innerHTML.includes('<img src=x') &&
    els.portalRecibosLista.innerHTML.includes('&lt;img'));

  console.log('\n[3] Envio direto do comprovante');
  check('bytes para base64', recibosModulo._bytesParaBase64(new Uint8Array([1, 2, 3])) === 'AQID');
  recibosModulo.pdfDoComprovante = function() {
    return Promise.resolve({
      bytes: new Uint8Array([1, 2, 3]), nome: 'comprovante-ana-1.pdf',
      lancamento: { id: 1, paciente: 'Ana Silva', recibo: { codigo: 'ZZ99' } }
    });
  };
  recibosModulo.enviarAoPortal();
  await esperar();
  const postDireto = pedidos.filter(p => p.opcoes.method === 'POST').pop();
  const corpoDireto = postDireto ? JSON.parse(postDireto.opcoes.body) : {};
  check('comprovante vai para o portal com número e código',
    corpoDireto.paciente_portal_id === 'pac-1' && corpoDireto.numero === 'Ref. 1' &&
    corpoDireto.codigo === 'ZZ99' && corpoDireto.conteudo_base64 === 'AQID',
    JSON.stringify(corpoDireto).slice(0, 100));

  console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
  process.exit(falhas === 0 ? 0 : 1);
})().catch(function(erro) {
  console.log('ERRO ' + (erro && erro.stack ? erro.stack : erro));
  process.exit(1);
});
