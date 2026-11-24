/* Teste: tela de login não "pisca" ao recarregar + feed com todas as tags */
const fs = require('fs');
const vm = require('vm');
const cp = require('child_process');
const raiz = require('path').resolve(__dirname, '..') + '/';
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const css = fs.readFileSync(raiz + 'css/style.css', 'utf8');
const appFonte = fs.readFileSync(raiz + 'js/app.js', 'utf8');
const backFonte = fs.readFileSync(raiz + 'js/backend.js', 'utf8');
const deploy = fs.readFileSync(raiz + '.github/workflows/deploy.yml', 'utf8');
const release = fs.readFileSync(raiz + '.github/workflows/release.yml', 'utf8');
const feedPy = fs.readFileSync(raiz + 'scripts/gerar_feed.py', 'utf8');

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

// ---------- 1. HTML/CSS chegam já protegidos ----------
check('<html> começa bloqueado', /<html[^>]*class="app-bloqueado"/.test(html));
check('overlay já vem com fundo opaco e aberto',
  /<div class="overlay login-fundo open"[^>]*id="overlay"/.test(html));
check('modal de login já vem aberta',
  /<div class="modal modal-login show-modal"[^>]*id="modalLogin"/.test(html));
check('CSS esconde o app até o JS liberar',
  /html\.app-bloqueado\s+\.app\s*\{\s*visibility:\s*hidden/.test(css));
check('abrir modalLogin bloqueia de novo',
  /id === 'modalLogin'[\s\S]{0,260}html\.classList\.add\('app-bloqueado'\)/.test(appFonte));
check('fechar modalLogin libera o app',
  /id === 'modalLogin'[\s\S]{0,260}html\.classList\.remove\('app-bloqueado'\)/.test(appFonte));
check('modo local libera o app',
  /if \(!this\.configurado\(\)\)[\s\S]{0,220}app\.fecharModal\('modalLogin'\)/.test(backFonte));
check('sessão válida libera o app depois de sincronizar',
  /return self\.sincronizarNoInicio\(\)\.then\(function\(\)[\s\S]{0,120}app\.fecharModal\('modalLogin'\)/.test(backFonte));

// ---------- 2. Comportamento real do JS com stubs ----------
function el(id) {
  const e = {
    id: id || '', value: '', textContent: '', style: {}, children: [],
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    addEventListener() {}, appendChild(c) { e.children.push(c); }, removeChild() {},
    click() {}, reset() {}, focus() {}, setSelectionRange() {}, scrollIntoView() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; }
  };
  return e;
}
const els = {};
global.document = {
  readyState: 'complete',
  documentElement: el('html'),
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() {}, createElement(tag) { return el(tag); }, body: el('body')
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const sessaoMem = {};
global.sessionStorage = {
  getItem: k => (k in sessaoMem ? sessaoMem[k] : null),
  setItem: (k, v) => { sessaoMem[k] = String(v); }, removeItem: k => { delete sessaoMem[k]; }
};
global.window = global;
global.addEventListener = () => {};
global.setTimeout = () => 0;
global.clearTimeout = () => {};
global.confirm = () => true;
global.backupModulo = { aplicarVazio() {}, _aplicarDados() {} };
global.segurancaModulo = {};
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) });

['config.js', 'app.js', 'backend.js'].forEach(f =>
  vm.runInThisContext(fs.readFileSync(raiz + 'js/' + f, 'utf8'), { filename: f }));

const htmlEl = document.documentElement;
htmlEl.classList.add('app-bloqueado');
app.abrirModal('modalLogin');
check('abrir login mantém bloqueado', htmlEl.classList.contains('app-bloqueado'));
app.fecharModal('modalLogin');
check('fechar login libera', !htmlEl.classList.contains('app-bloqueado'));
app.abrirModal('modalLogin');
check('reabrir login bloqueia outra vez', htmlEl.classList.contains('app-bloqueado'));

CONFIG.usarBackend = false;
Backend.iniciar();
check('sem nuvem não fica preso na tela de login', !htmlEl.classList.contains('app-bloqueado'));

CONFIG.usarBackend = true;
CONFIG.supabaseUrl = 'https://projeto.supabase.co';
CONFIG.supabaseAnonKey = 'chave-teste';
const jwt = 'x.' + Buffer.from(JSON.stringify({
  sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600
})).toString('base64url') + '.z';
sessionStorage.setItem('saas_auth_token', jwt);
sessionStorage.setItem('saas_auth_usuario', JSON.stringify({ id: 'u1', email: 'a@b.com', factors: [] }));
app.abrirModal('modalLogin');
const flush = () => new Promise(r => setImmediate(r));

(async () => {
  await Backend.verificarSessao();
  await flush(); await flush();
  check('sessão válida libera o sistema', !htmlEl.classList.contains('app-bloqueado'));
  check('login foi fechado', !els.modalLogin.classList.contains('show-modal'));

  // ---------- 3. Feed e workflows ----------
  check('feed usa tags do git', /for-each-ref/.test(feedPy) && /refs\/tags/.test(feedPy));
  check('deploy busca todas as tags', /fetch-depth:\s*0/.test(deploy));
  check('deploy gera o feed antes de montar o pacote',
    deploy.indexOf('Gerar o feed com todas as versões') < deploy.indexOf('Montar o pacote'));
  check('release pede as tags antes de gerar', /git fetch --tags --force/.test(release));
  check('release tem permissão para disparar workflow', /actions:\s*write/.test(release));
  check('release manda publicar no Pages', /gh workflow run deploy\.yml/.test(release));

  const rss = fs.readFileSync(raiz + 'releases.rss', 'utf8');
  const titulos = Array.from(rss.matchAll(/<title>(v\d+\.\d+\.\d+)<\/title>/g)).map(m => m[1]);
  const tags = cp.execSync('git tag --list "v[0-9]*.[0-9]*.[0-9]*" --sort=-v:refname',
    { cwd: raiz, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  // A tag nova e a atualização do feed são dois commits seguidos; por isso o
  // teste exige que as versões do feed existam, não que estejam em igualdade.
  check('feed local traz versões publicadas',
    titulos.length > 0 && titulos.every(t => tags.indexOf(t) !== -1) && tags.indexOf(titulos[0]) !== -1,
    'feed=' + titulos.join(', ') + ' | tags=' + tags.join(', '));

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO INESPERADO', e); process.exit(1); });
