/* Teste simulado: configuração opcional, login, sincronização e publicação */
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
  querySelector() { return null; },
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
const sessao = {};
global.sessionStorage = {
  getItem: k => (k in sessao ? sessao[k] : null),
  setItem: (k, v) => { sessao[k] = String(v); },
  removeItem: k => { delete sessao[k]; }
};

let confirmar = true;
let filaConfirm = [];
global.confirm = () => (filaConfirm.length ? filaConfirm.shift() : confirmar);
global.window = global;
global.addEventListener = () => {};
global.setInterval = () => 1;
global.clearInterval = () => {};
let timers = [];
global.setTimeout = (fn) => { timers.push(fn); return timers.length; };
global.clearTimeout = (id) => { if (id) timers[id - 1] = null; };
function rodarTimers() { const lista = timers; timers = []; lista.forEach(f => f && f()); }
global.Blob = class {};
global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };

let chamadas = [];
let dadosRemotos = null;
let falharToken = false;
global.fetch = function(url, opcoes) {
  chamadas.push({ url, opcoes: opcoes || {} });
  if (url.indexOf('/auth/v1/token') !== -1) {
    if (falharToken) return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'invalid' }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({
      access_token: 'token-teste',
      user: { id: 'user-1', email: 'livia@teste.com' }
    }) });
  }
  if (url.indexOf('/auth/v1/user') !== -1) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'user-1' }) });
  }
  if (url.indexOf('/rest/v1/dados') !== -1) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(
      dadosRemotos ? [{ conteudo: dadosRemotos }] : []
    ) });
  }
  return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
};

const arquivos = ['config.js', 'data.js', 'backend.js', 'meses.js', 'hoje.js', 'seguranca.js',
  'app.js', 'pacientes.js', 'fontes.js', 'lancamentos.js', 'situacao.js', 'resumos.js',
  'backup.js', 'agenda.js', 'prontuario.js', 'whatsapp.js', 'recibos.js'];
