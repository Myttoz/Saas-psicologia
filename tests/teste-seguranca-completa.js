/* Bateria nova (2026): AES-GCM real, MFA, auditoria, nuvem como fonte da verdade.
   Roda com Node 18 + crypto.webcrypto. Todas as APIs são assíncronas. */
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');

const DIR = require('path').resolve(__dirname, '..') + '/';
const BASE = DIR + 'js/';

// ---------- ambiente ----------
const els = {};
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
    addEventListener() {}, appendChild(c) { children.push(c); },
    removeChild(c) { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); },
    click() {}, reset() {}, focus() {}, select() {}, setSelectionRange() {}, scrollIntoView() {},
    setAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    contains() { return false; }, getAttribute() { return ''; }
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); if (v === '') children.length = 0; }
  });
  return e;
}
const titulos = {};
global.window = global;
global.document = {
  readyState: 'complete',
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector(sel) {
    if (sel && sel.indexOf('.modal-title') !== -1) {
      const k = sel.split(' ')[0];
      return titulos[k] || (titulos[k] = el('titulo'));
    }
    if (sel && sel.indexOf('.page.active') !== -1) return { id: 'page-hoje' };
    return null;
  },
  querySelectorAll() { return []; },
  addEventListener() {}, createElement(t) { return el(t); }, body: el('body')
};
const local = {}, sess = {};
global.localStorage = {
  getItem: k => (k in local ? local[k] : null),
  setItem: (k, v) => { local[k] = String(v); },
  removeItem: k => { delete local[k]; }
};
global.sessionStorage = {
  getItem: k => (k in sess ? sess[k] : null),
  setItem: (k, v) => { sess[k] = String(v); },
  removeItem: k => { delete sess[k]; }
};
global.crypto = webcrypto;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.btoa = s => Buffer.from(String(s), 'binary').toString('base64');
global.atob = s => Buffer.from(String(s), 'base64').toString('binary');
global.setInterval = () => 1;
global.clearInterval = () => {};
global.setTimeout = fn => { fn(); return 1; };
global.clearTimeout = () => {};
global.confirm = () => true;
global.alert = () => {};
global.navigator = { serviceWorker: { register: () => Promise.resolve() } };
global.Blob = class { constructor(partes) { this.partes = partes; this.texto = partes.join(''); } };
global.URL = { createObjectURL: () => 'blob:teste', revokeObjectURL() {} };
global.addEventListener = () => {};
global.location = { protocol: 'https:' };

let chamadas = [];
let respostas = {};
global.fetch = function(url, opcoes) {
  chamadas.push({ url: String(url), opcoes: opcoes || {} });
  const corpo = respostas[String(url)] || respostas[String(url).split('?')[0]] ||
    { ok: true, json: async () => ({}) };
  return Promise.resolve(typeof corpo === 'function' ? corpo(url, opcoes) : corpo);
};
const json = dados => ({ ok: true, json: async () => dados });

const arquivos = [
  'config.js', 'cripto.js', 'data.js', 'meses.js', 'hoje.js', 'backend.js',
  'seguranca.js', 'app.js', 'pacientes.js', 'fontes.js', 'lancamentos.js',
  'situacao.js', 'resumos.js', 'backup.js', 'agenda.js', 'prontuario.js',
  'whatsapp.js', 'recibos.js'
];
arquivos.forEach(f => vm.runInThisContext(fs.readFileSync(BASE + f, 'utf8'), { filename: f }));

