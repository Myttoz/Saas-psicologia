/* Roda todas as baterias de teste e resume o resultado.
   Uso: node tests/rodar.js */
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const pasta = __dirname;
const raiz = path.resolve(pasta, '..');
const arquivos = fs.readdirSync(pasta)
  .filter(function(nome) { return /^teste-.*\.js$/.test(nome); })
  .sort();

let falhas = 0;
arquivos.forEach(function(nome) {
  const r = cp.spawnSync(process.execPath, [path.join(pasta, nome)], {
    encoding: 'utf8',
    cwd: raiz
  });
  const linhas = String(r.stdout || '').trim().split('\n');
  const ultima = linhas[linhas.length - 1] || '(sem saída)';
  const erros = String(r.stdout || '') + String(r.stderr || '');
  console.log((r.status === 0 ? 'OK   ' : 'FALHA') + ' ' + nome + ' — ' + ultima);
  if (r.status !== 0) {
    erros.split('\n').filter(function(linha) { return /^(ERRO|FALHA)/.test(linha); })
      .slice(0, 8).forEach(function(linha) { console.log('       ' + linha); });
    falhas++;
  }
});

console.log('');
console.log(falhas === 0
  ? 'TODAS AS ' + arquivos.length + ' BATERIAS PASSARAM'
  : falhas + ' BATERIA(S) FALHARAM');
process.exit(falhas ? 1 : 0);
