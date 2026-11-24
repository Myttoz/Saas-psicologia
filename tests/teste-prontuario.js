/* Teste simulado: horário até 20h, prontuário, senha, trilha e backup */
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');
const base = require('path').resolve(__dirname, '..') + '/js/';

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
const titulos = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  querySelector(sel) {
    if (sel && sel.indexOf('.modal-title') !== -1) {
      const chave = sel.split(' ')[0];
      return titulos[chave] || (titulos[chave] = el('titulo'));
    }
    if (sel && sel.indexOf('.page.active') !== -1) return { id: 'page-prontuario' };
    return null;
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement(tag) { return el(tag); },
  body: el('body')
};
const memoria = {}, sessao = {};
global.localStorage = {
  getItem: k => (k in memoria ? memoria[k] : null),
  setItem: (k, v) => { memoria[k] = String(v); },
  removeItem: k => { delete memoria[k]; }
};
global.sessionStorage = {
  getItem: k => (k in sessao ? sessao[k] : null),
  setItem: (k, v) => { sessao[k] = String(v); },
  removeItem: k => { delete sessao[k]; }
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
global.setTimeout = fn => { fn(); return 1; };
global.clearTimeout = () => {};
global.confirm = () => true;
let jsonExportado = '';
global.Blob = class { constructor(partes) { jsonExportado = partes.join(''); } };
global.URL = { createObjectURL: () => 'blob:teste', revokeObjectURL() {} };
global.FileReader = class { readAsText(arquivo) { this.onload({ target: { result: arquivo._conteudo } }); } };

const arquivos = ['cripto.js', 'data.js', 'meses.js', 'hoje.js', 'seguranca.js', 'app.js', 'pacientes.js',
  'fontes.js', 'lancamentos.js', 'situacao.js', 'resumos.js', 'backup.js', 'agenda.js',
  'prontuario.js', 'whatsapp.js', 'recibos.js'];
arquivos.forEach(f => vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }));

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

// WebCrypto resolve em outra fila de tarefas: alguns ticks para garantir.
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(r => setImmediate(r)); };

