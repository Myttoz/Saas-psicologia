/* Testes de invasão: XSS, backup malicioso, OAuth e bloqueio do prontuário */
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');

const BASE = require('path').resolve(__dirname, '..') + '/js/';
const arquivos = [
  'config.js', 'cripto.js', 'data.js', 'backend.js', 'backup.js', 'agenda.js',
  'prontuario.js', 'recibos.js', 'seguranca.js', 'fontes.js',
  'pacientes.js', 'lancamentos.js', 'situacao.js', 'hoje.js'
];

function elemento() {
  return {
    innerHTML: '', value: '', className: '', textContent: '',
    style: {}, _filhos: [],
    appendChild: function(f) { this._filhos.push(f); },
    querySelectorAll: function() { return []; },
    addEventListener: function() {}, focus: function() {},
    reset: function() {}, click: function() {}
  };
}

function novoContexto() {
  const local = {}, sess = {}, els = {};
  const ctx = {
    console, Uint8Array, Int32Array, Array, Object, String, Number, Boolean,
    Date, Math, JSON, RegExp, parseInt, parseFloat, isFinite, Error,
    encodeURIComponent, decodeURIComponent, atob, Promise,
    setTimeout: (fn) => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {},
    confirm: () => true, alert: () => {},
    crypto: webcrypto, TextEncoder, TextDecoder,
    btoa: s => Buffer.from(String(s), 'binary').toString('base64'),
    atob: s => Buffer.from(String(s), 'base64').toString('binary'),
    localStorage: {
      getItem: k => (k in local ? local[k] : null),
      setItem: (k, v) => { local[k] = String(v); },
      removeItem: k => { delete local[k]; }
    },
    sessionStorage: {
      getItem: k => (k in sess ? sess[k] : null),
      setItem: (k, v) => { sess[k] = String(v); },
      removeItem: k => { delete sess[k]; }
    },
    document: {
      getElementById: id => (els[id] || (els[id] = elemento())),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => elemento(),
      addEventListener: () => {},
      body: { appendChild() {}, removeChild() {} }
    },
    fetch: () => Promise.reject(new Error('sem rede no teste')),
    Image: function() {}, FileReader: function() {}, Blob: function() {},
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }
  };
  ctx.window = ctx;
  ctx.window.location = {
    href: 'https://myttoz.github.io/Saas-psicologia/index.html',
    hash: '', pathname: '/Saas-psicologia/index.html', search: '',
    reload: () => {}
  };
  ctx.window.history = { replaceState: () => {} };
  ctx.app = {
    botaoAcao: (rotulo, onclick) => '<button onclick="' + onclick + '">' + rotulo + '</button>',
    toast: () => {}, abrirModal: () => {}, fecharModal: () => {}, trocarPagina: () => {}
  };

  vm.createContext(ctx);
  for (const f of arquivos) {
    vm.runInContext(fs.readFileSync(BASE + f, 'utf8'), ctx, { filename: f });
  }
  ctx._local = local;
  ctx._sess = sess;
  ctx._els = els;
  return ctx;
}

let falhas = 0;
function check(nome, cond) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome);
  if (!cond) falhas++;
}

const c = novoContexto();

