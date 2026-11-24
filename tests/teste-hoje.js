/* Teste simulado do Painel Hoje (sem navegador) */
const fs = require('fs');
const vm = require('vm');
const path = require('path').resolve(__dirname, '..') + '/js/';

function el(id) {
  const children = [];
  const subs = {};
  const e = {
    id: id || '', value: '', textContent: '', _html: '', style: {}, className: '', files: [],
    children, subs,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    addEventListener() {}, appendChild(c) { children.push(c); }, removeChild() {},
    click() {}, reset() {}, focus() {}, setSelectionRange() {}, scrollIntoView() {},
    querySelector(sel) { return subs[sel] || null; },
    querySelectorAll() { return []; },
    contains() { return false; }
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
global.window = global;
global.addEventListener = () => {};
global.setInterval = () => 1;
global.clearInterval = () => {};
global.confirm = () => true;

['data.js', 'meses.js', 'hoje.js', 'seguranca.js', 'app.js', 'pacientes.js', 'fontes.js',
 'lancamentos.js', 'situacao.js', 'resumos.js', 'backup.js', 'agenda.js', 'prontuario.js']
  .forEach(f => vm.runInThisContext(fs.readFileSync(path + f, 'utf8'), { filename: f }));

const hoje = hojeStr;
const amanha = new Date();
amanha.setDate(amanha.getDate() + 1);
const amanhaStr = amanha.getFullYear() + '-' +
  String(amanha.getMonth() + 1).padStart(2, '0') + '-' +
  String(amanha.getDate()).padStart(2, '0');

lancamentos = [
  { id: 101, data: hoje, horario: '09:00', paciente: 'Ana Silva', tipo: 'normal',
    fonteId: 1, valor: 200, pagamento: 'pix', status: 'pendente', suaParte: 60,
    presenca: 'agendado', obs: '' },
  { id: 102, data: hoje, horario: '14:00', paciente: 'Bruno Costa', tipo: 'avaliacao',
    fonteId: 2, valor: 180, pagamento: 'dinheiro', status: 'pago', suaParte: 126,
    presenca: 'compareceu', obs: '' },
  { id: 103, data: amanhaStr, horario: '10:00', paciente: 'Carla Dias', tipo: 'normal',
    fonteId: 3, valor: 150, pagamento: 'pix', status: 'pendente', suaParte: null,
    presenca: 'agendado', obs: '' }
];

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

hojeModulo.init();
hojeModulo.render();

const stats = els.hojeStats.innerHTML;
check('data por extenso preenchida', els.hojeData.textContent.includes('de '));
check('2 atendimentos hoje', stats.includes('Atendimentos hoje') && stats.includes('>2<'));
check('1 aguardando confirmação', stats.includes('Aguardando confirmação') && stats.includes('>1<'));
check('a receber hoje = R$ 186,00', stats.includes('R$ 186,00'), stats.match(/R\$ [\d.,]+/g));
check('ganho do mês = R$ 186,00', (stats.match(/R\$ 186,00/g) || []).length === 2);
check('2 itens na lista de hoje', els.hojeLista.children.length === 2);
check('resumo diz 2 atendimentos', els.hojeResumo.textContent === '2 atendimentos');
check('próximos mostra Carla Dias', els.hojeProximos.children.length === 1 &&
  els.hojeProximos.children[0].innerHTML.includes('Carla Dias'));
check('pendências do mês = 2', els.hojePendencias.innerHTML.includes('>2<'));
check('botão Iniciar sessão presente', els.hojeLista.children[0].innerHTML.includes('Iniciar sessão'));
check('marcar como pago presente no pendente', els.hojeLista.children[0].innerHTML.includes('Marcar como pago'));

// --- fluxo de sessão ---
hojeModulo.iniciarSessao(101);
check('iniciar marca presença compareceu', lancamentos[0].presenca === 'compareceu');
check('sessão salva no localStorage', !!memoria.saas_sessao_ativa);
check('item fica ativo', els.hojeLista.children[0].className.includes('ativo'));
check('cronômetro aparece', els.hojeLista.children[0].innerHTML.includes('cronometro-101'));
check('botão Finalizar sessão aparece', els.hojeLista.children[0].innerHTML.includes('Finalizar sessão'));

// simula elementos do cronômetro criados pelo innerHTML no navegador
const crono = el('cronometro-101');
crono.subs['.cronometro-tempo'] = el('tempo');
const barra = el('progresso-101');
els['cronometro-101'] = crono;
els['progresso-101'] = barra;

hojeModulo.atualizarCronometro();
check('cronômetro inicia em 00:00', crono.subs['.cronometro-tempo'].textContent === '00:00',
  crono.subs['.cronometro-tempo'].textContent);
check('barra começa em 0%', barra.style.width === '0%', barra.style.width);

// simula 51 minutos decorridos
hojeModulo.sessao.inicio = Date.now() - (51 * 60 * 1000);
hojeModulo.atualizarCronometro();
check('acima de 50 min marca passou-alvo', crono.classList.contains('passou-alvo'));
check('barra limitada a 100%', barra.style.width === '100%', barra.style.width);
check('barra fica concluída', barra.classList.contains('concluido'));

// persistência: simula reload do módulo
hojeModulo.sessao = null;
hojeModulo.carregarSessao();
check('sessão restaurada após reload', hojeModulo.sessao && hojeModulo.sessao.id === 101);

// finalizar
hojeModulo.sessao.inicio = Date.now() - (50 * 60 * 1000);
hojeModulo.finalizarSessao();
check('finalizar grava duração', lancamentos[0].duracao >= 2999 && lancamentos[0].duracao <= 3002,
  lancamentos[0].duracao);
check('finalizar marca sessaoFinalizada', lancamentos[0].sessaoFinalizada === true);
check('finalizar limpa cronômetro', hojeModulo.sessao === null && !memoria.saas_sessao_ativa);
check('mostra sessão concluída', els.hojeLista.children[0].innerHTML.includes('Sessão concluída em'));

// cancelar volta para agendado
hojeModulo.iniciarSessao(102);
check('iniciar outra sessão funciona', hojeModulo.sessao.id === 102);
hojeModulo.cancelarSessao();
check('cancelar volta para agendado', lancamentos[1].presenca === 'agendado');
check('cancelar limpa cronômetro', hojeModulo.sessao === null);

// marcar pago
hojeModulo.marcarPago(101);
check('marcar como pago', lancamentos[0].status === 'pago');

// sessão órfã (lançamento apagado) é descartada no render
hojeModulo.iniciarSessao(103);
lancamentos = lancamentos.filter(l => l.id !== 103);
hojeModulo.render();
check('sessão órfã descartada', hojeModulo.sessao === null && !memoria.saas_sessao_ativa);

// não permite duas sessões ao mesmo tempo
hojeModulo.iniciarSessao(101);
const antes = hojeModulo.sessao.id;
hojeModulo.iniciarSessao(102);
check('bloqueia segunda sessão simultânea', hojeModulo.sessao.id === antes);
hojeModulo.cancelarSessao();

console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
process.exit(falhas === 0 ? 0 : 1);
