/* Testes do deploy sem artefatos duplicados e da rolagem suave */
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '..') + '/';
const deploy = fs.readFileSync(raiz + '.github/workflows/deploy.yml', 'utf8');
const css = fs.readFileSync(raiz + 'css/style.css', 'utf8');

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

check('nome do artefato é único por tentativa',
  deploy.includes('github-pages-${{ github.run_id }}-${{ github.run_attempt }}'));
check('upload e deploy usam o mesmo nome',
  (deploy.match(/github-pages-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/g) || []).length === 2);
check('artefatos antigos não se acumulam', deploy.includes('retention-days: 1'));
check('environment do Pages permanece', deploy.includes('name: github-pages'));

const fundo = css.slice(css.indexOf('body::before'), css.indexOf('a { text-decoration'));
check('fundo não usa mesclagem cara', !fundo.includes('mix-blend-mode'));
check('rolagem suave ativada', css.includes('scroll-behavior: smooth'));
check('rolagem contida nos painéis', css.includes('overscroll-behavior: contain') &&
  css.includes('-webkit-overflow-scrolling: touch'));
check('blur do overlay reduzido', css.includes('blur(2px)') && !css.includes('blur(4px)'));
check('painel de edição continua com rolagem própria',
  css.includes('.modal {') && css.slice(css.indexOf('.modal {'), css.indexOf('.modal {') + 400).includes('overflow-y: auto'));

console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
process.exit(falhas === 0 ? 0 : 1);
