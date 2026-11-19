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

var hoje = new Date();
var hojeStr = hoje.getFullYear() + '-' +
  String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
  String(hoje.getDate()).padStart(2, '0');

// ============================================================================
// Utilitários de formato
// ============================================================================

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
// API de dados (simulada em localStorage para uso local)
// ============================================================================

var Store = {
  salvar: function() {
    try {
      localStorage.setItem('saas_fontes', JSON.stringify(fontes));
      localStorage.setItem('saas_pacientes', JSON.stringify(pacientes));
      localStorage.setItem('saas_lancamentos', JSON.stringify(lancamentos));
    } catch (e) {
      // armazenamento indisponível — ignora silenciosamente
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
    } catch (e) {
      // ignora
    }
  }
};

Store.carregar();