// --- 1. Escape HTML ---
console.log('\n[1] Escape de HTML');
check('escapeHtml bloqueia tag com onerror',
  c.escapeHtml('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;');
check('escapeHtml bloqueia quebra de atributo title',
  c.escapeHtml('Particular" onmouseover="alert(1)') === 'Particular&quot; onmouseover=&quot;alert(1)');
check('escapeHtml bloqueia aspas simples',
  c.escapeHtml("x' onfocus='alert(1)") === 'x&#39; onfocus=&#39;alert(1)');

// --- 2. XSS persistente pelo nome do convênio ---
console.log('\n[2] XSS pelo convênio');
c.fontes = [{ id: 1, nome: '<img src=x onerror="fetch(\'//evil\')">', tipo: 'variavel', valorFixo: null, percentual: '30' }];
c.fontesRender();
const htmlFonte = c._els['tbodyFontes']._filhos[0].innerHTML;
check('nome do convênio não vira tag', htmlFonte.indexOf('<img') === -1);
check('nome do convênio aparece como texto', htmlFonte.indexOf('&lt;img') !== -1);

// --- 3. Injeção no atributo title da agenda ---
console.log('\n[3] Injeção em title=');
const chip = c.agendaModulo.chip({
  id: 7, data: '2026-11-23', horario: '14:00',
  paciente: 'Maria" onmouseover="alert(1)', fonteId: 1, presenca: 'agendado'
});
check('chip não cria atributo onmouseover', chip.indexOf('onmouseover="alert') === -1);
check('chip escapa aspas no title', chip.indexOf('Maria&quot; onmouseover=&quot;alert') !== -1);
check('chip usa ID numérico no clique', chip.indexOf('editar(7)') !== -1);
check('classe de presença não aceita valor arbitrário',
  c.agendaModulo.chip({ id: 1, horario: '8:00', paciente: 'x', presenca: 'x" onmouseover="y' }).indexOf('h-x"') === -1);

// --- 4. Assinatura e IDs maliciosos no backup ---
console.log('\n[4] Backup malicioso');
const base = { app: 'saas-livia', fontes: [], pacientes: [], lancamentos: [] };
const assinaturaRuim = Object.assign({}, base, {
  dadosProfissional: { assinatura: 'x" onerror="alert(1)' }
});
check('assinatura com código é descartada',
  c.backupModulo.normalizar(assinaturaRuim).dadosProfissional.assinatura === '');
check('assinatura PNG válida é aceita',
  c.backupModulo.normalizar(Object.assign({}, base, {
    dadosProfissional: { assinatura: 'data:image/png;base64,iVBORw0KGgo=' }
  })).dadosProfissional.assinatura === 'data:image/png;base64,iVBORw0KGgo=');

let rejeitouId = false;
try {
  c.backupModulo.normalizar(Object.assign({}, base, {
    lancamentos: [{ id: '1);fetch("//evil");//', data: '2026-01-01' }]
  }));
} catch (e) { rejeitouId = true; }
check('ID com código é rejeitado', rejeitouId);

let rejeitouData = false;
try {
  c.backupModulo.normalizar(Object.assign({}, base, {
    lancamentos: [{ id: 1, data: {} }]
  }));
} catch (e) { rejeitouData = true; }
check('data com objeto é rejeitada', rejeitouData);

let rejeitouItem = false;
try {
  c.backupModulo.normalizar(Object.assign({}, base, { pacientes: ['texto'] }));
} catch (e) { rejeitouItem = true; }
check('item que não é objeto é rejeitado', rejeitouItem);

check('backup comuns continuam funcionando',
  c.backupModulo.valido(Object.assign({}, base, {
    pacientes: [{ id: 1, nome: 'Maria', fonteId: 2, valor: 100 }],
    lancamentos: [{ id: 2, data: '2026-11-23', paciente: 'Maria', valor: 100 }]
  })));

// --- 5. Google removido (a usuária desligou no Supabase) ---
console.log('\n[5] Google removido do sistema');
const htmlGeral = fs.readFileSync(require('path').resolve(__dirname, '..') + '/index.html', 'utf8');
const cssGeral = fs.readFileSync(require('path').resolve(__dirname, '..') + '/css/style.css', 'utf8');
const jsGeral = arquivos.map(f => fs.readFileSync(BASE + f, 'utf8')).join('\n');
check('sem botão do Google no HTML', !/google/i.test(htmlGeral));
check('sem estilo do Google no CSS', !/btn-login-google|google-icone/.test(cssGeral));
check('sem retorno OAuth no backend', !/processarRetorno|_novoState|provider=google/i.test(jsGeral));
check('login com senha continua obrigatório',
  htmlGeral.includes('id="modalLogin"') && htmlGeral.includes('Backend.entrar()'));

(async function() {
  c.Cripto.ITERACOES = 1000; // acelera o teste; o padrão do código é 600.000

  // --- 6. Bloqueio do prontuário ---
  console.log('\n[6] Bloqueio do prontuário');
  const S = c.segurancaModulo;
  await S.salvarRegistro('senhaAtual');
  // Simula o desbloqueio real: a chave AES fica em memória.
  const infoChave = await c.Cripto.criarRegistroChave('senhaAtual');
  S.salvarRegistroChave(infoChave.registro);
  S.chaveAes = infoChave.chave;
  S.desbloqueado = false;
  let pediuSenha = 0;
  S.exigirAcesso = function() { pediuSenha++; return false; };
  c.evolucoes = [{ id: 1, paciente: 'Maria', evolucao: 'segredo' }];

  c.prontuarioModulo.salvar();
  check('salvar exige senha', pediuSenha === 1);
  c.prontuarioModulo.excluir(1);
  check('excluir exige senha', pediuSenha === 2 && c.evolucoes.length === 1);
  c.prontuarioModulo.mostrarModal({ id: 1 });
  check('abrir modal exige senha', pediuSenha === 3);
  check('trocar senha sem a atual é recusado', (await S.trocarSenha('12345')) === false);
  check('trocar senha com a atual errada é recusado', (await S.trocarSenha('12345', 'errada')) === false);

  S.desbloqueado = false;
  check('trocar senha com o prontuário trancado é recusado',
    (await S.trocarSenha('novaSenha', 'senhaAtual')) === false);
  S.desbloqueado = true;
  check('trocar senha com a correta funciona',
    (await S.trocarSenha('novaSenha', 'senhaAtual')) === true);
  check('evolução foi cifrada na troca', c.evolucoes[0].cifrado === true);
  check('texto clínico não aparece no registro', !JSON.stringify(c.evolucoes).includes('segredo'));

  // --- 7. Recibo ---
  console.log('\n[7] Recibo');
  check('recibo recusa assinatura maliciosa',
    c.recibosModulo.assinaturaValida('x" onerror="alert(1)') === '');
  check('recibo aceita imagem PNG',
    c.recibosModulo.assinaturaValida('data:image/png;base64,iVBORw0KGgo=').length > 0);

  console.log(falhas === 0 ? '\nTODOS OS TESTES DE INVASÃO PASSARAM' : '\nFALHAS: ' + falhas);
  process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
