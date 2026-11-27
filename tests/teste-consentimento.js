/* Teste do consentimento/anamnese assinado no portal */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const raiz = path.resolve(__dirname, '..') + '/';
const sql = fs.readFileSync(raiz + 'supabase/schema.sql', 'utf8');
const htmlPortal = fs.readFileSync(raiz + 'portal.html', 'utf8');
const htmlApp = fs.readFileSync(raiz + 'index.html', 'utf8');
const sw = fs.readFileSync(raiz + 'sw.js', 'utf8');

function el(id) {
  const filhos = [];
  const e = {
    id: id || '', value: '', textContent: '', _html: '', style: {}, className: '', children: filhos,
    classList: {
      add() {}, remove() {}, contains() { return false; },
      toggle() { return true; }
    },
    addEventListener() {}, appendChild(c) { filhos.push(c); }, removeChild() {}, click() {}
  };
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); if (v === '') filhos.length = 0; }
  });
  return e;
}
const els = {};
const pedidos = [];
const modais = [];
let assinado = false;

global.document = {
  getElementById(id) { return els[id] || (els[id] = el(id)); },
  createElement(tag) { return el(tag); },
  querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() {}, body: { appendChild() {}, removeChild() {} }
};
global.window = global;
global.addEventListener = () => {};
global.confirm = () => true;
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.sessionStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.CONFIG = { supabaseUrl: 'https://teste.supabase.co', supabaseAnonKey: 'anon' };
global.escapeHtml = function(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
global.formatarCpf = v => String(v);
global.formatarData = v => String(v);
global.formatarMoeda = v => 'R$ ' + v;
global.formatarTelefone = v => String(v);
global.cpfValido = () => true;
global.Store = { salvar() {}, carregar() {} };
global.app = {
  toast() {}, abrirModal(id) { modais.push(id); }, fecharModal() {}, botaoAcao() { return ''; }
};
global.Backend = {
  configurado() { return true; }, conectado() { return true; },
  usuario() { return { id: 'prof-1' }; },
  base() { return 'https://teste.supabase.co'; },
  headers() { return { apikey: 'anon', 'Content-Type': 'application/json' }; },
  _resposta(r) { return r.json().then(d => { if (!r.ok) throw new Error(d.message || 'Erro'); return d; }); }
};
const registro = {
  id: 'c1', titulo: 'Termo de consentimento', texto: 'Eu autorizo o atendimento.',
  assinado_em: null, assinante_nome: '', criado_em: '2026-11-27T10:00:00Z'
};
global.fetch = function(url, opcoes) {
  pedidos.push({ url: String(url), opcoes: opcoes || {} });
  function resposta(dados) {
    return Promise.resolve({ ok: true, json: function() { return Promise.resolve(dados); } });
  }
  if (String(url).indexOf('portal_pacientes?select=id') >= 0) return resposta([{ id: 'pac-1' }]);
  if (opcoes && opcoes.method === 'PATCH') {
    const corpo = JSON.parse(opcoes.body);
    assinado = true;
    registro.assinado_em = corpo.assinado_em;
    registro.assinante_nome = corpo.assinante_nome;
    return resposta([registro]);
  }
  if (opcoes && opcoes.method === 'POST') return resposta([registro]);
  if (opcoes && opcoes.method === 'DELETE') return resposta([]);
  if (String(url).indexOf('portal_consentimentos?select=id,titulo') >= 0) {
    return resposta([Object.assign({}, registro, {
      assinado_em: assinado ? registro.assinado_em : null,
      assinante_nome: assinado ? registro.assinante_nome : ''
    })]);
  }
  return resposta([]);
};

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}
const esperar = () => new Promise(function(resolve) { setTimeout(resolve, 10); });

['data.js', 'pacientes.js', 'portal-app.js'].forEach(function(arquivo) {
  vm.runInThisContext(fs.readFileSync(raiz + 'js/' + arquivo, 'utf8'), { filename: arquivo });
});
pacientes = [{ id: 1, nome: 'Ana Silva' }];

