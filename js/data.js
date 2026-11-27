// ============================================================================
// Dados do sistema (estado inicial — zerado, sem registros fictícios)
// ============================================================================

var fontes = [
  { id: 1, nome: 'Clínica', tipo: 'variavel', valorFixo: null, percentual: '30' },
  { id: 2, nome: 'Particular', tipo: 'variavel', valorFixo: null, percentual: '70' },
  { id: 3, nome: 'Unimed', tipo: 'fixo', valorFixo: null, percentual: null },
  { id: 4, nome: 'Cideslestes', tipo: 'fixo', valorFixo: null, percentual: '40' }
];

var pacientes = []; // zerado
var lancamentos = []; // zerado
var evolucoes = []; // prontuário: evoluções por sessão (dado sensível)
var modelosEscalas = []; // modelos de perguntas criados pela profissional
var CRP_PADRAO = '04/74163'; // CRP informado pela profissional — aparece no recibo
var dadosProfissional = { nome: '', crp: CRP_PADRAO, cpf: '', assinatura: '' }; // usado no recibo

// Gestão Anual: anos criados de propósito (podem estar vazios) e ano em uso.
// Os anos com dados também aparecem mesmo se não estiverem nesta lista.
var anos = [];
var anoAtivo = new Date().getFullYear();

var hoje = new Date();
var hojeStr = hoje.getFullYear() + '-' +
  String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
  String(hoje.getDate()).padStart(2, '0');

// ============================================================================
// Utilitários de formato
// ============================================================================

// Use SEMPRE antes de colocar qualquer texto do usuário dentro de innerHTML.
// Transforma < > & " ' em entidades, impedindo que o texto vire código HTML/JS.
function escapeHtml(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—';
  var v = parseFloat(valor).toFixed(2).replace('.', ',');
  var partes = v.split(',');
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'R$ ' + partes.join(',');
}

function parseMoeda(texto) {
  if (!texto) return 0;
  return parseFloat(texto.replace(/\./g, '').replace(',', '.')) || 0;
}

// busca amigável: "clinica" também encontra "Clínica", "avaliacao" encontra "Avaliação"
function normalizarTexto(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .toLowerCase()
    .replace(/[àáâãä]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/ç/g, 'c');
}

// ============================================================================
// Anos — validação usada pelo site, pelo backup e pela nuvem
// ============================================================================

function anoValido(valor) {
  var n = Number(valor);
  if (!isFinite(n) || Math.floor(n) !== n || n < 1900 || n > 2100) return null;
  return n;
}

function normalizarAnos(valor) {
  if (!Array.isArray(valor)) return [];
  var saida = [];
  var vistos = {};
  for (var i = 0; i < valor.length; i++) {
    var item = valor[i];
    var objeto = item && typeof item === 'object' ? item : null;
    var n = anoValido(objeto ? objeto.ano : item);
    if (n === null || vistos[n]) continue;
    vistos[n] = true;
    saida.push({
      ano: n,
      criadoEm: objeto ? String(objeto.criadoEm || '').slice(0, 40) : ''
    });
  }
  saida.sort(function(a, b) { return a.ano - b.ano; });
  return saida;
}

// ============================================================================
// Regra de cálculo (fonte única da verdade)
// O percentual informado SEMPRE representa o valor recebido.
// Enquanto estiver vazio, nenhum cálculo é exibido.
// ============================================================================

function obterFontePorId(id) {
  for (var i = 0; i < fontes.length; i++) {
    if (fontes[i].id === id) return fontes[i];
  }
  return null;
}

function obterFontePorNome(nome) {
  for (var i = 0; i < fontes.length; i++) {
    if (fontes[i].nome === nome) return fontes[i];
  }
  return null;
}

function percentualDaFonte(f) {
  if (!f) return null;
  var p = f.percentual;
  if (p === null || p === undefined || String(p).trim() === '' || p === '—') return null;
  var numero = parseFloat(String(p).replace(',', '.'));
  return isNaN(numero) ? null : numero;
}

