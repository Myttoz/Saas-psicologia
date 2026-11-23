// ============================================================================
// Meses — navegação mensal clicável (12 meses do ano em uso na Gestão Anual)
// ============================================================================

var mesesModulo = {

  ano: new Date().getFullYear(),

  nomes: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],

  siglas: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
           'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],

  selecao: {
    lancamentos: '',
    resumos: '',
    situacao: ''
  },

  init: function() {
    var ano = (typeof anoAtivo !== 'undefined' && anoAtivo) ? anoAtivo : new Date().getFullYear();
    this.ano = ano;
    this.reiniciarSelecao(ano);
  },

  // Chamado quando o ano muda na Gestão Anual: mantém o número do mês, troca o ano.
  reiniciarSelecao: function(ano) {
    var mes = new Date().getMonth() + 1;
    var contexto;
    for (contexto in this.selecao) {
      if (!Object.prototype.hasOwnProperty.call(this.selecao, contexto)) continue;
      var atual = this.selecao[contexto];
      if (atual && atual.indexOf('-') !== -1) {
        mes = parseInt(atual.split('-')[1], 10) || mes;
      }
      this.selecao[contexto] = ano + '-' + String(mes).padStart(2, '0');
      this.render(this.idDoElemento(contexto), contexto);
    }
  },

  idDoElemento: function(contexto) {
    return 'meses' + contexto.charAt(0).toUpperCase() + contexto.slice(1);
  },

  render: function(elementoId, contexto) {
    var el = document.getElementById(elementoId);
    if (!el) return;

    var html = '';
    for (var i = 0; i < 12; i++) {
      var valor = this.ano + '-' + String(i + 1).padStart(2, '0');
      var ativo = (this.selecao[contexto] === valor) ? ' active' : '';
      html += '<button type="button" class="month-btn' + ativo + '" ' +
              'title="' + this.nomes[i] + ' de ' + this.ano + '" ' +
              'onclick="mesesModulo.selecionar(\'' + contexto + '\',\'' + valor + '\')">' +
              this.siglas[i] + '</button>';
    }
    el.innerHTML = html;
  },

  selecionar: function(contexto, valor) {
    this.selecao[contexto] = valor;
    this.render(this.idDoElemento(contexto), contexto);

    if (contexto === 'lancamentos' && typeof lancamentosRender === 'function') {
      lancamentosRender();
    } else if (contexto === 'resumos' && typeof resumosModulo !== 'undefined') {
      resumosModulo.render();
    } else if (contexto === 'situacao' && typeof situacaoModulo !== 'undefined') {
      situacaoModulo.render();
    }
  },

  rotulo: function(valor) {
    if (!valor) return '';
    var partes = valor.split('-');
    var indice = parseInt(partes[1], 10) - 1;
    if (indice < 0 || indice > 11) return valor;
    return this.nomes[indice] + '/' + partes[0];
  },

  mesAtual: function(contexto) {
    return this.selecao[contexto] || (this.ano + '-01');
  }

};

window.mesesModulo = mesesModulo;
