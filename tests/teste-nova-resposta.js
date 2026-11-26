/* Teste do selo "Nova resposta" no painel da psicóloga */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const raiz = path.resolve(__dirname, '..') + '/';
const sql = fs.readFileSync(raiz + 'supabase/schema.sql', 'utf8');
const css = fs.readFileSync(raiz + 'css/style.css', 'utf8');

function el(id) {
  const filhos = [];
  const e = {
    id: id || '', value: '', textContent: '', _html: '', style: {}, className: '', files: [],
    children: filhos,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c) { if (this._s.has(c)) { this._s.delete(c); return false; } this._s.add(c); return true; }
    },
    addEventListener() {}, appendChild(c) { filhos.push(c); }, removeChild() {},
    click() {}, reset() {}, focus() {}, select() {}, setSelectionRange() {}, scrollIntoView() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; }
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); if (v === '') filhos.length = 0; }
  });
  return e;
}

const els = {};
const pedidos = [];
const avisos = [];
const modais = [];
const lidos = {};
const mensagens = [
  { id: 'm1', autor: 'profissional', texto: 'Olá, Ana!', criado_em: '2026-11-25T10:00:00Z',
    lido_em: '2026-11-25T11:00:00Z' },
  { id: 'm2', autor: 'paciente', texto: 'Obrigada, doutora!', criado_em: '2026-11-26T09:00:00Z',
    lido_em: null },
  { id: 'm3', autor: 'paciente', texto: 'Posso remarcar?', criado_em: '2026-11-26T09:05:00Z',
    lido_em: null }
];

global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  createElement(tag) { return el(tag); },
  querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() {},
  body: { appendChild() {}, removeChild() {} },
  execCommand() { return true; }
};
global.window = global;
global.addEventListener = () => {};
global.confirm = () => true;
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.escapeHtml = function(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
global.formatarCpf = v => String(v);
global.formatarData = v => String(v);
global.formatarMoeda = v => 'R$ ' + v;
global.formatarTelefone = v => String(v);
global.cpfValido = () => true;
global.Store = { salvar() {}, carregar() {} };
global.app = {
  toast(m) { avisos.push(m); },
  abrirModal(id) { modais.push(id); },
  fecharModal() {},
  botaoAcao(rotulo, onclick) {
    return '<button onclick="' + onclick + '">' + rotulo + '</button>';
  }
};
global.Backend = {
  configurado() { return true; },
  conectado() { return true; },
  usuario() { return { id: 'prof-1' }; },
  base() { return 'https://teste.supabase.co'; },
  headers() { return { apikey: 'anon', 'Content-Type': 'application/json', Authorization: 'Bearer prof' }; },
  _resposta(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw new Error(d.message || 'Erro');
      return d;
    });
  }
};
global.fetch = function(url, opcoes) {
  pedidos.push({ url: String(url), opcoes: opcoes || {} });
  function resposta(dados) {
    return Promise.resolve({ ok: true, json: function() { return Promise.resolve(dados); } });
  }
  if (opcoes && opcoes.method === 'PATCH') {
    const id = String(url).split('id=eq.')[1] || '';
    lidos[id] = true;
    return resposta([{ id: id }]);
  }
  if (String(url).indexOf('portal_pacientes?select=id,paciente_id') >= 0) {
    return resposta([{ id: 'pac-1', paciente_id: 1 }]);
  }
  if (String(url).indexOf('portal_pacientes?select=id') >= 0) return resposta([{ id: 'pac-1' }]);
  if (String(url).indexOf('autor=eq.paciente&lido_em=is.null') >= 0) {
    return resposta(mensagens.filter(function(m) {
      return m.autor === 'paciente' && !lidos[m.id];
    }).map(function(m) { return { id: m.id, paciente_portal_id: 'pac-1' }; }));
  }
  if (String(url).indexOf('portal_recados?select=id,autor,texto,criado_em,lido_em') >= 0) {
    return resposta(mensagens.map(function(m) {
      return Object.assign({}, m, { lido_em: lidos[m.id] ? '2026-11-26T12:00:00Z' : m.lido_em });
    }));
  }
  return resposta([]);
};

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
const esperar = () => new Promise(function(resolve) { setTimeout(resolve, 15); });

