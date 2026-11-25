// ============================================================================
// Portal do paciente — login, primeiro acesso, recados.
// Usa apenas a chave anon. Nunca usa service_role.
// Sessão separada da sessão da psicóloga (chaves próprias no sessionStorage).
// ============================================================================

var PortalApp = {
  CHAVE_TOKEN: 'portal_auth_token',
  CHAVE_REFRESH: 'portal_auth_refresh',
  CHAVE_USUARIO: 'portal_auth_usuario',
  _pacientePortalId: null,
  _usuario: null,

  base: function() {
    return String(CONFIG.supabaseUrl || '').replace(/\/+$/, '');
  },

  headers: function(comToken) {
    var h = { 'apikey': CONFIG.supabaseAnonKey, 'Content-Type': 'application/json' };
    if (comToken && this.token()) h['Authorization'] = 'Bearer ' + this.token();
    return h;
  },

  token: function() { try { return sessionStorage.getItem(this.CHAVE_TOKEN); } catch (e) { return null; } },
  refreshToken: function() { try { return sessionStorage.getItem(this.CHAVE_REFRESH); } catch (e) { return null; } },

  _guardarSessao: function(sessao) {
    try {
      sessionStorage.setItem(this.CHAVE_TOKEN, sessao.token || '');
      if (sessao.refresh_token) sessionStorage.setItem(this.CHAVE_REFRESH, sessao.refresh_token);
      sessionStorage.setItem(this.CHAVE_USUARIO, JSON.stringify(sessao.usuario || {}));
    } catch (e) {}
    this._usuario = sessao.usuario || null;
  },

  _limparSessao: function() {
    try {
      sessionStorage.removeItem(this.CHAVE_TOKEN);
      sessionStorage.removeItem(this.CHAVE_REFRESH);
      sessionStorage.removeItem(this.CHAVE_USUARIO);
    } catch (e) {}
    this._usuario = null;
    this._pacientePortalId = null;
  },

  _msg: function(texto, tipo) {
    var el = document.getElementById('portalMsg');
    if (!el) return;
    el.className = 'portal-msg ' + (tipo || '');
    el.textContent = texto || '';
    el.style.display = texto ? 'block' : 'none';
  },

  _msgLogado: function(texto, tipo) {
    var el = document.getElementById('portalMsgLogado');
    if (!el) return;
    el.className = 'portal-msg ' + (tipo || '');
    el.textContent = texto || '';
    el.style.display = texto ? 'block' : 'none';
  },

  _mostrar: function(id, mostrar) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('portal-hidden', !mostrar);
  },

  _resposta: function(r) {
    return r.json().catch(function() { return {}; }).then(function(d) {
      if (!r.ok) {
        var msg = d.msg || d.message || d.error_description || d.error || 'Erro na solicitação.';
        var err = new Error(msg);
        err.dados = d;
        throw err;
      }
      return d;
    });
  },

  iniciar: function() {
    var self = this;
    this._mostrar('portalAreaLogada', false);
    this._mostrar('portalViewSenha', false);
    this._mostrar('portalViewLogin', true);

    var tokenUrl = Portal.lerTokenDaUrl(window.location.hash);
    if (tokenUrl.erro) {
      this._msg(tokenUrl.erro, 'erro');
      this._limparHash();
    }

    if (tokenUrl.token) {
      this._guardarSessao({
        token: tokenUrl.token,
        refresh_token: tokenUrl.refresh,
        usuario: {}
      });
      this._limparHash();
      this._msg('Confirmando seu acesso...', 'ok');
      return this._aposTokenMagicLink().catch(function(err) {
        self._msg(err.message || 'Não foi possível confirmar seu acesso.', 'erro');
        self._limparSessao();
      });
    }

    if (this.token()) {
      return this._carregarUsuario().then(function() {
        return self._abrirAreaLogada();
      }).catch(function() {
        self._limparSessao();
        self._mostrar('portalViewLogin', true);
      });
    }
  },

  _limparHash: function() {
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (e) {}
  },

  _carregarUsuario: function() {
    var self = this;
    return fetch(this.base() + '/auth/v1/user', { headers: this.headers(true) })
      .then(this._resposta)
      .then(function(u) {
        self._usuario = u;
        try { sessionStorage.setItem(self.CHAVE_USUARIO, JSON.stringify(u || {})); } catch (e) {}
        return u;
      });
  },

  _aposTokenMagicLink: function() {
    var self = this;
    return this._carregarUsuario().then(function() {
      return self._aceitarConvite();
    }).then(function() {
      self._msg('', '');
      self._mostrar('portalViewLogin', false);
      self._mostrar('portalViewSenha', true);
      document.getElementById('portalAuthSub').textContent = 'Crie sua senha de acesso';
      var campo = document.getElementById('portalNovaSenha');
      if (campo) try { campo.focus(); } catch (e) {}
    });
  },

  _aceitarConvite: function() {
    var self = this;
    return fetch(this.base() + '/rest/v1/rpc/portal_aceitar_convite', {
      method: 'POST',
      headers: this.headers(true),
      body: '{}'
    }).then(this._resposta).then(function(id) {
      self._pacientePortalId = id;
      return id;
    }).catch(function(err) {
      // Se já foi aceito antes, tenta seguir buscando o acesso.
      return self._buscarAcesso().then(function() {
        if (self._pacientePortalId) return self._pacientePortalId;
        throw err;
      });
    });
  },

  _buscarAcesso: function() {
    var self = this;
    return fetch(this.base() + '/rest/v1/portal_acessos?select=paciente_portal_id&limit=1', {
      headers: this.headers(true)
    }).then(this._resposta).then(function(linhas) {
      self._pacientePortalId = (linhas && linhas[0] && linhas[0].paciente_portal_id) || null;
      return self._pacientePortalId;
    });
  },

  atualizarForca: function() {
    var senha = (document.getElementById('portalNovaSenha') || {}).value || '';
    var f = Portal.forcaSenha(senha);
    var el = document.getElementById('portalForca');
    if (el) {
      el.textContent = f.mensagem;
      el.style.color = f.ok ? '#2F5D46' : '#6B7C72';
    }
  },

  sugerirSenha: function() {
    var s = Portal.sugerirSenha();
    var a = document.getElementById('portalNovaSenha');
    var b = document.getElementById('portalNovaSenha2');
    if (a) a.value = s;
    if (b) b.value = s;
    this.atualizarForca();
    this._msg('Senha sugerida preenchida. Guarde-a em local seguro.', 'ok');
  },

  salvarSenha: function() {
    var self = this;
    var s1 = ((document.getElementById('portalNovaSenha') || {}).value || '');
    var s2 = ((document.getElementById('portalNovaSenha2') || {}).value || '');
    var forca = Portal.forcaSenha(s1);
    if (!forca.ok) { this._msg(forca.mensagem, 'erro'); return; }
    if (s1 !== s2) { this._msg('As senhas não são iguais.', 'erro'); return; }

    this._msg('Salvando senha...', 'ok');
    fetch(this.base() + '/auth/v1/user', {
      method: 'PUT',
      headers: this.headers(true),
      body: JSON.stringify({ password: s1 })
    }).then(this._resposta).then(function() {
      self._msg('Senha criada com sucesso.', 'ok');
      return self._abrirAreaLogada();
    }).catch(function(err) {
      self._msg(err.message || 'Não foi possível salvar a senha.', 'erro');
    });
  },

  entrar: function() {
    var self = this;
    var email = ((document.getElementById('portalEmail') || {}).value || '').trim();
    var senha = ((document.getElementById('portalSenha') || {}).value || '');
    if (!email || !senha) { this._msg('Informe e-mail e senha.', 'erro'); return; }
    this._msg('Entrando...', 'ok');

    fetch(this.base() + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': CONFIG.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: senha })
    }).then(this._resposta).then(function(d) {
      self._guardarSessao({
        token: d.access_token,
        refresh_token: d.refresh_token,
        usuario: d.user || {}
      });
      return self._carregarUsuario();
    }).then(function() {
      return self._aceitarConvite();
    }).then(function() {
      return self._abrirAreaLogada();
    }).catch(function(err) {
      var msg = err.message || 'Não foi possível entrar.';
      if (/Invalid login credentials/i.test(msg)) msg = 'E-mail ou senha incorretos.';
      self._msg(msg, 'erro');
    });
  },

  _abrirAreaLogada: function() {
    var self = this;
    this._msg('', '');
    this._mostrar('portalCardAuth', false);
    this._mostrar('portalAreaLogada', true);
    return this._buscarAcesso().then(function() {
      return self._carregarPerfil();
    }).then(function() {
      return self._carregarRecados();
    });
  },

  _carregarPerfil: function() {
    var self = this;
    if (!this._pacientePortalId) return Promise.resolve();
    return fetch(this.base() + '/rest/v1/portal_pacientes?select=nome&id=eq.' + encodeURIComponent(this._pacientePortalId) + '&limit=1', {
      headers: this.headers(true)
    }).then(this._resposta).then(function(linhas) {
      var nome = (linhas && linhas[0] && linhas[0].nome) || '';
      var boas = document.getElementById('portalBoasVindas');
      if (boas) boas.textContent = nome ? 'Olá, ' + nome.split(' ')[0] : 'Olá';
    }).catch(function() {});
  },

  _carregarRecados: function() {
    var self = this;
    if (!this._pacientePortalId) return Promise.resolve();
    var url = this.base() + '/rest/v1/portal_recados?select=id,autor,texto,criado_em&paciente_portal_id=eq.' +
      encodeURIComponent(this._pacientePortalId) + '&order=criado_em.asc&limit=200';
    return fetch(url, { headers: this.headers(true) })
      .then(this._resposta)
      .then(function(lista) { self._renderRecados(lista || []); })
      .catch(function(err) {
        self._msgLogado(err.message || 'Não foi possível carregar os recados.', 'erro');
      });
  },

  _renderRecados: function(lista) {
    var el = document.getElementById('portalRecadosLista');
    var tag = document.getElementById('portalRecadosTag');
    if (tag) tag.textContent = String(lista.length);
    if (!el) return;
    if (!lista.length) {
      el.className = 'portal-lista-vazia';
      el.textContent = 'Nenhum recado ainda.';
      return;
    }
    el.className = '';
    var html = '';
    for (var i = 0; i < lista.length; i++) {
      var r = lista[i];
      var autor = r.autor === 'paciente' ? 'Você' : 'Psicóloga';
      var cls = r.autor === 'paciente' ? 'portal-recado' : 'portal-recado profissional';
      var quando = this._formatarDataHora(r.criado_em);
      html += '<div class="' + cls + '">' +
        '<div class="meta">' + this._esc(autor) + ' · ' + this._esc(quando) + '</div>' +
        '<div class="texto">' + this._esc(r.texto || '') + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  },

  _formatarDataHora: function(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(iso); }
  },

  _esc: function(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  enviarRecado: function() {
    var self = this;
    var campo = document.getElementById('portalRecadoTexto');
    var texto = ((campo && campo.value) || '').trim();
    if (!texto) { this._msgLogado('Escreva uma mensagem antes de enviar.', 'erro'); return; }
    if (!this._pacientePortalId) { this._msgLogado('Acesso do portal não identificado.', 'erro'); return; }
    this._msgLogado('Enviando...', 'ok');

    fetch(this.base() + '/rest/v1/portal_recados', {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify({
        paciente_portal_id: this._pacientePortalId,
        autor: 'paciente',
        texto: texto.slice(0, 2000)
      })
    }).then(this._resposta).then(function() {
      if (campo) campo.value = '';
      self._msgLogado('Resposta enviada.', 'ok');
      return self._carregarRecados();
    }).catch(function(err) {
      self._msgLogado(err.message || 'Não foi possível enviar a resposta.', 'erro');
    });
  },

  sair: function() {
    this._limparSessao();
    this._mostrar('portalAreaLogada', false);
    this._mostrar('portalCardAuth', true);
    this._mostrar('portalViewSenha', false);
    this._mostrar('portalViewLogin', true);
    document.getElementById('portalAuthSub').textContent = 'Acesse seus recados e informações.';
    this._msg('Você saiu do portal.', 'ok');
  }
};

window.PortalApp = PortalApp;
document.addEventListener('DOMContentLoaded', function() { PortalApp.iniciar(); });
