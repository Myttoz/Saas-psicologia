// ============================================================================
// Backend opcional (Supabase) — login e sincronização dos dados
// Se CONFIG.usarBackend for false, este arquivo não faz nada e o sistema
// continua funcionando somente com localStorage, como antes.
// A chave anon é pública; a proteção real é a RLS em supabase/schema.sql.
// ============================================================================

var Backend = {

  CHAVE_TOKEN: 'saas_auth_token',
  CHAVE_USUARIO: 'saas_auth_usuario',
  CHAVE_SYNC: 'saas_sync_at',
  CHAVE_STATE: 'saas_oauth_state',
  _timer: null,

  // Número aleatório que liga o retorno do Google à solicitação feita aqui.
  _novoState: function() {
    var bytes = new Uint8Array(24);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var s = '';
    for (var j = 0; j < bytes.length; j++) s += ('0' + bytes[j].toString(16)).slice(-2);
    return s;
  },

  _limparHash: function(loc) {
    var limpa = (loc.pathname || '') + (loc.search || '');
    try {
      if (window.history && window.history.replaceState) window.history.replaceState(null, '', limpa);
      else loc.hash = '';
    } catch (e) {}
  },

  configurado: function() {
    return !!(typeof CONFIG !== 'undefined' && CONFIG.usarBackend &&
      CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
  },

  conectado: function() {
    return !!(this.token() && this.usuario());
  },

  token: function() {
    try { return sessionStorage.getItem(this.CHAVE_TOKEN); } catch (e) { return null; }
  },

  usuario: function() {
    try {
      var raw = sessionStorage.getItem(this.CHAVE_USUARIO);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  base: function() {
    return String(CONFIG.supabaseUrl).replace(/\/+$/, '');
  },

  headers: function(comToken) {
    var h = {
      'apikey': CONFIG.supabaseAnonKey,
      'Content-Type': 'application/json'
    };
    if (comToken && this.token()) h['Authorization'] = 'Bearer ' + this.token();
    return h;
  },

  mensagem: function(texto, erro) {
    var el = document.getElementById('loginErro');
    if (!el) return;
    el.textContent = texto || '';
    el.style.display = texto ? 'block' : 'none';
    el.style.color = erro ? '#C16A4A' : 'var(--text-muted)';
  },

  // Chamado pelo app.init()
  iniciar: function() {
    if (!this.configurado()) return;
    if (this.processarRetorno()) return;
    if (typeof fetch !== 'function') {
      app.toast('Este navegador não suporta sincronização online.');
      return;
    }
    if (!this.conectado()) {
      this.mostrarLogin();
      return;
    }
    this.verificarSessao();
  },

  mostrarLogin: function() {
    var email = document.getElementById('loginEmail');
    var senha = document.getElementById('loginSenha');
    if (email) email.value = '';
    if (senha) senha.value = '';
    this.mensagem('');
    app.abrirModal('modalLogin');
    if (email) { try { email.focus(); } catch (e) {} }
  },

  entrar: function() {
    var email = document.getElementById('loginEmail');
    var senha = document.getElementById('loginSenha');
    var usuario = email ? email.value.trim() : '';
    var senhaValor = senha ? senha.value : '';

    if (!usuario || !senhaValor) {
      this.mensagem('Informe o e-mail e a senha.', true);
      return false;
    }

    var self = this;
    fetch(this.base() + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: this.headers(false),
      body: JSON.stringify({ email: usuario, password: senhaValor })
    }).then(function(resposta) {
      return resposta.json().then(function(dados) {
        if (!resposta.ok || !dados.access_token) {
          throw new Error('E-mail ou senha incorretos.');
        }
        try {
          sessionStorage.setItem(self.CHAVE_TOKEN, dados.access_token);
          sessionStorage.setItem(self.CHAVE_USUARIO, JSON.stringify(
            dados.user || { id: (dados.user && dados.user.id) || '', email: usuario }
          ));
        } catch (e) {}
        app.fecharModal('modalLogin');
        app.toast('Conectado. Sincronizando dados...');
        self.sincronizarNoInicio();
      });
    }).catch(function(erro) {
      self.mensagem(erro.message || 'Não foi possível conectar. Tente novamente.', true);
    });
    return false;
  },

  // Login com Google: abremos a página do Google no Supabase, que devolve o
  // usuário para o endereço deste site. As credenciais do Google ficam só no
  // Supabase — nunca entram no código do site.
  entrarComGoogle: function() {
    if (!this.configurado()) return;
    var loc = (typeof window !== 'undefined' && window.location) ? window.location : null;
    if (!loc || typeof loc.href !== 'string') return;
    var retorno = loc.href.split('#')[0];
    var state = this._novoState();
    try { sessionStorage.setItem(this.CHAVE_STATE, state); } catch (e) {}
    var url = this.base() + '/auth/v1/authorize?provider=google' +
      '&apikey=' + encodeURIComponent(CONFIG.supabaseAnonKey) +
      '&redirect_to=' + encodeURIComponent(retorno) +
      '&state=' + encodeURIComponent(state);
    window.location.href = url;
  },

  // Depois do login com Google, o token vem no final da URL (#access_token=...).
  // Só aceitamos se o "state" conferir com o número gerado quando o botão foi
  // clicado. Isso bloqueia links falsos que tentam trocar a conta da pessoa.
  processarRetorno: function() {
    var loc = (typeof window !== 'undefined' && window.location) ? window.location : null;
    if (!loc || typeof loc.hash !== 'string') return false;
    var hash = loc.hash.replace(/^#/, '');
    if (!hash) return false;

    var partes = {};
    hash.split('&').forEach(function(item) {
      var i = item.indexOf('=');
      if (i < 0) return;
      try {
        partes[decodeURIComponent(item.slice(0, i))] =
          decodeURIComponent(item.slice(i + 1).replace(/\+/g, ' '));
      } catch (e) {}
    });

    if (partes.error || !partes.access_token) {
      this._limparHash(loc);
      this.mostrarLogin();
      this.mensagem('O login com Google não foi concluído. Tente novamente.', true);
      return true;
    }

    var esperado = null;
    try {
      esperado = sessionStorage.getItem(this.CHAVE_STATE);
      sessionStorage.removeItem(this.CHAVE_STATE);
    } catch (e) {}

    // Se já havia uma sessão válida, um retorno sem state não pode substituí-la.
    if (!esperado || partes.state !== esperado) {
      this._limparHash(loc);
      this.mostrarLogin();
      this.mensagem('Login recusado por segurança. Use o botão Entrar com Google novamente.', true);
      return true;
    }

    var usuario = null;
    try {
      var payload = partes.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4) payload += '=';
      var dados = JSON.parse(atob(payload));
      usuario = {
        id: dados.sub || '',
        email: dados.email || '',
        nome: (dados.user_metadata && dados.user_metadata.full_name) || ''
      };
    } catch (e) {}

    try {
      sessionStorage.setItem(this.CHAVE_TOKEN, partes.access_token);
      if (usuario && usuario.id) sessionStorage.setItem(this.CHAVE_USUARIO, JSON.stringify(usuario));
    } catch (e) {}

    this._limparHash(loc);

    try { window.location.reload(); } catch (e) {}
    return true;
  },

  sair: function() {
    try {
      sessionStorage.removeItem(this.CHAVE_TOKEN);
      sessionStorage.removeItem(this.CHAVE_USUARIO);
      sessionStorage.removeItem(this.CHAVE_STATE);
    } catch (e) {}
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },

  verificarSessao: function() {
    var self = this;
    return fetch(this.base() + '/auth/v1/user', {
      headers: this.headers(true)
    }).then(function(resposta) {
      if (!resposta.ok) throw new Error('Sessão expirada.');
      self.sincronizarNoInicio();
    }).catch(function() {
      self.sair();
      self.mostrarLogin();
    });
  },

  // Dados enviados para a nuvem (mesmo conteúdo do backup, com data de controle)
  coletarDados: function() {
    return {
      app: 'saas-livia',
      versao: 3,
      fontes: fontes,
      pacientes: pacientes,
      lancamentos: lancamentos,
      evolucoes: evolucoes,
      dadosProfissional: dadosProfissional,
      atualizadoEm: new Date().toISOString()
    };
  },

  carregar: function() {
    var usuario = this.usuario();
    if (!usuario || !usuario.id) return Promise.resolve(null);

    var url = this.base() + '/rest/v1/dados?select=conteudo&user_id=eq.' +
      encodeURIComponent(usuario.id);

    return fetch(url, { headers: this.headers(true) })
      .then(function(resposta) {
        if (!resposta.ok) throw new Error('Não foi possível ler os dados da nuvem.');
        return resposta.json();
      })
      .then(function(linhas) {
        return linhas && linhas.length ? linhas[0].conteudo : null;
      });
  },

  salvar: function(dados) {
    var usuario = this.usuario();
    if (!usuario || !usuario.id) return Promise.resolve(false);

    var url = this.base() + '/rest/v1/dados?on_conflict=user_id';
    var headers = this.headers(true);
    headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';

    return fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        user_id: usuario.id,
        conteudo: dados,
        atualizado_em: new Date().toISOString()
      })
    }).then(function(resposta) {
      return resposta.ok;
    }).catch(function() {
      return false;
    });
  },

  // Usado por Store.salvar(): agrupa várias alterações em um único envio
  salvarSeConectado: function() {
    if (!this.configurado() || !this.conectado()) return;
    if (this._timer) clearTimeout(this._timer);
    var self = this;
    this._timer = setTimeout(function() {
      self._timer = null;
      self.salvar(self.coletarDados()).then(function(ok) {
        if (ok) {
          try { sessionStorage.setItem(self.CHAVE_SYNC, new Date().toISOString()); } catch (e) {}
        }
      });
    }, 1500);
  },

  // No login: escolhe a versão mais recente (nuvem ou navegador)
  sincronizarNoInicio: function() {
    var self = this;
    return this.carregar().then(function(remoto) {
      var localEm = '';
      try { localEm = sessionStorage.getItem(self.CHAVE_SYNC) || ''; } catch (e) {}
      var remotoEm = remoto && remoto.atualizadoEm ? remoto.atualizadoEm : '';

      // Conta nova: nunca enviamos os dados locais sem a pessoa pedir.
      // Isso evita que um login indevido copie o prontuário para outra conta.
      if (!remoto) {
        var enviarNovo = confirm(
          'Esta conta ainda não tem dados na nuvem.\n\n' +
          'Deseja enviar os dados deste navegador para a nuvem?\n' +
          'Clique em Cancelar para começar do zero nesta conta.'
        );
        if (enviarNovo) {
          self.salvar(self.coletarDados()).then(function(ok) {
            if (ok) app.toast('Dados deste navegador enviados para a nuvem.');
          });
        }
        return;
      }

      if (remotoEm > localEm) {
        var usarNuvem = confirm(
          'Foram encontrados dados salvos na nuvem (' +
          remotoEm.slice(0, 10) + ').\n\n' +
          'Clique em OK para usar os dados da nuvem neste navegador.\n' +
          'Clique em Cancelar para manter os dados deste navegador.'
        );
        if (usarNuvem) {
          backupModulo._aplicarDados(remoto);
          app.toast('Dados da nuvem carregados.');
          return;
        }
      }

      var substituir = confirm(
        'Enviar os dados deste navegador para a nuvem?\n\n' +
        'Os dados que estavam salvos nesta conta serão substituídos.'
      );
      if (!substituir) {
        backupModulo._aplicarDados(remoto);
        app.toast('Dados da nuvem carregados.');
        return;
      }

      self.salvar(self.coletarDados()).then(function(ok) {
        if (ok) app.toast('Dados deste navegador enviados para a nuvem.');
      });
    }).catch(function() {
      app.toast('Não foi possível sincronizar. Os dados locais continuam disponíveis.');
    });
  }

};

window.Backend = Backend;