['data.js', 'pacientes.js'].forEach(function(arquivo) {
  vm.runInThisContext(fs.readFileSync(raiz + 'js/' + arquivo, 'utf8'), { filename: arquivo });
});
pacientes = [{ id: 1, nome: 'Ana Silva' }];

(async function() {
  console.log('\n[1] Banco e visual');
  check('política permite a profissional marcar como lida',
    sql.includes('create policy "Profissional marca recado como lido"') &&
    sql.indexOf('create policy "Profissional marca recado como lido"') <
      sql.indexOf('-- ---------- 4.4 Recibos'),
  );
  const blocoPolitica = sql.slice(sql.indexOf('create policy "Profissional marca recado como lido"'));
  check('política usa o vínculo profissional',
    blocoPolitica.slice(0, 700).includes('p.profissional_id = auth.uid()'));
  check('permissão de atualizar lido_em existe', sql.includes('grant update (lido_em)'));
  check('CSS do selo existe', css.includes('.selo-nova-resposta-inline') &&
    css.includes('.selo-nova-resposta {'));

  pacientesRender();
  await esperar();
  check('espaço do selo existe na linha do paciente',
    els.tbodyPacientes.children[0].innerHTML.includes('id="seloRecados-1"'));

  console.log('\n[2] Contagem e pintura do selo');
  const busca = pedidos.filter(p => p.url.includes('autor=eq.paciente&lido_em=is.null'))[0];
  check('busca só respostas não lidas da paciente', !!busca &&
    busca.url.includes('autor=eq.paciente') && busca.url.includes('lido_em=is.null'));
  check('selo mostra quantidade', els['seloRecados-1'].textContent === 'Nova resposta (2)',
    els['seloRecados-1'].textContent);
  check('selo está visível', els['seloRecados-1'].style.display === 'inline-block',
    els['seloRecados-1'].style.display);
  check('sem service_role', !JSON.stringify(pedidos).includes('service_role'));

  console.log('\n[3] Selo dentro da conversa');
  pacientesModulo._naoLidos = {};
  pacientesModulo._renderRecadosProf(mensagens);
  let html = els.portalRecadosProfLista.innerHTML;
  check('resposta não lida ganha o selo', html.includes('selo-nova-resposta-inline'));
  check('mensagem da profissional não ganha selo',
    html.indexOf('Olá, Ana!') < html.indexOf('Nova resposta') ||
    !html.includes('Você ·'));

  console.log('\n[4] Abrir conversa marca como lida');
  const patchesAntes = pedidos.filter(p => p.opcoes.method === 'PATCH').length;
  pacientesModulo.abrirRecadosPortal(1);
  await esperar();
  await esperar();
  const patches = pedidos.filter(p => p.opcoes.method === 'PATCH');
  check('duas respostas marcadas como lidas', patches.length === patchesAntes + 2,
    String(patches.length - patchesAntes));
  check('PATCH envia lido_em', patches.length > patchesAntes &&
    JSON.parse(patches[patches.length - 1].opcoes.body).lido_em);
  check('modal de recados abriu', modais.includes('modalPortalRecados'));
  check('selo da lista apagado após a leitura', els['seloRecados-1'].textContent === '',
    els['seloRecados-1'].textContent);

  html = els.portalRecadosProfLista.innerHTML;
  check('selo some da conversa após ler', !html.includes('Nova resposta'), html.slice(-120));

  console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
  process.exit(falhas === 0 ? 0 : 1);
})().catch(function(erro) {
  console.log('ERRO ' + (erro && erro.stack ? erro.stack : erro));
  process.exit(1);
});
