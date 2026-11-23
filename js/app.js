// ============================================================================
// App — navegação, modais, utilitários de UI
// ============================================================================

var app = {

  // Inicializa a aplicação
  init: function() {
    // inicializa máscaras e listeners globais
    this._setupMascaras();
    this._setupAtalhos();

    // inicializa drag-to-scroll nas tabelas
    this._setupDragScroll();

    // gestão anual primeiro: define o ano em uso antes dos cabeçalhos de meses
    if (typeof gestaoAnualModulo !== 'undefined' && gestaoAnualModulo.inicializar()) {
      if (typeof Store !== 'undefined') Store.salvar();
    }
    if (typeof mesesModulo !== 'undefined') mesesModulo.init();

    // mostra a data do último backup automático
    if (typeof backupModulo !== 'undefined') backupModulo.init();

    // se a nuvem estiver configurada, pede login e sincroniza
    if (typeof Backend !== 'undefined') Backend.iniciar();

    // permite instalar no celular (somente depois de publicado em HTTPS)
    this.registrarServiceWorker();

    // renderiza página inicial
    this.trocarPagina('hoje');
  },

  // O service worker só funciona em HTTPS (ou localhost); em file:// é ignorado.
  registrarServiceWorker: function() {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    if (location.protocol === 'file:') return;

    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js').catch(function() {
        // sem registro não atrapalha o uso normal do sistema
      });
    });
  },

  // ---------- Navegação ----------

  trocarPagina: function(id) {
    // esconde todas as páginas
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }

    // mostra a página alvo
    var alvo = document.getElementById('page-' + id);
    if (alvo) alvo.classList.add('active');

    // atualiza título da topbar (mobile)
    var tituloEl = document.getElementById('pageTitle');
    if (tituloEl) {
      var titulos = {
        hoje: 'Hoje',
        agenda: 'Agenda',
        resumos: 'Resumos',
        lancamentos: 'Lançamentos',
        anos: 'Anos',
        fontes: 'Convênios',
        pacientes: 'Pacientes',
        prontuario: 'Prontuário',
        situacao: 'Situação Paciente'
      };
      tituloEl.textContent = titulos[id] || id;
    }

    // fecha sidebar no mobile
    var sb = document.getElementById('sidebar');
    if (sb && window.innerWidth <= 768) {
      sb.classList.remove('mobile-open');
    }

    // marca item ativo no menu lateral
    var navItens = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItens.length; i++) {
      navItens[i].classList.remove('active');
    }
    var alvoItem = document.querySelector('.nav-item[onclick="app.trocarPagina(\'' + id + '\')"]');
    if (alvoItem) alvoItem.classList.add('active');

    // renderiza conteúdo da página
    this.renderizarPagina(id);
  },

  toggleSidebar: function() {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('mobile-open');
  },

  // Login é obrigatório quando a nuvem está ligada. Enquanto a tela de login
  // estiver aberta, clique fora e ESC não podem liberar o acesso ao sistema.
  loginVisivel: function() {
    var login = document.getElementById('modalLogin');
    return !!(login && login.classList.contains('show-modal'));
  },

  // Impede que o teclado (Tab/Enter) alcance botões do sistema por trás do login.
  _setAppInerte: function(inerte) {
    var raiz = document.querySelector('.app');
    if (!raiz || !('inert' in raiz) || !raiz.children) return;
    for (var i = 0; i < raiz.children.length; i++) {
      if (raiz.children[i].id !== 'overlay') raiz.children[i].inert = inerte;
    }
  },

  fecharModais: function() {
    if (this.loginVisivel()) return;
    var modais = document.querySelectorAll('.modal');
    for (var i = 0; i < modais.length; i++) {
      modais[i].classList.remove('show-modal');
    }
    var overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.classList.remove('login-fundo');
    }
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('mobile-open');
  },

  renderizarPagina: function(id) {
    if (id === 'hoje' && typeof hojeModulo !== 'undefined') {
      hojeModulo.render();
    }
    if (id === 'agenda' && typeof agendaModulo !== 'undefined') {
      agendaModulo.render();
    }
    if (id === 'fontes' && typeof fontesRender === 'function') fontesRender();
    if (id === 'pacientes' && typeof pacientesRender === 'function') pacientesRender();
    if (id === 'lancamentos' && typeof lancamentosRender === 'function') {
      if (typeof preencherFontesSelects === 'function') preencherFontesSelects();
      lancamentosRender();
    }
    if (id === 'anos' && typeof gestaoAnualModulo !== 'undefined') {
      gestaoAnualModulo.render();
    }
    if (id === 'situacao' && typeof situacaoModulo !== 'undefined') {
      situacaoModulo.render();
    }
    if (id === 'prontuario' && typeof prontuarioModulo !== 'undefined') {
      prontuarioModulo.render();
    }
    if (id === 'resumos' && typeof resumosModulo !== 'undefined') {
      resumosModulo.render();
    }
  },

  // ---------- Utilitários de UI ----------

  // ícones reutilizados nos botões de ação das tabelas
  icone: function(nome) {
    var caminhos = {
      editar: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
              '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
      excluir: '<polyline points="3 6 5 6 21 6"></polyline>' +
               '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
      duplicar: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
                '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
      pago: '<polyline points="20 6 9 17 4 12"></polyline>',
      pendente: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path>' +
                '<polyline points="3 3 3 8 8 8"></polyline>'
    };
    return '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" ' +
           'stroke-linecap="round" stroke-linejoin="round" fill="none">' +
           (caminhos[nome] || '') + '</svg>';
  },

  botaoAcao: function(rotulo, onclick, icone, perigo) {
    return '<button type="button" class="btn btn-action' + (perigo ? ' perigo' : '') + '" ' +
           'onclick="' + onclick + '" title="' + rotulo + '">' +
           this.icone(icone) + '<span>' + rotulo + '</span></button>';
  },

  toast: function(msg) {
    var t = document.getElementById('toast');
    if (t) {
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(function() { t.classList.remove('show'); }, 2200);
    }
  },

  abrirModal: function(id) {
    var m = document.getElementById(id);
    var overlay = document.getElementById('overlay');
    var html = document.documentElement;
    // O login tem fundo próprio: a tela do sistema fica totalmente encoberta.
    if (id === 'modalLogin') {
      if (overlay) overlay.classList.add('login-fundo');
      this._setAppInerte(true);
      if (html && html.classList) html.classList.add('app-bloqueado');
    }
    if (m) m.classList.add('show-modal');
    if (overlay) overlay.classList.add('open');
  },

  fecharModal: function(id) {
    var m = document.getElementById(id);
    var overlay = document.getElementById('overlay');
    var html = document.documentElement;
    if (m) m.classList.remove('show-modal');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.classList.remove('login-fundo');
    }
    if (id === 'modalLogin') {
      this._setAppInerte(false);
      if (html && html.classList) html.classList.remove('app-bloqueado');
    }
  },

  sair: function() {
    if (confirm('Sair do sistema?')) {
      // Ao sair, nada de clínico pode ficar legível neste navegador.
      if (typeof segurancaModulo !== 'undefined') segurancaModulo.bloquear();
      if (typeof backupModulo !== 'undefined' && backupModulo.aplicarVazio) {
        backupModulo.aplicarVazio();
      }
      if (typeof Backend !== 'undefined' && Backend.configurado()) {
        Backend.sair();
        this.trocarPagina('resumos');
        Backend.mostrarLogin();
        return;
      }
      this.trocarPagina('resumos');
    }
  },

  abrirModalPaciente: function() {
    if (typeof pacientesModulo !== 'undefined') {
      pacientesModulo.abrirModal();
    }
  },

  // ---------- Máscaras ----------

  _setupMascaras: function() {
    var pacValor = document.getElementById('pacValor');
    if (pacValor) {
      pacValor.addEventListener('input', function() { app.mascaraValor(this); });
    }
    var pacNome = document.getElementById('pacNome');
    if (pacNome) {
      pacNome.addEventListener('input', function() { app.formatarNome(this); });
    }
    var fonteValorFixo = document.getElementById('fonteValorFixo');
    if (fonteValorFixo) {
      fonteValorFixo.addEventListener('input', function() { app.mascaraValor(this); });
    }
    var lancValor = document.getElementById('lancValor');
    if (lancValor) {
      lancValor.addEventListener('input', function() { app.mascaraValor(this); });
    }
  },

  mascaraValor: function(input) {
    var v = input.value.replace(/\D/g, '');
    if (v === '') {
      input.value = '';
      return;
    }
    v = (parseInt(v, 10) / 100).toFixed(2);
    v = v.replace('.', ',');
    var partes = v.split(',');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = partes.join(',');
  },

  formatarNome: function(input) {
    var inicio = input.selectionStart;
    var fim = input.selectionEnd;
    var v = input.value.toLowerCase().replace(/\b\w/g, function(l) {
      return l.toUpperCase();
    });
    input.value = v;
    // mantém o cursor onde o usuário estava digitando
    try { input.setSelectionRange(inicio, fim); } catch (e) {}
  },

  // ---------- Atalhos de teclado ----------

  _setupAtalhos: function() {
    document.addEventListener('keydown', function(e) {
      // Enquanto o login estiver na tela, nenhum atalho age no sistema.
      if (app.loginVisivel()) return;

      // Ctrl + O (ou Command + O) — abre novo conforme aba atual
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        var paginaAtiva = document.querySelector('.page.active');
        if (!paginaAtiva) return;
        var id = paginaAtiva.id.replace('page-', '');
        if (id === 'lancamentos' && typeof lancamentosModulo !== 'undefined') {
          lancamentosModulo.abrirModal();
        } else if (id === 'fontes' && typeof fontesModulo !== 'undefined') {
          fontesModulo.abrirModalNovaFonte();
        } else if (id === 'pacientes' && typeof pacientesModulo !== 'undefined') {
          pacientesModulo.abrirModal();
        } else if (id === 'prontuario' && typeof prontuarioModulo !== 'undefined') {
          prontuarioModulo.abrirModal();
        } else if (id === 'situacao' && typeof situacaoModulo !== 'undefined') {
          // nada a abrir aqui
        } else {
          // padrão: lançamento
          if (typeof lancamentosModulo !== 'undefined') lancamentosModulo.abrirModal();
        }
      }
      // ESC para fechar modais
      if (e.key === 'Escape') {
        app.fecharModais();
      }
    });
  },

  // ---------- Drag-to-scroll em tabelas ----------

  _setupDragScroll: function() {
    var wraps = document.querySelectorAll('.table-wrap');
    for (var i = 0; i < wraps.length; i++) {
      (function(wrap) {
        var isDown = false;
        var startX;
        var scrollLeft;

        wrap.addEventListener('mousedown', function(e) {
          // não ativar se clicar em botão ou link
          if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
          isDown = true;
          wrap.classList.add('active');
          startX = e.pageX - wrap.offsetLeft;
          scrollLeft = wrap.scrollLeft;
        });

        wrap.addEventListener('mouseleave', function() {
          isDown = false;
          wrap.classList.remove('active');
        });

        wrap.addEventListener('mouseup', function() {
          isDown = false;
          wrap.classList.remove('active');
        });

        wrap.addEventListener('mousemove', function(e) {
          if (!isDown) return;
          e.preventDefault();
          var x = e.pageX - wrap.offsetLeft;
          var walk = (x - startX) * 2;
          wrap.scrollLeft = scrollLeft - walk;
        });
      })(wraps[i]);
    }
  }

};

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  app.init();
});