(async function() {
  console.log('\n[1] Banco e RLS');
  check('tabela de consentimentos existe', sql.includes('create table if not exists public.portal_consentimentos'));
  check('RLS ligada', sql.includes('alter table public.portal_consentimentos enable row level security'));
  check('política da profissional usa helper sem recursão',
    sql.includes('create policy "Profissional lê consentimentos"') &&
    sql.includes('public.portal_eh_profissional(paciente_portal_id)'));
  check('paciente lê só seus documentos',
    sql.includes('create policy "Paciente lê seus consentimentos"') &&
    sql.indexOf('a.paciente_portal_id = portal_consentimentos.paciente_portal_id') > -1);
  check('paciente só assina, não edita o texto',
    sql.includes('create policy "Paciente assina consentimento"') &&
    sql.includes('grant update (assinado_em, assinante_nome)'));
  check('assinatura exige data e nome', sql.includes('assinado_em is not null') &&
    sql.includes('char_length(assinante_nome) between 2 and 180'));
  check('política restritiva de MFA',
    sql.slice(sql.indexOf('create policy "Exige segundo fator quando ativado"\n  on public.portal_consentimentos'))
      .slice(0, 450).includes('as restrictive'));
  check('anon sem acesso', sql.includes('revoke all on public.portal_consentimentos from anon, public'));
  check('sem service_role', !/service_role/.test(sql));

  console.log('\n[2] Lado da psicóloga');
  pacientesModulo.abrirConsentimentoPortal(1);
  await esperar();
  check('modal aberta', modais.includes('modalConsentimentoPortal'));
  check('texto padrão preenchido', els.consentPortalTexto.value.includes('autorizo'));
  check('listou termos do vínculo',
    pedidos.some(p => p.url.includes('portal_consentimentos?select=id,titulo') &&
      p.url.includes('paciente_portal_id=eq.pac-1')));
  check('mostra pendente', els.consentPortalLista.innerHTML.includes('Aguardando assinatura'));

  document.getElementById('consentPortalTitulo').value = 'Anamnese';
  document.getElementById('consentPortalTexto').value = 'Conte sua queixa atual.';
  pacientesModulo.enviarConsentimentoPortal();
  await esperar();
  const post = pedidos.filter(p => p.opcoes.method === 'POST').pop();
  const corpo = post ? JSON.parse(post.opcoes.body) : {};
  check('POST com vínculo, título e texto',
    post && corpo.paciente_portal_id === 'pac-1' && corpo.titulo === 'Anamnese' &&
    corpo.texto === 'Conte sua queixa atual.' && !corpo.assinado_em,
    JSON.stringify(corpo).slice(0, 90));
  check('status confirma envio', els.consentPortalStatus.textContent.includes('Enviado'));

  console.log('\n[3] Lado da paciente');
  PortalApp._pacientePortalId = 'pac-1';
  await PortalApp._carregarConsentimentos();
  check('paciente consulta só o próprio vínculo',
    pedidos.some(p => p.url.includes('portal_consentimentos?select=id,titulo') &&
      p.url.includes('paciente_portal_id=eq.pac-1')));
  const htmlPaciente = els.portalConsentimentosLista.innerHTML;
  check('termo pendente com campo de nome', htmlPaciente.includes('consentNome-c1') &&
    htmlPaciente.includes('PortalApp.assinarConsentimento('));
  check('contador do portal', els.portalConsentimentosTag.textContent === '1');

  PortalApp.assinarConsentimento('c1');
  await esperar();
  check('nome obrigatório para assinar', els.portalMsgLogado.textContent.includes('nome completo'));

  document.getElementById('consentNome-c1').value = 'Ana Silva';
  PortalApp.assinarConsentimento('c1');
  await esperar();
  const patch = pedidos.filter(p => p.opcoes.method === 'PATCH').pop();
  const corpoPatch = patch ? JSON.parse(patch.opcoes.body) : {};
  check('PATCH assina com data e nome', !!corpoPatch.assinado_em &&
    corpoPatch.assinante_nome === 'Ana Silva' && Object.keys(corpoPatch).length === 2,
    JSON.stringify(corpoPatch).slice(0, 90));
  check('PATCH filtra id e vínculo', patch.url.includes('id=eq.c1') &&
    patch.url.includes('paciente_portal_id=eq.pac-1'));
  check('aviso de assinado', els.portalMsgLogado.textContent.includes('assinado'));
  check('termo passa a constar como assinado',
    els.portalConsentimentosLista.innerHTML.includes('Assinado') &&
    !els.portalConsentimentosLista.innerHTML.includes('consentNome-c1'));

  // texto hostil precisa ser escapado
  PortalApp._renderConsentimentos([{ id: 'c9', titulo: '<img src=x>', texto: '<script>alert(1)</script>', criado_em: '' }]);
  check('conteúdo escapado no portal',
    !els.portalConsentimentosLista.innerHTML.includes('<img src=x') &&
    !els.portalConsentimentosLista.innerHTML.includes('<script>') &&
    els.portalConsentimentosLista.innerHTML.includes('&lt;script&gt;'));

  console.log('\n[4] Texto por tipo e comprovante');
  els.consentPortalTexto.value = pacientesModulo.TEXTO_CONSENTIMENTO;
  document.getElementById('consentPortalTitulo').value = 'Anamnese';
  pacientesModulo.trocarModeloConsentimento();
  check('anamnese troca o texto modelo', els.consentPortalTexto.value.includes('Qual o motivo'));
  els.consentPortalTexto.value = 'Texto escrito pela profissional';
  document.getElementById('consentPortalTitulo').value = 'Termo de consentimento';
  pacientesModulo.trocarModeloConsentimento();
  check('texto editado não é sobrescrito', els.consentPortalTexto.value === 'Texto escrito pela profissional');

  let impressoes = 0;
  global.print = function() { impressoes++; };
  pacientesModulo.imprimirConsentimento('c1');
  await esperar();
  check('comprovante do termo assinado', impressoes === 1 &&
    els.areaImpressao.innerHTML.includes('Ana Silva') &&
    els.areaImpressao.innerHTML.includes('Assinado digitalmente') &&
    els.areaImpressao.innerHTML.includes('SaaS by Myttoz'));
  pacientesModulo._carregarConsentimentoPortal(pacientes[0]);
  await esperar();
  check('lista mostra botão Comprovante quando assinado',
    els.consentPortalLista.innerHTML.includes('pacientesModulo.imprimirConsentimento('));

  console.log('\n[5] Estrutura');
  check('aba no portal', htmlPortal.includes('id="page-consentimento"') &&
    htmlPortal.includes("PortalApp.trocarAba('consentimento')"));
  check('modal e botão na ficha', htmlApp.includes('id="modalConsentimentoPortal"') &&
    fs.readFileSync(raiz + 'js/pacientes.js', 'utf8').includes('pacientesModulo.abrirConsentimentoPortal('));
  check('cache atualizado', /saatendimentos-v\d+/.test(sw));
  check('cabeçalho da tabela é curto', htmlApp.includes('<th>$ Atendimento</th>'));

  console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
  process.exit(falhas === 0 ? 0 : 1);
})().catch(function(erro) {
  console.log('ERRO ' + (erro && erro.stack ? erro.stack : erro));
  process.exit(1);
});
