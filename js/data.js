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
var CRP_PADRAO = '04/74163'; // CRP informado pela profissional — aparece no recibo
var dadosProfissional = { nome: '', crp: CRP_PADRAO, cpf: '', assinatura: '' }; // usado no recibo

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
      localStorage.setItem('saas_evolucoes', JSON.stringify(evolucoes));
      localStorage.setItem('saas_dados_profissional', JSON.stringify(dadosProfissional));
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
    } catch (e) {
      // ignora
    }
  }
};

Store.carregar();