arquivos.forEach(f => vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
const flush = () => new Promise(resolve => setImmediate(resolve));

async function main() {
  ['modalLogin', 'loginEmail', 'loginSenha', 'loginErro'].forEach(id => document.getElementById(id));

  // A configuração real já está preenchida no projeto. Guardamos uma cópia,
  // validamos abaixo e forçamos o modo local para testar o comportamento padrão.
  var configReal = {
    usarBackend: CONFIG.usarBackend,
    supabaseUrl: CONFIG.supabaseUrl,
    supabaseAnonKey: CONFIG.supabaseAnonKey
  };
  CONFIG.usarBackend = false;
  CONFIG.supabaseUrl = '';
  CONFIG.supabaseAnonKey = '';

  // ---------- modo local (padrão) ----------
  check('modo local não faz chamada quando desligado', CONFIG.usarBackend === false);
  chamadas = [];
  Backend.iniciar();
  check('sem chamada de rede quando desligado', chamadas.length === 0);
  check('não pede login quando desligado', !document.getElementById('modalLogin').classList.contains('show-modal'));

  fontes = [{ id: 1, nome: 'Clínica', percentual: 30 }];
  pacientes = [];
  lancamentos = [];
  evolucoes = [];
  dadosProfissional = { nome: '', crp: '', cpf: '', assinatura: '' };
  Store.salvar();
  rodarTimers();
  check('salvar local não envia nada', chamadas.length === 0);

  // ---------- ligar	nuvem ----------
  CONFIG.usarBackend = true;
  CONFIG.supabaseUrl = 'https://projeto.supabase.co/';
  CONFIG.supabaseAnonKey = 'chave-anon-teste';
  check('configuração reconhecida', Backend.configurado());
  check('barra final removida da URL', Backend.base() === 'https://projeto.supabase.co');
  check('cabeçalho leva a chave anon', Backend.headers(false).apikey === 'chave-anon-teste');

  chamadas = [];
  Backend.iniciar();
  check('sem sessão abre login', document.getElementById('modalLogin').classList.contains('show-modal'));
  check('login não chamou a rede ainda', chamadas.length === 0);

  // ---------- login ----------
  els.loginEmail.value = 'livia@teste.com';
  els.loginSenha.value = 'senha123';
  Backend.entrar();
  await flush();
  check('chamou endpoint de login', chamadas[0].url.indexOf('/auth/v1/token?grant_type=password') !== -1);
  check('enviou e-mail e senha', JSON.parse(chamadas[0].opcoes.body).email === 'livia@teste.com');
  check('token guardado', sessao.saas_auth_token === 'token-teste');
  check('usuário guardado', JSON.parse(sessao.saas_auth_usuario).id === 'user-1');
  check('login fecha modal', !document.getElementById('modalLogin').classList.contains('show-modal'));
  check('após login busca dados na nuvem', chamadas.some(c => c.url.indexOf('/rest/v1/dados') !== -1));

  // ---------- cabeçalhos autenticados ----------
  const h = Backend.headers(true);
  check('Bearer enviado', h.Authorization === 'Bearer token-teste');
  check('chave anon continua presente', h.apikey === 'chave-anon-teste');

  // ---------- carregar / salvar ----------
  dadosRemotos = { versao: 3, lancamentos: [{ id: 77 }], atualizadoEm: '2026-11-20T10:00:00.000Z' };
  chamadas = [];
  const carregado = await Backend.carregar();
  check('carregou conteúdo da nuvem', carregado.lancamentos[0].id === 77);
  check('filtra pelo usuário', chamadas[0].url.indexOf('user_id=eq.user-1') !== -1);

  chamadas = [];
  const enviou = await Backend.salvar(Backend.coletarDados());
  check('salvou na nuvem', enviou === true);
  check('usou POST', chamadas[0].opcoes.method === 'POST');
  check('upsert por user_id', chamadas[0].url.indexOf('on_conflict=user_id') !== -1);
  check('Prefer de merge', chamadas[0].opcoes.headers.Prefer.indexOf('merge-duplicates') !== -1);
  const corpo = JSON.parse(chamadas[0].opcoes.body);
  check('corpo tem user_id', corpo.user_id === 'user-1');
  check('corpo tem dados do sistema', Array.isArray(corpo.conteudo.fontes));
  check('corpo tem data de controle', !!corpo.conteudo.atualizadoEm);

  // ---------- debounce a partir do Store ----------
  chamadas = [];
  Store.salvar();
  check('salvar não envia na hora', chamadas.length === 0);
  rodarTimers();
  await flush();
  check('envia depois do intervalo', chamadas.length === 1);
  check('registrou data da sincronização', !!sessao.saas_sync_at);

  // ---------- nuvem é a fonte da verdade ----------
  lancamentos = [{ id: 1, valor: 10 }];
  dadosRemotos = { app: 'saas-livia', versao: 4, fontes: [], pacientes: [], lancamentos: [{ id: 88, valor: 99 }],
    evolucoes: [], dadosProfissional: {}, criptografia: { chave: '' },
    atualizadoEm: '2099-01-01T00:00:00.000Z' };
  chamadas = [];
  await Backend.sincronizarNoInicio();
  check('nuvem substitui os dados locais', lancamentos[0].id === 88);
  check('sincronização NÃO envia dados locais',
    !chamadas.some(c => c.opcoes.method === 'POST' && c.url.indexOf('/rest/v1/dados') !== -1));

  // Conta nova: começa vazia e grava o retrato vazio na nuvem.
  dadosRemotos = null;
  lancamentos = [{ id: 2, valor: 20 }];
  chamadas = [];
  await Backend.sincronizarNoInicio();
  check('conta nova começa vazia', lancamentos.length === 0);
  check('conta nova envia retrato vazio',
    chamadas.some(c => c.opcoes.method === 'POST' && c.url.indexOf('/rest/v1/dados') !== -1));

  // ---------- erro de login e sessão expirada ----------
  Backend.sair();
  delete sessao.saas_auth_token;
  delete sessao.saas_auth_usuario;
  falharToken = true;
  els.loginEmail.value = 'errado@teste.com';
  els.loginSenha.value = 'errada';
  Backend.entrar();
  await flush();
  check('senha errada mostra aviso', els.loginErro.textContent.indexOf('incorretos') !== -1);
  check('senha errada não guarda token', !sessao.saas_auth_token);
  falharToken = false;

  Backend.sair();
  check('sair limpa token', !sessao.saas_auth_token && !sessao.saas_auth_usuario);
  check('sair limpa timer', Backend._timer === null);
  timers = [];

  // ---------- arquivos de publicação ----------
  const sql = fs.readFileSync(raiz + 'supabase/schema.sql', 'utf8');
  check('SQL cria tabela', sql.includes('create table if not exists public.dados'));
  check('SQL liga RLS', sql.includes('enable row level security'));
  check('SQL tem policies de leitura/escrita',
    sql.includes('for select') && sql.includes('for insert') &&
    sql.includes('for update') && sql.includes('for delete'));

  const guia = fs.readFileSync(raiz + 'supabase/COMO_CONFIGURAR.md', 'utf8');
  check('guia explica chave anon', guia.includes('anon'));
  check('guia alerta sobre service_role', guia.includes('service_role'));

  const workflow = fs.readFileSync(raiz + '.github/workflows/deploy.yml', 'utf8');
  check('workflow publica no GitHub Pages', workflow.includes('actions/deploy-pages@v5'));
  check('workflow publica só arquivos do site', workflow.includes('cp -r css js assets _site/'));
  check('workflow não publica pasta pessoal', !workflow.includes('cp -r Livia'));

  const html = fs.readFileSync(raiz + 'index.html', 'utf8');
  check('HTML tem modal de login', html.includes('id="modalLogin"'));
  check('HTML carrega config antes de data',
    html.indexOf('js/config.js') < html.indexOf('js/data.js'));
  check('HTML carrega backend após data',
    html.indexOf('js/data.js') < html.indexOf('js/backend.js'));
  check('HTML tem link do manifesto', html.includes('rel="manifest"'));
  check('HTML não tem botão do Google', !/google/i.test(html));
  check('HTML explica que só a profissional cria contas',
    html.includes('Somente contas criadas pela profissional'));
  check('HTML tem logo na tela de login',
    html.includes('class="login-logo"'));
  check('título do login é só Bem-vinda',
    html.includes('>Bem-vinda<') && !html.includes('Bem-vinda de volta'));
  check('não existe atalho para entrar sem login',
    !html.includes('Continuar sem conectar') &&
    !html.includes("fecharModal('modalLogin')"));

  const appJs = fs.readFileSync(base + 'app.js', 'utf8');
  check('app inicia backend', appJs.includes('Backend.iniciar()'));
  check('app desconecta ao sair', appJs.includes('Backend.sair()'));
  check('app usa fundo próprio só no login',
    appJs.includes("id === 'modalLogin'") && appJs.includes("classList.add('login-fundo')"));
  check('app remove fundo próprio ao fechar',
    appJs.indexOf("remove('login-fundo')") > 0);
  check('clique fora / ESC não fecham o login',
    appJs.includes('loginVisivel') &&
    appJs.indexOf('if (this.loginVisivel()) return;') > 0);
  check('atalhos de teclado bloqueados no login',
    appJs.indexOf('if (app.loginVisivel()) return;') > 0);
  check('teclado não alcança o sistema por trás do login',
    appJs.includes('_setAppInerte(true)') && appJs.includes('_setAppInerte(false)'));

  const css = fs.readFileSync(raiz + 'css/style.css', 'utf8');
  check('CSS do login tem fundo opaco (sem blur)',
    css.includes('#overlay.login-fundo') && css.includes('backdrop-filter: none'));
  check('CSS não tem botão do Google', !css.includes('.btn-login-google'));
  check('HTML traz o campo de código MFA', html.includes('id="loginMfaCodigo"'));

  const backendJs = fs.readFileSync(base + 'backend.js', 'utf8');
  check('backend não abre login do Google',
    !backendJs.includes('/auth/v1/authorize?provider=google') && !backendJs.includes('processarRetorno()'));
  check('backend usa login por senha e MFA',
    backendJs.includes('/auth/v1/token?grant_type=password') &&
    backendJs.includes('/auth/v1/factors/'));
  // Comentários que AVISAM para não usar service_role são bons; o que não
  // pode existir é uma chave/atribuição real. Removemos os comentários antes.
  const codigoSemComentarios = backendJs
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const configJs = fs.readFileSync(base + 'config.js', 'utf8');
  check('credenciais sensíveis não ficam no site',
    !codigoSemComentarios.includes('client_secret') &&
    !codigoSemComentarios.includes('service_role') &&
    !/\b(service[_-]?role|client[_-]?secret)\s*[:=]/.test(configJs));

  // ---------- valida a configuração real que vai para o ar ----------
  CONFIG.usarBackend = configReal.usarBackend;
  CONFIG.supabaseUrl = configReal.supabaseUrl;
  CONFIG.supabaseAnonKey = configReal.supabaseAnonKey;
  check('nuvem ligada na configuração real', CONFIG.usarBackend === true);
  check('URL real sem o final /rest/v1/', !CONFIG.supabaseUrl.includes('/rest/v1/'));
  check('URL real termina com .supabase.co', /\.supabase\.co$/.test(CONFIG.supabaseUrl));
  check('chave real é anon (começa com eyJ)', CONFIG.supabaseAnonKey.indexOf('eyJ') === 0);
  check('chave real não é service_role', CONFIG.supabaseAnonKey.indexOf('service_role') === -1);
  check('Backend reconhece a configuração real', Backend.configurado());
  check('base real montada corretamente', Backend.base() === 'https://wrdkbafdzjsqonyidrwv.supabase.co');

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch(function(erro) {
  console.error(erro);
  process.exit(1);
});
