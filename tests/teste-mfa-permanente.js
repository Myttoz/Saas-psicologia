/* Teste focado: botão permanente de MFA, geração, confirmação e 2º fator */
const fs = require('fs');
const vm = require('vm');
const base = require('path').resolve(__dirname, '..') + '/js/';

function el(id) {
  const children = [];
  const e = {
    id: id || '', value: '', textContent: '', _html: '', style: {}, className: '', files: [],
    children, onclick: null,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c) { if (this._s.has(c)) { this._s.delete(c); return false; } this._s.add(c); return true; }
    },
    addEventListener() {}, appendChild(c) { children.push(c); }, removeChild() {}, setAttribute() {},
    click() {}, reset() {}, focus() {}, setSelectionRange() {}, scrollIntoView() {},
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
  readyState: 'complete',
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() {}, createElement(tag) { return el(tag); }, body: el('body')
};
const local = {};
global.localStorage = {
  getItem: k => (k in local ? local[k] : null),
  setItem: (k, v) => { local[k] = String(v); },
  removeItem: k => { delete local[k]; }
};
const sessaoMem = {};
global.sessionStorage = {
  getItem: k => (k in sessaoMem ? sessaoMem[k] : null),
  setItem: (k, v) => { sessaoMem[k] = String(v); },
  removeItem: k => { delete sessaoMem[k]; }
};
global.window = global;
global.addEventListener = () => {};
global.setTimeout = () => 0;
global.clearTimeout = () => {};
global.confirm = () => true;

const jwt = payload => 'x.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.z';
const tokenAal1 = jwt({ sub: 'u1', aal: 'aal1', exp: Math.floor(Date.now() / 1000) + 3600 });
const tokenAal2 = jwt({ sub: 'u1', aal: 'aal2', exp: Math.floor(Date.now() / 1000) + 3600 });

let chamadas = [];
global.fetch = function(url, opcoes) {
  chamadas.push({ url, corpo: JSON.parse((opcoes && opcoes.body) || '{}') });
  if (url.indexOf('/auth/v1/factors') !== -1 && url.indexOf('/challenge') === -1 && url.indexOf('/verify') === -1) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({
      id: 'fator-' + chamadas.length,
      totp: { qr_code: '<svg></svg>', secret: 'SEGREDO-TESTE' }
    }) });
  }
  if (url.indexOf('/challenge') !== -1) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'desafio-1' }) });
  }
  if (url.indexOf('/verify') !== -1) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({
      access_token: tokenAal2,
      refresh_token: 'refresh-2',
      user: { id: 'u1', email: 'conta@teste.com', factors: [
        { id: 'fator-2', status: 'verified', factor_type: 'totp' }
      ] }
    }) });
  }
  return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
};

['config.js', 'cripto.js', 'backend.js', 'app.js'].forEach(f =>
  vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
const flush = () => new Promise(resolve => setImmediate(resolve));

async function main() {
  CONFIG.usarBackend = true;
  CONFIG.supabaseUrl = 'https://projeto.supabase.co';
  CONFIG.supabaseAnonKey = 'chave-anon-teste';
  sessionStorage.setItem('saas_auth_token', tokenAal1);
  sessionStorage.setItem('saas_auth_usuario', JSON.stringify({
    id: 'u1', email: 'conta@teste.com', factors: []
  }));
  // Situação da usuária: tinha clicado em "Agora não".
  localStorage.setItem('saas_mfa_recusado', '1');

  // 1. Botão permanente ignora a recusa e abre no modo convite.
  Backend.abrirAtivacaoMfa();
  check('botão permanente limpou a recusa', localStorage.getItem('saas_mfa_recusado') === null);
  check('modal aberta', els.modalMfa.classList.contains('show-modal'));
  check('modo convite', Backend._modoMfa === 'convite');
  check('botão mostra "Gerar QR code"', els.mfaBotao.textContent === 'Gerar QR code');
  check('botão secundário é "Fechar"', els.mfaSecundario.textContent === 'Fechar');
  check('origem permanente marcada', Backend._mfaOrigemPermanent === true);

  // 2. O mesmo botão gera o QR (antes ele não fazia nada no modo enroll).
  chamadas = [];
  Backend.clicarMfa();
  await flush(); await flush();
  check('chamou a criação do fator', chamadas.some(c => c.url.indexOf('/auth/v1/factors') !== -1 && c.url.indexOf('/challenge') === -1));
  check('entrou no modo enroll', Backend._modoMfa === 'enroll');
  check('botão virou "Confirmar ativação"', els.mfaBotao.textContent === 'Confirmar ativação');
  check('campo do código apareceu', els.grupoMfaCodigo.style.display === 'block');
  check(' QR apareceu', els.mfaQr.style.display === '');
  check('segundo botão virou "Cancelar"', els.mfaSecundario.textContent === 'Cancelar');

  // 3. O mesmo botão confirma os 6 números e guarda o token aal2.
  els.mfaCodigo.value = '123456';
  chamadas = [];
  Backend.clicarMfa();
  await flush(); await flush(); await flush();
  check('chamou challenge', chamadas.some(c => c.url.indexOf('/challenge') !== -1));
  check('chamou verify', chamadas.some(c => c.url.indexOf('/verify') !== -1));
  check('token aal2 foi guardado', sessionStorage.getItem('saas_auth_token') === tokenAal2);
  check('modal foi fechada', !els.modalMfa.classList.contains('show-modal'));
  check('modo foi limpo', Backend._modoMfa === '');
  const sessaoAtual = { token: Backend.token(), usuario: Backend.usuario() };
  const precisa = await Backend.verificarMfa(sessaoAtual);
  check('sessão aal2 não pede outro código', precisa === false);

  // 4. Com um fator ativo, o botão serve para cadastrar o reserva.
  Backend.abrirAtivacaoMfa();
  check('abriu mesmo com fator ativo', els.modalMfa.classList.contains('show-modal'));
  check('nome do fator é de reserva', Backend._mfaNome === 'App de autenticação (reserva)');
  check('botão mostra "Gerar código de reserva"', els.mfaBotao.textContent === 'Gerar código de reserva');
  check('intro fala em reserva', /reserva/i.test(els.mfaIntro.textContent));
  Backend.mfaSecundario();
  check('fechar não grava recusa', localStorage.getItem('saas_mfa_recusado') === null);

  // 5. O convite automático continua respeitando "Agora não".
  Backend.recusarMfa();
  check('recusar grava a recusa', localStorage.getItem('saas_mfa_recusado') === '1');
  Backend.mostrarConviteMfaSeNecessario({ id: 'u1', factors: [] });
  check('convite automático não reaparece', !els.modalMfa.classList.contains('show-modal'));
  Backend.abrirAtivacaoMfa();
  check('botão permanente volta a abrir', els.modalMfa.classList.contains('show-modal'));

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
  process.exit(falhas ? 1 : 0);
}
main().catch(e => { console.error('ERRO INESPERADO', e); process.exit(1); });