let falhas = 0;
async function check(nome, cond, extra) {
  let valor = cond;
  if (cond && typeof cond.then === 'function') {
    try { valor = await cond; } catch (e) { valor = false; extra = e.message; }
  }
  console.log((valor ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!valor) falhas++;
}
function jwt(payload) {
  return 'x.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.y';
}

(async function() {
  console.log('[1] Criptografia AES-GCM com WebCrypto real');
  const fonteCripto = fs.readFileSync(BASE + 'cripto.js', 'utf8');
  await check('WebCrypto disponível no ambiente', Cripto.disponivel());
  await check('código fixa 600.000 iterações', /ITERACOES:\s*600000/.test(fonteCripto));
  await check('usa PBKDF2-HMAC-SHA256', /name:\s*'PBKDF2'[\s\S]*hash:\s*'SHA-256'/.test(fonteCripto));
  await check('usa AES-GCM com tag de 128 bits', /AES-GCM[\s\S]*tagLength:\s*128/.test(fonteCripto));
  // Reduz só o custo dos fluxos; o padrão do código foi conferido acima.
  Cripto.ITERACOES = 1000;

  const registro = await Cripto.criarRegistroSenha('senha-do-prontuario');
  await check('registro de senha tem 600k no formato (preparado com 1000 no teste)',
    /^pbkdf2\$\d+\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(registro), registro);
  await check('senha correta abre registro', Cripto.conferirRegistroSenha('senha-do-prontuario', registro));
  await check('senha errada não abre registro', !(await Cripto.conferirRegistroSenha('errada', registro)));
  await check('senha em texto não aparece no registro', !registro.includes('senha-do-prontuario'));

  const infoChave = await Cripto.criarRegistroChave('senha-do-prontuario');
  await check('registro da chave tem o formato aesgcm', Cripto.registroValido(infoChave.registro), infoChave.registro);
  await check('chave abre com a senha correta', !!(await Cripto.abrirRegistroChave(infoChave.registro, 'senha-do-prontuario')));
  await check('chave NÃO abre com senha errada', !(await Cripto.abrirRegistroChave(infoChave.registro, 'errada')));

  const cifrado = await Cripto.cifrar(infoChave.chave, {
    paciente: 'Ana Silva', queixa: 'Texto clínico sigiloso', data: '2026-11-23'
  });
  await check('evolução cifrada tem iv e dados', cifrado.cifrado === true && !!cifrado.iv && !!cifrado.dados);
  await check('texto clínico não aparece no registro cifrado', !JSON.stringify(cifrado).includes('Texto clínico sigiloso'));
  const decifrado = await Cripto.decifrar(infoChave.chave, cifrado);
  await check('evolução volta igual depois de decifrar', decifrado.queixa === 'Texto clínico sigiloso');
  let adulterado = Object.assign({}, cifrado);
  adulterado.dados = adulterado.dados.slice(0, -2) + (adulterado.dados.endsWith('AA') ? 'AB' : 'AA');
  await check('alterar o cifrado é detectado (AES-GCM)',
    Cripto.decifrar(infoChave.chave, adulterado).then(() => false, () => true));

  console.log('\n[2] Senha do prontuário + troca atômica');
  local.saas_seguranca_senha = registro;
  local.saas_cripto_chave = infoChave.registro;
  segurancaModulo.chaveAes = infoChave.chave;
  segurancaModulo.desbloqueado = true;
  evolucoes = [{ id: 1 }];
  const guardada = await Cripto.cifrar(infoChave.chave, {
    id: 1, paciente: 'A. S.', queixa: 'Evolução antiga', data: '2026-11-22'
  });
  evolucoes[0] = Object.assign({ id: 1 }, guardada);

  await check('senha correta confere no módulo', segurancaModulo.verificarSenha('senha-do-prontuario'));
  await check('senha errada é recusada no módulo', !(await segurancaModulo.verificarSenha('outra')));
  await check('texto clínico não fica no localStorage', !JSON.stringify(local).includes('Evolução antiga'));

  const senhaAntiga = local.saas_seguranca_senha;
  const chaveAntigaRegistro = local.saas_cripto_chave;
  await check('troca de senha com senha errada falha', !(await segurancaModulo.trocarSenha('nova-senha-9', 'errada')));
  await check('falha não alterou a senha', local.saas_seguranca_senha === senhaAntiga);
  await check('falha não alterou a chave', local.saas_cripto_chave === chaveAntigaRegistro);

  await check('troca de senha funciona', await segurancaModulo.trocarSenha('nova-senha-9', 'senha-do-prontuario'));
  await check('senha antiga não abre mais', !(await segurancaModulo.verificarSenha('senha-do-prontuario')));
  await check('senha nova abre', await segurancaModulo.verificarSenha('nova-senha-9'));
  const chaveNova = await Cripto.abrirRegistroChave(local.saas_cripto_chave, 'nova-senha-9');
  await check('nova chave abre as evoluções recifradas', !!(chaveNova && (await Cripto.decifrar(chaveNova, evolucoes[0])).queixa === 'Evolução antiga'));
  await check('evolução recifrada não está com a chave antiga',
    Cripto.decifrar(infoChave.chave, evolucoes[0]).then(() => false, () => true));
  await check('trilha registra a troca', segurancaModulo.lerTrilha().some(x => x.acao.indexOf('Senha de acesso alterada') === 0));

  console.log('\n[3] Backup v4 e validação');
  fontes = [{ id: 1, nome: 'Clínica', tipo: 'variavel', valorFixo: null, percentual: '30' }];
  pacientes = [{ id: 1, nome: 'Ana Silva' }];
  lancamentos = [{ id: 1, data: '2026-11-23', valor: 100 }];
  dadosProfissional = { nome: 'Dra.', crp: '04/74163', cpf: '', assinatura: '' };
  const dadosBackup = backupModulo.montarDados();
  await check('backup é versão 4 ou superior', dadosBackup.versao >= 4);
  await check('backup leva o registro da chave', dadosBackup.criptografia && Cripto.registroValido(dadosBackup.criptografia.chave));
  await check('backup não leva a senha em texto', !JSON.stringify(dadosBackup).includes('nova-senha-9'));
  await check('backup não leva texto clínico legível', !JSON.stringify(dadosBackup).includes('Evolução antiga'));
  await check('backup é aceito pela validação', backupModulo.valido(dadosBackup));
  const malicioso = JSON.parse(JSON.stringify(dadosBackup));
  malicioso.evolucoes[0].dados = '<img src=x onerror=alert(1)>';
  await check('dados cifrados inválidos são rejeitados', !backupModulo.valido(malicioso));
  const chaveErrada = JSON.parse(JSON.stringify(dadosBackup));
  chaveErrada.criptografia.chave = 'aesgcm$1$' + '00' + '$' + '00'.repeat(12) + '$' + '00'.repeat(40);
  await check('registro de chave inválido é rejeitado', !backupModulo.valido(chaveErrada));

  console.log('\n[4] Nuvem é a fonte da verdade');
  CONFIG.usarBackend = true;
  CONFIG.supabaseUrl = 'https://teste.supabase.co';
  chamadas = [];
  respostas = {
    'https://teste.supabase.co/rest/v1/dados?select=conteudo&user_id=eq.usr-1': json([{
      conteudo: {
        app: 'saas-livia', versao: 4,
        fontes: [], pacientes: [{ id: 9, nome: 'Nuvem A' }, { id: 10, nome: 'Nuvem B' }],
        lancamentos: [], evolucoes: [],
        dadosProfissional: { nome: 'Nuvem', crp: '04/74163' },
        criptografia: { chave: local.saas_cripto_chave }
      }
    }]),
    'https://teste.supabase.co/rest/v1/auditoria': json([])
  };
  sess.saas_auth_token = jwt({ sub: 'usr-1', exp: Math.floor(Date.now() / 1000) + 3600, aal: 'aal2' });
  sess.saas_auth_usuario = JSON.stringify({ id: 'usr-1', email: 'ana@teste.com' });
  await check('sincronização carrega a nuvem sem erro', (await Backend.sincronizarNoInicio(), true));
  await check('dados da nuvem substituíram os locais', pacientes.length === 2 && pacientes[0].nome === 'Nuvem A');
  const postDados = chamadas.filter(c => c.opcoes.method === 'POST' && c.url.includes('/rest/v1/dados'));
  await check('dados locais NÃO foram enviados para a nuvem', postDados.length === 0);
  await check('leitura usou o id da conta logada', chamadas.some(c => c.url.includes('user_id=eq.usr-1')));
  await check('token anon continua no cabeçalho', chamadas.every(c => (c.opcoes.headers || {}).apikey === CONFIG.supabaseAnonKey));

  chamadas = [];
  respostas['https://teste.supabase.co/rest/v1/dados?select=conteudo&user_id=eq.usr-1'] = json([]);
  pacientes = [{ id: 1, nome: 'Local que não deve subir' }];
  await check('conta nova sincroniza sem erro', (await Backend.sincronizarNoInicio(), true));
  await check('conta nova começa vazia', pacientes.length === 0);
  const postNovo = chamadas.filter(c => c.opcoes.method === 'POST' && c.url.includes('/rest/v1/dados'));
  await check('conta nova envia retrato vazio', postNovo.length === 1 &&
    JSON.parse(postNovo[0].opcoes.body).conteudo.pacientes.length === 0);

  console.log('\n[5] MFA e reautenticação');
  const fator = { id: 'fator-1', factor_type: 'totp', status: 'verified' };
  const tokenAal1 = jwt({ sub: 'usr-1', exp: Math.floor(Date.now() / 1000) + 3600, aal: 'aal1' });
  const tokenAal2 = jwt({ sub: 'usr-1', exp: Math.floor(Date.now() / 1000) + 3600, aal: 'aal2' });
  respostas['https://teste.supabase.co/auth/v1/token?grant_type=password'] = json({
    access_token: tokenAal1, refresh_token: 'refresh-1',
    user: { id: 'usr-1', email: 'ana@teste.com', factors: [fator] }
  });
  const sessaoLogin = await Backend.autenticarSenha('ana@teste.com', 'senha-da-conta');
  await check('conta com MFA pede o código', sessaoLogin.mfa === true);
  await check('fator verificado foi reconhecido', sessaoLogin.fatores.length === 1);

  chamadas = [];
  Backend._pendente = sessaoLogin;
  respostas['https://teste.supabase.co/auth/v1/factors/fator-1/challenge'] = json({ id: 'desafio-1' });
  respostas['https://teste.supabase.co/auth/v1/factors/fator-1/verify'] = json({
    access_token: tokenAal2, refresh_token: 'refresh-2', user: { id: 'usr-1', email: 'ana@teste.com' }
  });
  const sessaoAal2 = await Backend.concluirDesafioMfa('123 456');
  await check('desafio do fator foi chamado', chamadas.some(c => c.url.includes('/factors/fator-1/challenge')));
  await check('código de 6 dígitos foi verificado', chamadas.some(c => c.url.includes('/factors/fator-1/verify')));
  await check('sessão passou para aal2', Backend.decodificarJwt(sessaoAal2.token).aal === 'aal2');
  await check('código com menos de 6 dígitos é recusado',
    Backend.concluirDesafioMfa('123').then(() => false, () => true));

  sess.saas_auth_token = tokenAal1;
  sess.saas_auth_usuario = JSON.stringify({ id: 'usr-1', email: 'ana@teste.com' });
  let reautenticou = false;
  Backend.reautenticar(() => { reautenticou = true; });
  els.reauthEmail.value = 'ana@teste.com';
  els.reauthSenha.value = 'senha-da-conta';
  Backend.confirmarReautenticacao();
  await new Promise(r => setImmediate(r));
  await check('reautenticação com MFA pede o código', els.grupoMfaReauth.style.display === 'block');
  await check('ação protegida ainda não rodou', reautenticou === false);
  els.reauthMfaCodigo.value = '654321';
  Backend.confirmarReautenticacao();
  await new Promise(r => setImmediate(r));
  await check('reautenticação executa a ação protegida', reautenticou);
  await check('reautenticação guarda o token aal2', Backend.decodificarJwt(Backend.token()).aal === 'aal2');

  console.log('\n[6] Trilha no banco');
  chamadas = [];
  Backend.registrarAuditoria('Desbloqueio do prontuário', 'A. S.');
  await new Promise(r => setImmediate(r));
  const postAudit = chamadas.find(c => c.opcoes.method === 'POST' && c.url.includes('/rest/v1/auditoria'));
  await check('auditoria grava no banco', !!postAudit);
  await check('auditoria usa o id da conta', !!postAudit && JSON.parse(postAudit.opcoes.body).user_id === 'usr-1');
  await check('auditoria não permite apagar pelo site',
    !fs.readFileSync(DIR + 'supabase/schema.sql', 'utf8').match(/delete on public\.auditoria/i));

  console.log('\n[7] Google removido e proteções do login');
  const html = fs.readFileSync(DIR + 'index.html', 'utf8');
  const css = fs.readFileSync(DIR + 'css/style.css', 'utf8');
  const todoJs = arquivos.map(f => fs.readFileSync(BASE + f, 'utf8')).join('\n');
  await check('sem botão do Google no HTML', !/google/i.test(html));
  await check('sem CSS do Google', !/btn-login-google|google-icone/.test(css));
  await check('sem OAuth do Google no JavaScript', !/accounts\.google|googleAuth|processarRetorno|loginGoogle/i.test(todoJs));
  await check('login exige e-mail e senha', html.includes('id="loginEmail"') && html.includes('id="loginSenha"'));
  await check('campo de código MFA existe no login', html.includes('id="loginMfaCodigo"'));
  await check('só contas criadas pela profissional', html.includes('Somente contas criadas pela profissional'));
  await check('CSP bloqueia objetos e frames', html.includes("object-src 'none'") && html.includes("frame-ancestors 'none'"));
  const headers = fs.readFileSync(DIR + '_headers', 'utf8');
  await check('cabeçalhos HTTP publicam a CSP', headers.includes('Content-Security-Policy'));
  await check('cabeçalhos impedem clique de terceiros', headers.includes('X-Frame-Options: DENY'));
  await check('release automática por tag', fs.readFileSync(DIR + '.github/workflows/release.yml', 'utf8').includes("tags:\n      - 'v*'"));
  await check('release usa as notas da versão', fs.readFileSync(DIR + '.github/workflows/release.yml', 'utf8').includes('--notes-file'));

  console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
  process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
