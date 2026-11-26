/* Teste simulado: PBKDF2, migração da senha antiga, backup automático e PWA */
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');
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
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector() { return { id: 'page-hoje' }; },
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
global.crypto = webcrypto;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.btoa = s => Buffer.from(String(s), 'binary').toString('base64');
global.atob = s => Buffer.from(String(s), 'base64').toString('binary');
global.addEventListener = () => {};
global.setInterval = () => 1;
global.clearInterval = () => {};
global.confirm = () => true;
global.Blob = class { constructor(partes) { this.partes = partes; } };
global.URL = { createObjectURL: () => 'blob:teste', revokeObjectURL() {} };

const arquivos = ['cripto.js', 'data.js', 'meses.js', 'hoje.js', 'seguranca.js', 'app.js', 'pacientes.js',
  'fontes.js', 'lancamentos.js', 'situacao.js', 'resumos.js', 'backup.js', 'agenda.js',
  'prontuario.js', 'whatsapp.js', 'recibos.js'];
arquivos.forEach(f => vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

(async function() {
Cripto.ITERACOES = 1000; // acelera o teste; o padrão do código é 600.000

// ---------- vetores conhecidos da criptografia ----------
check('SHA-256 de abc', seg_hex(seg_sha256(seg_utf8('abc'))) ===
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
const chaveHmac = new Uint8Array(20);
chaveHmac.fill(0x0b);
check('HMAC-SHA256 (RFC 4231)', seg_hex(seg_hmac(chaveHmac, seg_utf8('Hi There'))) ===
  'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
check('PBKDF2-HMAC-SHA256 (RFC 6070)',
  seg_hex(new Uint8Array(seg_pbkdf2('password', seg_utf8('salt'), 1, 32))) ===
  '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');

// ---------- registro de senha ----------
const reg1 = seg_criarRegistro('senha123');
check('formato do registro', /^pbkdf2\$12000\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(reg1), reg1);
check('duas senhas iguais geram sais diferentes', seg_criarRegistro('senha123') !== reg1);
check('senha correta conferida direto', seg_conferir('senha123', reg1));
check('senha errada rejeitada direto', !seg_conferir('outra', reg1));

// ---------- senha antiga é migrada ----------
const legado = segurancaModulo.hash('1234');
check('hash legado ainda é reconhecido', seg_conferir('1234', legado));
check('hash legado não confunde senha errada', !seg_conferir('4321', legado));

memoria.saas_seguranca_senha = legado;
check('migração acontece', (await segurancaModulo.migrarSeNecessario('1234')) === true);
check('registro migrado para PBKDF2',
  /^pbkdf2\$/.test(memoria.saas_seguranca_senha), memoria.saas_seguranca_senha);
check('senha continua funcionando após migração', await segurancaModulo.verificarSenha('1234'));
check('migração não repete', (await segurancaModulo.migrarSeNecessario('1234')) === false);
check('trilha registra migração',
  segurancaModulo.lerTrilha().some(x => x.acao === 'Senha atualizada para proteção mais forte'));

// ---------- trocar senha (exige a senha atual e recifra) ----------
// No uso real, desbloquear() abre a chave AES e deixa o prontuário pronto.
// Aqui simulamos esse passo com uma chave gerada a partir da senha '1234'.
const infoChave = await Cripto.criarRegistroChave('1234');
segurancaModulo.salvarRegistroChave(infoChave.registro);
segurancaModulo.chaveAes = infoChave.chave;
segurancaModulo.desbloqueado = false;
check('trocar senha trancado é recusado',
  (await segurancaModulo.trocarSenha('novaSenha9', '1234')) === false);
segurancaModulo.desbloqueado = true;
check('trocar senha com senha atual errada é recusado',
  (await segurancaModulo.trocarSenha('novaSenha9', 'errada')) === false);
check('trocar senha funciona', (await segurancaModulo.trocarSenha('novaSenha9', '1234')) === true);
check('senha nova confere', await segurancaModulo.verificarSenha('novaSenha9'));
check('senha antiga não confere mais', !(await segurancaModulo.verificarSenha('1234')));
check('troca gravou registro da chave AES', Cripto.registroValido(memoria.saas_cripto_chave));

// senha legada sem registro de chave: desbloqueia e cria chave nova
memoria.saas_seguranca_senha = segurancaModulo.hash('abcd');
delete memoria.saas_cripto_chave;
segurancaModulo.desbloqueado = false;
segurancaModulo.chaveAes = null;
segurancaModulo.modo = 'desbloquear';
segurancaModulo.bloqueioAte = 0;
document.getElementById('senhaNova').value = 'abcd';
await segurancaModulo.desbloquear();
check('desbloqueio com senha antiga funciona', segurancaModulo.estaDesbloqueado());
check('desbloqueio também migra', /^pbkdf2\$/.test(memoria.saas_seguranca_senha));

// ---------- backup automático ----------
delete memoria.saas_backup_auto;
backupModulo.atualizarInfoAuto();
check('sem retrato inicial', els.backupAutoInfo.textContent.includes('Ainda não há backup automático'));

fontes = [{ id: 1, nome: 'Clínica', percentual: 30 }];
pacientes = [{ id: 1, nome: 'Ana Silva' }];
lancamentos = [{ id: 1, data: '2026-11-02', valor: 100 }];
evolucoes = [{ id: 1, paciente: 'A. S.', queixa: 'texto clínico' }];
dadosProfissional = { nome: 'Profissional', crp: '00/000', cpf: '000', assinatura: '' };

Store.salvar();
check('retrato automático foi salvo', !!memoria.saas_backup_auto);
const retrato = backupModulo.lerAuto();
check('retrato é válido', !!retrato);
check('retrato contém dados clínicos', retrato.evolucoes.length === 1);
check('retrato tem data do salvamento', !!retrato.salvoEm);
check('info na sidebar mostra data e quantidade',
  els.backupAutoInfo.textContent.includes('Último:') &&
  els.backupAutoInfo.textContent.includes('1 atendimento(s)'), els.backupAutoInfo.textContent);

// importar/restaurar não pode sobrescrever o retrato com dados ainda não confirmados
const retratoAntes = memoria.saas_backup_auto;
lancamentos = [{ id: 2, data: '2026-11-03', valor: 200 }];
backupModulo._aplicarDados(JSON.parse(retratoAntes));
check('aplicar backup não sobrescreve retrato', memoria.saas_backup_auto === retratoAntes);

// restaurar o retrato automático
check('restaurar automático devolve os dados', (function() {
  lancamentos = [{ id: 99, data: '2026-11-09', valor: 999 }];
  backupModulo.restaurarAuto();
  return lancamentos.length === 1 && lancamentos[0].valor === 100;
})());

// retrato corrompido é ignorado
memoria.saas_backup_auto = 'nao-e-json';
check('retrato corrompido ignorado', backupModulo.lerAuto() === null);
backupModulo.atualizarInfoAuto();
check('info avisa retrato corrompido', els.backupAutoInfo.textContent.includes('Ainda não há'));

// ---------- PWA ----------
const manifest = JSON.parse(fs.readFileSync(raiz + 'manifest.webmanifest', 'utf8'));
check('manifest com nome', !!manifest.name && !!manifest.short_name);
check('manifest em português', manifest.lang === 'pt-BR');
check('manifest abre index', manifest.start_url === './index.html');
check('manifest abre como app', manifest.display === 'standalone');
check('cor da marca no manifest', manifest.theme_color.toLowerCase() === '#7a9e8f');
check('ícones 192 e 512', manifest.icons.length === 2 &&
  manifest.icons.some(i => i.sizes === '192x192') &&
  manifest.icons.some(i => i.sizes === '512x512'));

check('ícones PNG existem', fs.existsSync(raiz + 'assets/icon-192.png') &&
  fs.existsSync(raiz + 'assets/icon-512.png'));

const sw = fs.readFileSync(raiz + 'sw.js', 'utf8');
check('service worker tem install/activate/fetch',
  sw.includes("'install'") && sw.includes("'activate'") && sw.includes("'fetch'"));
check('service worker cacheia arquivos do sistema',
  sw.includes('js/seguranca.js') && sw.includes('js/backup.js') && sw.includes('index.html'));
check('service worker cacheia config e backend',
  sw.includes('js/config.js') && sw.includes('js/backend.js'));
check('service worker ignora links externos', sw.includes('url.origin !== self.location.origin'));
check('service worker não derruba instalação por arquivo ausente', sw.includes('cache.add(url).catch'));
const parteArquivos = sw.slice(sw.indexOf('// Arquivos:'));
check('service worker usa rede primeiro para arquivos (config atualiza)',
  parteArquivos.indexOf('fetch(req).then') !== -1 &&
  parteArquivos.indexOf('fetch(req).then') < parteArquivos.indexOf('caches.match(req)') &&
  sw.includes('return caches.match(req);'));
check('service worker trocou a versão do cache', /saatendimentos-v\d+/.test(sw) && sw.includes('js/cripto.js'));

const html = fs.readFileSync(raiz + 'index.html', 'utf8');
check('HTML referencia manifest', html.includes('rel="manifest" href="manifest.webmanifest"'));
check('HTML tem cor do tema', html.includes('name="theme-color" content="#7A9E8F"'));
check('HTML tem ícone apple', html.includes('rel="apple-touch-icon"'));

const appJs = fs.readFileSync(base + 'app.js', 'utf8');
check('app registra service worker', appJs.includes("navigator.serviceWorker.register('sw.js')"));
check('app não registra em file://', appJs.includes("location.protocol === 'file:'"));

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