// Retorna { produzido, ganho, repasse } — ou null quando não há percentual.
function calcularValores(f, valor) {
  var pct = percentualDaFonte(f);
  if (pct === null) return null;
  var v = parseFloat(valor) || 0;
  var ganho = v * (pct / 100);
  return {
    produzido: v,
    ganho: Math.round(ganho * 100) / 100,
    repasse: Math.round((v - ganho) * 100) / 100
  };
}

// Compatibilidade com a tela de lançamentos.
function calcularSuaParte(fonteNome, valor) {
  var f = obterFontePorNome(fonteNome);
  var resultado = calcularValores(f, valor);
  return resultado ? resultado.ganho : null;
}

// ============================================================================
// CPF — usado só para preparar o recibo da Receita Federal
// Guardamos apenas os 11 números; a máscara é aplicada na tela.
// ============================================================================

function formatarCpf(valor) {
  var d = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
}

// Telefone: guardamos só os números; a máscara é aplicada na tela e nos relatórios.
function formatarTelefone(valor) {
  var d = String(valor === null || valor === undefined ? '' : valor).replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
}

function cpfValido(valor) {
  var d = String(valor || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  var i, soma = 0;
  for (i = 0; i < 9; i++) soma += parseInt(d.charAt(i), 10) * (10 - i);
  var resto = soma % 11;
  var primeiro = resto < 2 ? 0 : 11 - resto;
  soma = 0;
  for (i = 0; i < 10; i++) soma += parseInt(d.charAt(i), 10) * (11 - i);
  resto = soma % 11;
  var segundo = resto < 2 ? 0 : 11 - resto;
  return primeiro === parseInt(d.charAt(9), 10) && segundo === parseInt(d.charAt(10), 10);
}

// ============================================================================
// API de dados (simulada em localStorage para uso local)
// ============================================================================

var Store = {
  salvar: function() {
    try {
      localStorage.setItem('saas_fontes', JSON.stringify(fontes));
      localStorage.setItem('saas_pacientes', JSON.stringify(pacientes));
      localStorage.setItem('saas_lancamentos', JSON.stringify(lancamentos));
      localStorage.setItem('saas_evolucoes', JSON.stringify(evolucoes));
      localStorage.setItem('saas_modelos_escalas', JSON.stringify(modelosEscalas));
      localStorage.setItem('saas_dados_profissional', JSON.stringify(dadosProfissional));
      localStorage.setItem('saas_anos', JSON.stringify(anos));
      localStorage.setItem('saas_ano_ativo', String(anoAtivo));
    } catch (e) {
      // armazenamento indisponível — ignora silenciosamente
    }

    // mantém um retrato automático sempre que algo é salvo
    if (typeof backupModulo !== 'undefined' && backupModulo.registrarAlteracao) {
      backupModulo.registrarAlteracao();
    }

    // registra a versão local e avisa a nuvem (somente se estiver configurada)
    try { sessionStorage.setItem('saas_sync_at', new Date().toISOString()); } catch (e) {}
    if (typeof Backend !== 'undefined' && Backend.salvarSeConectado) {
      Backend.salvarSeConectado();
    }
  },
  carregar: function() {
    try {
      var f = localStorage.getItem('saas_fontes');
      var p = localStorage.getItem('saas_pacientes');
      var l = localStorage.getItem('saas_lancamentos');
      if (f) fontes = JSON.parse(f);
      if (p) pacientes = JSON.parse(p);
      if (l) lancamentos = JSON.parse(l);
      var e = localStorage.getItem('saas_evolucoes');
      if (e) evolucoes = JSON.parse(e);
      var me = localStorage.getItem('saas_modelos_escalas');
      if (me) modelosEscalas = JSON.parse(me);
      var dp = localStorage.getItem('saas_dados_profissional');
      if (dp) {
        var carregado = JSON.parse(dp);
        dadosProfissional = {
          nome: carregado.nome || '',
          crp: carregado.crp || CRP_PADRAO,
          cpf: carregado.cpf || '',
          assinatura: carregado.assinatura || ''
        };
      }
      var a = localStorage.getItem('saas_anos');
      if (a) anos = normalizarAnos(JSON.parse(a));
      var at = anoValido(localStorage.getItem('saas_ano_ativo'));
      if (at !== null) anoAtivo = at;
    } catch (e) {
      // ignora
    }
  }
};

Store.carregar();
