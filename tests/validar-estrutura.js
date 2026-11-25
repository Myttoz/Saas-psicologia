/* Validação leve: IDs, handlers onclick/onchange e chaves do CSS */
const fs = require('fs');
const dir = require('path').resolve(__dirname, '..') + '/';
const html = fs.readFileSync(dir + 'index.html', 'utf8');
const portalHtml = fs.existsSync(dir + 'portal.html') ? fs.readFileSync(dir + 'portal.html', 'utf8') : '';
const jsDir = dir + 'js/';
const arquivosJs = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const todoJs = arquivosJs.map(f => fs.readFileSync(jsDir + f, 'utf8')).join('\n');
let falhas = 0;
function falha(msg) { console.log('ERRO ' + msg); falhas++; }

// IDs do HTML (index.html e portal.html são páginas diferentes)
function coletarIds(texto, origem) {
  const ids = [];
  const re = /\bid="([^"]+)"/g;
  let m;
  while ((m = re.exec(texto)) !== null) ids.push(m[1]);
  const locais = {};
  ids.forEach(id => {
    if (locais[id]) falha('ID duplicado no HTML (' + origem + '): ' + id);
    locais[id] = true;
  });
  return Object.keys(locais);
}
const idsIndex = coletarIds(html, 'index.html');
const idsPortal = portalHtml ? coletarIds(portalHtml, 'portal.html') : [];
const vistos = {};
idsIndex.concat(idsPortal).forEach(id => { vistos[id] = true; });
console.log('IDs no HTML: ' + (idsIndex.length + idsPortal.length) + (portalHtml ? ' (incluindo portal.html)' : ''));

// getElementById -> ID precisa existir no HTML
const reGet = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
const usados = new Set();
while ((m = reGet.exec(todoJs)) !== null) usados.add(m[1]);
let faltando = 0;
usados.forEach(id => {
  if (!vistos[id]) { falha('getElementById sem ID no HTML: ' + id); faltando++; }
});
console.log('IDs usados no JS: ' + usados.size + ' | faltando: ' + faltando);

// handlers embutidos no HTML
const funcoes = new Set();
let fm;
const reFunc = /(?:function\s+([A-Za-z_$][\w$]*)|^\s*([A-Za-z_$][\w$]*)\s*:\s*function|^\s*function\s+([A-Za-z_$][\w$]*))/gm;
while ((fm = reFunc.exec(todoJs)) !== null) funcoes.add(fm[1] || fm[2] || fm[3]);

let handlers = 0;
[html, portalHtml].forEach(function(fonte) {
  const reHandler = /\son(?:click|change|input|submit)="([^"]*)"/g;
  let m;
  while ((m = reHandler.exec(fonte)) !== null) {
    const codigo = m[1];
    const reChamada = /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*\(/g;
    let c;
    while ((c = reChamada.exec(codigo)) !== null) {
      const partes = c[1].split('.');
      const nome = partes[partes.length - 1];
      if (['stopPropagation', 'preventDefault'].indexOf(nome) !== -1) continue;
      handlers++;
      if (!funcoes.has(nome)) falha('handler sem função definida: ' + c[1] + ' em "' + codigo + '"');
    }
  }
});
console.log('Chamadas em handlers: ' + handlers);

// CSS com chaves balanceadas
const css = fs.readFileSync(dir + 'css/style.css', 'utf8');
let abre = (css.match(/\{/g) || []).length;
let fecha = (css.match(/\}/g) || []).length;
if (abre !== fecha) falha('CSS com chaves desbalanceadas: ' + abre + ' abertas / ' + fecha + ' fechadas');
else console.log('CSS: ' + abre + ' blocos balanceados');

console.log(falhas === 0 ? '\nESTRUTURA OK' : '\nFALHAS: ' + falhas);
process.exit(falhas === 0 ? 0 : 1);
