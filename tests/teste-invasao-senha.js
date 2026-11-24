/* Teste de invasão local: registro da senha do prontuário */
const fs = require('fs');
const vm = require('vm');
const arquivo = require('path').resolve(__dirname, '..') + '/js/seguranca.js';

function novoContexto() {
  const memoria = {};
  const ctx = {
    Uint8Array, Int32Array, Math, String, console, parseInt, Array, Date,
    crypto: { getRandomValues: a => { for (let i = 0; i < a.length; i++) a[i] = (i * 37 + 11) % 256; return a; } },
    localStorage: {
      getItem: k => (k in memoria ? memoria[k] : null),
      setItem: (k, v) => { memoria[k] = String(v); },
      removeItem: k => { delete memoria[k]; }
    },
    document: {
      getElementById: () => null,
      addEventListener: () => {},
      querySelectorAll: () => []
    },
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    confirm: () => true,
    alert: () => {}
  };
  ctx.window = ctx;
  ctx.memoria = memoria;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(arquivo, 'utf8'), ctx);
  return ctx;
}

let falhas = 0;
function check(nome, cond) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome);
  if (!cond) falhas++;
}

(async function() {
  const c = novoContexto();
  const S = c.segurancaModulo;

  await S.salvarRegistro('senha-forte-123');
  const registro = c.memoria[S.CHAVE_SENHA];
  check('registro usa PBKDF2', registro.indexOf('pbkdf2$') === 0);
  const partes = registro.split('$');
  check('registro tem 4 partes', partes.length === 4);
  check('iterações registradas', Number(partes[1]) >= 12000);
  check('sal com 16 bytes', /^[0-9a-f]{32}$/.test(partes[2]));
  check('hash SHA-256 com 32 bytes', /^[0-9a-f]{64}$/.test(partes[3]));
  check('senha em texto NÃO aparece no registro', registro.indexOf('senha-forte-123') === -1);
  check('senha correta é aceita', await S.verificarSenha('senha-forte-123'));
  check('senha errada é recusada', !(await S.verificarSenha('senha-errada')));
  check('senha parecida é recusada', !(await S.verificarSenha('senha-forte-124')));
  check('comparação não usa igualdade simples de string',
    !fs.readFileSync(arquivo, 'utf8').includes('calculada === partes[3]'));

  // Formato antigo continua funcionando e é migrado no primeiro acesso.
  const antigo = S.hash('senha-antiga');
  c.memoria[S.CHAVE_SENHA] = antigo;
  check('senha antiga ainda é reconhecida', await S.verificarSenha('senha-antiga'));
  check('migração acontece', (await S.migrarSeNecessario('senha-antiga')) === true);
  check('migração gera PBKDF2', c.memoria[S.CHAVE_SENHA].indexOf('pbkdf2$') === 0);

  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\nFALHAS: ' + falhas);
  process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
