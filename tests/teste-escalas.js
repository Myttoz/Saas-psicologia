/* Teste das escalas PHQ-9, GAD-7 e DASS-21 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const raiz = path.resolve(__dirname, '..') + '/';
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const sw = fs.readFileSync(raiz + 'sw.js', 'utf8');

function el(id) {
  const filhos = [];
  const e = {
    id: id || '', value: '', textContent: '', _html: '', style: {}, className: '',
    children: filhos,
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    addEventListener() {}, appendChild(c) { filhos.push(c); }, removeChild() {},
    click() {}
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); if (v === '') filhos.length = 0; }
  });
  return e;
}
const els = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  createElement(tag) { return el(tag); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: { appendChild() {}, removeChild() {} }
};
global.window = global;
global.addEventListener = () => {};
global.pacientes = [{ id: 1, nome: 'Ana Silva' }, { id: 2, nome: 'Bruno Costa' }];
global.evolucoes = [];
global.hojeStr = '2026-11-27';
const avisos = [];
const trilha = [];
const paginas = [];
global.app = { toast(m) { avisos.push(m); }, trocarPagina(id) { paginas.push(id); } };
global.Store = { salvar() {} };
global.Cripto = {
  cifrar(chave, objeto) { return Promise.resolve({ cifrado: true, iv: 'iv', dados: objeto }); }
};
global.segurancaModulo = {
  chaveAes: 'chave',
  estaDesbloqueado() { return true; },
  exigirAcesso(cb) { cb(); },
  registrar(a, b) { trilha.push([a, b]); },
  mascararNome(n) { return String(n).slice(0, 1) + '***'; }
};
global.prontuarioModulo = {
  _cache: {},
  chaveCache(id) { return String(id); },
  garantirCache() { return Promise.resolve(true); },
  plain(ev) { return this._cache[String(ev.id)] || (ev.cifrado ? null : ev); }
};

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
const esperar = () => new Promise(function(resolve) { setTimeout(resolve, 10); });

vm.runInThisContext(fs.readFileSync(raiz + 'js/escalas.js', 'utf8'), { filename: 'escalas.js' });
const e = escalasModulo;

(async function() {
  console.log('\n[1] Definições das escalas');
  check('PHQ-9 tem 9 questões', e.ESCALAS.phq9.perguntas.length === 9);
  check('GAD-7 tem 7 questões', e.ESCALAS.gad7.perguntas.length === 7);
  check('DASS-21 tem 21 questões', e.ESCALAS.dass21.perguntas.length === 21);
  check('questão 9 do PHQ-9 fala em autoagressão',
    /morte|machucar/i.test(e.ESCALAS.phq9.perguntas[8]));

  console.log('\n[2] Pontuação');
  let r = e.pontuar('phq9', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  check('PHQ-9 zerado é mínima', r.ok && r.total === 0 && r.classificacao === 'Mínima');
  r = e.pontuar('phq9', [3, 3, 3, 3, 3, 3, 3, 3, 3]);
  check('PHQ-9 máximo é grave', r.ok && r.total === 27 && r.classificacao === 'Grave');
  r = e.pontuar('phq9', [1, 1, 1, 1, 1, 1, 1, 1, 1]);
  check('PHQ-9 moderada', r.total === 9 && r.classificacao === 'Leve');
  r = e.pontuar('phq9', [0, 0, 0, 0, 0, 0, 0, 0, 2]);
  check('questão 9 positiva gera alerta', !!r.alerta && r.alerta.includes('risco'));
  r = e.pontuar('phq9', [1, 1, 1]);
  check('respostas incompletas são recusadas', !r.ok && r.faltam === 4);

  r = e.pontuar('gad7', [2, 2, 2, 2, 2, 2, 2]);
  check('GAD-7 14 é moderada', r.total === 14 && r.classificacao === 'Moderada');
  r = e.pontuar('gad7', [3, 3, 3, 3, 3, 3, 3]);
  check('GAD-7 21 é grave com alerta', r.total === 21 && r.classificacao === 'Grave' && !!r.alerta);

  r = e.pontuar('dass21', new Array(21).fill(0));
  check('DASS-21 zerada: três subescalas normais', r.ok && r.porEscala.length === 3 &&
    r.porEscala.every(s => s.pontuacao === 0 && s.classificacao === 'Normal'));
  r = e.pontuar('dass21', new Array(21).fill(3));
  check('DASS-21 dobra a soma de cada subescala',
    r.porEscala.every(s => s.soma === 21 && s.pontuacao === 42));
  check('DASS-21 máxima é extremamente grave',
    r.porEscala.every(s => s.classificacao === 'Extremamente grave'));
  const misturada = new Array(21).fill(0);
  misturada[0] = 1; misturada[1] = 2; // depressão: 3 x 2 = 6 -> leve
  r = e.pontuar('dass21', misturada);
  check('DASS-21 classifica cada subescala',
    r.porEscala[0].pontuacao === 6 && r.porEscala[0].classificacao === 'Leve' &&
    r.porEscala[1].classificacao === 'Normal');

  console.log('\n[3] Tela e preenchimento');
  document.getElementById('escalaPaciente').value = '1';
  document.getElementById('escalaTipo').value = 'phq9';
  e.preparar();
  const eventos = (els.escalaQuestoes.innerHTML.match(/onchange="escalasModulo\.responder/g) || []).length;
  check('9 questões com 4 opções cada', eventos === 36 &&
    els.escalaQuestoes.innerHTML.includes('escalasModulo.responder(8, 3)'), String(eventos));
  check('opções 0 a 3 em cada questão', els.escalaQuestoes.innerHTML.includes('value="3"'));
  for (let i = 0; i < 9; i++) e.responder(i, 2);
  r = e.calcular();
  check('resultado calculado na tela', r.ok && r.total === 18 && r.classificacao === 'Moderadamente grave');
  check('botão salvar aparece', els.escalaSalvarBtn.style.display === '');
  check('resultado mostra aviso de rastreio', els.escalaResultado.innerHTML.includes('não substitui avaliação clínica'));

  // DASS-21 na tela
  els.escalaTipo.value = 'dass21';
  e.preparar();
  check('21 questões renderizadas', (els.escalaQuestoes.innerHTML.match(/escala-enunciado/g) || []).length === 21);
  for (let i = 0; i < 21; i++) e.responder(i, 1);
  r = e.calcular();
  check('resultado DASS-21 mostra três subescalas', r.ok && r.porEscala.length === 3 &&
    els.escalaResultado.innerHTML.includes('Depressão') &&
    els.escalaResultado.innerHTML.includes('Ansiedade') &&
    els.escalaResultado.innerHTML.includes('Estresse'));

  console.log('\n[4] Salvamento cifrado');
  const antes = evolucoes.length;
  els.escalaTipo.value = 'phq9';
  e.preparar();
  for (let i = 0; i < 9; i++) e.responder(i, 1);
  e.calcular();
  e.salvar();
  await esperar();
  check('uma evolução cifrada foi criada', evolucoes.length === antes + 1 &&
    evolucoes[evolucoes.length - 1].cifrado === true);
  const salvo = prontuarioModulo._cache[String(evolucoes[evolucoes.length - 1].id)];
  check('registro interno marcado como escala', salvo && salvo.tipo === 'escala' &&
    salvo.escala === 'phq9' && salvo.total === 9);
  check('trilha de acesso registrada', trilha.some(t => t[0] === 'Escala aplicada'));
  check('cache do prontuário preenchido', !!prontuarioModulo._cache[String(evolucoes[evolucoes.length - 1].id)]);
  check('aviso de salvo', avisos.some(m => m.includes('Escala salva')));
  check('sem service_role', !fs.readFileSync(raiz + 'js/escalas.js', 'utf8').includes('service_role'));

  console.log('\n[5] Histórico e reabertura');
  e.preencher();
  await esperar();
  check('histórico mostra a escala salva', els.escalaHistorico.innerHTML.includes('PHQ-9'));
  check('histórico tem botão Ver', els.escalaHistorico.innerHTML.includes('escalasModulo.ver('));

  const id = evolucoes[evolucoes.length - 1].id;
  e.ver(id);
  check('reabertura restaura as respostas', e._respostas.length === 9 &&
    e._resultado.total === 9);
  check('reabertura esconde o botão salvar', els.escalaSalvarBtn.style.display === 'none');

  e.abrirParaPaciente(2);
  check('atalho da ficha abre Escalas com a paciente escolhida',
    paginas.includes('escalas') && els.escalaPaciente.value === '2',
    els.escalaPaciente.value);
  check('ficha do paciente tem botão Escalas',
    fs.readFileSync(raiz + 'js/pacientes.js', 'utf8').includes('escalasModulo.abrirParaPaciente('));

  // trocar o paciente no seletor não pode voltar ao primeiro da lista
  els.escalaPaciente.value = '1';
  e.mostrarHistorico();
  check('trocar paciente mantém a escolha', els.escalaPaciente.value === '1',
    els.escalaPaciente.value);

  console.log('\n[6] Estrutura do site');
  check('página de escalas existe', html.includes('id="page-escalas"'));
  check('menu lateral existe', html.includes("app.trocarPagina('escalas')"));
  check('script carregado', html.includes('js/escalas.js'));
  check('seletor de paciente não é recriado ao trocar',
    html.includes('onchange="escalasModulo.mostrarHistorico()"') &&
    !html.includes('onchange="escalasModulo.preencher()"'));
  check('service worker cacheia o módulo', sw.includes('./js/escalas.js'));
  check('cache atualizado', /saatendimentos-v\d+/.test(sw));

  check('escalas não aparecem como evoluções em branco',
    fs.readFileSync(raiz + 'js/prontuario.js', 'utf8').includes("ev.tipo === 'escala'"));

  console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
  process.exit(falhas === 0 ? 0 : 1);
})().catch(function(erro) {
  console.log('ERRO ' + (erro && erro.stack ? erro.stack : erro));
  process.exit(1);
});