(async function() {
Cripto.ITERACOES = 1000; // acelera o teste; o padrão do código é 600.000

// ---------- horário até 20h ----------
check('slot 21:00 cai para 20:00', agendaModulo.slotDoHorario('21:00') === '20:00', agendaModulo.slotDoHorario('21:00'));
agendaModulo.render();
const grade = els.agendaGrid.innerHTML;
check('grade tem 20:00', grade.includes('20:00'));
check('grade não tem 20:30', !grade.includes('20:30'));
lancamentosModulo.abrirModal();
const presets = els.timePresets.innerHTML;
check('botões têm 20:00', presets.includes('20:00'));
check('botões não têm 20:30', !presets.includes('20:30'));

// ---------- preparação ----------
pacientes = [{ id: 1, nome: 'Ana Silva', fonteId: 2, valor: 180 }];
lancamentos = [{
  id: 901, data: hojeStr, horario: '09:00', paciente: 'Ana Silva', tipo: 'normal',
  fonteId: 2, valor: 180, pagamento: 'pix', status: 'pendente', suaParte: 126,
  presenca: 'compareceu', duracao: 3000, sessaoFinalizada: true, obs: ''
}];

// ---------- bloqueio inicial ----------
prontuarioModulo.render();
await flush();
check('prontuário começa bloqueado', els.evolucoesLista.innerHTML.includes('Prontuário protegido'));
check('trilha oculta quando bloqueado', els.trilhaLista.innerHTML.includes('Desbloqueie'));
prontuarioModulo.abrirModal();
check('pede senha ao tentar abrir evolução', document.getElementById('modalSenha').classList.contains('show-modal'));
check('modo criação de senha', segurancaModulo.modo === 'criar');

// ---------- criar senha ----------
document.getElementById('senhaNova').value = '1234';
document.getElementById('senhaConfirmar').value = '1234';
await segurancaModulo.criarSenha();
await flush();
check('senha desbloqueia', segurancaModulo.estaDesbloqueado());
check('senha não é guardada em texto puro', memoria.saas_seguranca_senha !== '1234', memoria.saas_seguranca_senha);
check('senha usa PBKDF2 com sal e iterações',
  /^pbkdf2\$\d+\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(memoria.saas_seguranca_senha), memoria.saas_seguranca_senha);
check('chave AES registrada', Cripto.registroValido(memoria.saas_cripto_chave));
check('senha correta confere', await segurancaModulo.verificarSenha('1234'));
check('senha errada não confere', !(await segurancaModulo.verificarSenha('4321')));
check('trilha registra criação da senha', segurancaModulo.lerTrilha().some(x => x.acao === 'Senha de acesso criada'));
check('ação pendente abre modal de evolução', document.getElementById('modalEvolucao').classList.contains('show-modal'));

prontuarioModulo.render();
await flush();
check('estado vazio aparece', els.evolucoesLista.innerHTML.includes('Nenhuma evolução registrada ainda'));
check('pacientes no datalist', els.pacientesEvoList.innerHTML.includes('Ana Silva'));

// ---------- modelo rápido ----------
prontuarioModulo.aplicarModelo('retorno');
check('modelo preenche queixa', els.evoQueixa.value.includes('Relato dos eventos'));
check('modelo preenche plano', els.evoPlano.value.includes('Retorno semanal') || els.evoPlano.value.includes('encontros semanais'));

// ---------- salvar evolução ----------
els.evoPaciente.value = 'ana silva';
els.evoData.value = hojeStr;
els.evoQueixa.value = 'Queixa de teste';
els.evoEvolucao.value = 'Evolução de teste';
await prontuarioModulo.salvar();
await flush();
check('evolução salva', evolucoes.length === 1, evolucoes.length);
check('evolução foi cifrada antes de salvar', evolucoes[0].cifrado === true && !!evolucoes[0].iv && !!evolucoes[0].dados);
const legivel = () => prontuarioModulo.plain(evolucoes[0]);
check('dados da evolução', legivel().paciente === 'ana silva' && legivel().queixa === 'Queixa de teste');
check('texto clínico não aparece no registro', !JSON.stringify(evolucoes).includes('Queixa de teste'));
check('trilha registra nova evolução com iniciais', segurancaModulo.lerTrilha().some(x => x.acao === 'Nova evolução' && x.detalhe === 'A. S.'));
check('modal fechado após salvar', !document.getElementById('modalEvolucao').classList.contains('show-modal'));

prontuarioModulo.render();
await flush();
check('evolução aparece na lista', els.evolucoesLista.children.length === 1);
check('card mostra paciente e queixa', els.evolucoesLista.children[0].innerHTML.includes('ana silva') &&
  els.evolucoesLista.children[0].innerHTML.includes('Queixa de teste'));

// ---------- busca ----------
prontuarioModulo.termo = 'naoexiste';
prontuarioModulo.render();
await flush();
check('busca sem resultado', els.evolucoesLista.innerHTML.includes('Nenhuma evolução encontrada'));
prontuarioModulo.termo = 'evolução de teste';
prontuarioModulo.render();
await flush();
check('busca por conteúdo encontra', els.evolucoesLista.children.length === 1);
prontuarioModulo.termo = '';

// ---------- editar ----------
const idEvo = evolucoes[0].id;
prontuarioModulo.editar(idEvo);
await flush();
check('editar abre modal', document.getElementById('modalEvolucao').classList.contains('show-modal'));
check('título vira Editar evolução', titulos['#modalEvolucao'].textContent === 'Editar evolução', titulos['#modalEvolucao'].textContent);
check('campos preenchidos na edição', els.evoQueixa.value === 'Queixa de teste');
els.evoPlano.value = 'Plano atualizado';
await prontuarioModulo.salvar();
await flush();
check('edição aplicada', prontuarioModulo.plain(evolucoes[0]).plano === 'Plano atualizado');
check('sem duplicar na edição', evolucoes.length === 1);
check('trilha registra edição', segurancaModulo.lerTrilha().some(x => x.acao === 'Edição de evolução'));

// ---------- atalho do Painel Hoje ----------
hojeModulo.render();
check('Painel Hoje oferece escrever evolução', els.hojeLista.children[0].innerHTML.includes('Escrever evolução'));
prontuarioModulo.abrirDaSessao(901);
await flush();
check('atalho abre evolução', document.getElementById('modalEvolucao').classList.contains('show-modal'));
check('paciente pré-preenchido', els.evoPaciente.value === 'Ana Silva');
check('data pré-preenchida', els.evoData.value === hojeStr);
check('lançamento vinculado', els.evoLancamentoId.value === 901 || els.evoLancamentoId.value === '901');
await prontuarioModulo.salvar();
await flush();
check('segunda evolução criada', evolucoes.length === 2);
check('vínculo com sessão gravado',
  prontuarioModulo.plain(evolucoes[1]).lancamentoId === 901 || prontuarioModulo.plain(evolucoes[1]).lancamentoId === '901');

// ---------- bloqueio e desbloqueio ----------
segurancaModulo.bloquear();
check('bloqueio manual', !segurancaModulo.estaDesbloqueado());
check('trilha registra bloqueio', segurancaModulo.lerTrilha().some(x => x.acao === 'Bloqueio manual'));
prontuarioModulo.render();
await flush();
check('tela bloqueada após bloquear', els.evolucoesLista.innerHTML.includes('Prontuário protegido'));

prontuarioModulo.solicitarAcesso();
check('modo desbloqueio', segurancaModulo.modo === 'desbloquear');
document.getElementById('senhaNova').value = 'errada';
await segurancaModulo.desbloquear();
check('senha errada não desbloqueia', !segurancaModulo.estaDesbloqueado());
check('erro exibido', document.getElementById('senhaErro').textContent.includes('Senha incorreta'));
check('tentativa registrada na trilha', segurancaModulo.lerTrilha().some(x => x.acao === 'Tentativa de acesso com senha incorreta'));
document.getElementById('senhaNova').value = '1234';
await segurancaModulo.desbloquear();
await flush();
check('senha correta desbloqueia', segurancaModulo.estaDesbloqueado());
check('trilha registra desbloqueio', segurancaModulo.lerTrilha().some(x => x.acao === 'Desbloqueio do prontuário'));

// ---------- exclusão ----------
const idExcluir = evolucoes[1].id;
prontuarioModulo.excluir(idExcluir);
await flush();
check('exclusão remove registro', evolucoes.length === 1);
check('trilha registra exclusão', segurancaModulo.lerTrilha().some(x => x.acao === 'Exclusão de evolução'));

// ---------- persistência ----------
Store.salvar();
check('Store salva evoluções', !!memoria.saas_evolucoes && JSON.parse(memoria.saas_evolucoes).length === 1);
evolucoes = [];
Store.carregar();
check('Store recarrega evoluções', evolucoes.length === 1);

// ---------- backup ----------
backupModulo.exportar();
const exportado = JSON.parse(jsonExportado);
check('backup versão 4 ou superior', exportado.versao >= 4);
check('backup inclui evoluções', Array.isArray(exportado.evolucoes) && exportado.evolucoes.length === 1);
check('backup não inclui senha', !jsonExportado.includes('saas_seguranca_senha'));
check('backup não inclui texto clínico legível', !jsonExportado.includes('Queixa de teste'));

const antigo = { app: 'saas-livia', versao: 1, exportadoEm: '2026-11-01T00:00:00.000Z',
  fontes: fontes, pacientes: pacientes, lancamentos: lancamentos };
backupModulo.processarArquivo({ value: '', files: [{ _conteudo: JSON.stringify(antigo) }] });
check('backup antigo importado sem travar', evolucoes.length === 0);
check('dados antigos preservados', lancamentos.length === 1 && pacientes.length === 1);

console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
