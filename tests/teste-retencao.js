/* Teste do aviso de guarda dos registros (Bloco 5) */
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '..') + '/';
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const css = fs.readFileSync(raiz + 'css/style.css', 'utf8');

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

const inicio = html.indexOf('id="page-prontuario"');
const fim = html.indexOf('<!-- Página:', inicio + 1);
const pagina = html.slice(inicio, fim > 0 ? fim : html.length);
const aviso = html.slice(html.indexOf('class="alert-note retencao-aviso"'),
  html.indexOf('class="alert-note retencao-aviso"') + 900);

check('aviso está na página do prontuário', pagina.includes('retencao-aviso'));
check('menciona o prazo mínimo de 5 anos', aviso.includes('5 anos') &&
  aviso.includes('01/2009') && aviso.includes('06/2019'));
check('menciona os 20 anos da Lei 13.787/2018',
  aviso.includes('20 anos') && aviso.includes('13.787/2018'));
check('menciona crianças e adolescentes', aviso.includes('maioridade'));
check('orienta guarda com acesso restrito', aviso.includes('acesso restrito'));
check('orienta dúvida ao Conselho Regional', aviso.includes('Conselho Regional'));
check('é só aviso (sem botão ou evento)', !/onclick|onchange|<button/i.test(aviso));
check('não bloqueia nem apaga nada', !/confirm\(|prompt\(|confirm\(/.test(aviso));
check('CSS do aviso usa a paleta verde', css.includes('.retencao-aviso') &&
  css.slice(css.indexOf('.retencao-aviso')).slice(0, 220).includes('var(--primary-light)'));
check('sem service_role no aviso', !/service_role/.test(aviso));

// a mensagem antiga de informação sensível continua no lugar
check('aviso de informação sensível continua', pagina.includes('Informação sensível') &&
  pagina.indexOf('Informação sensível') < pagina.indexOf('Guarda dos registros'));

console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
process.exit(falhas === 0 ? 0 : 1);
