// ============================================================================
// Backend (Supabase) — login, verificação em duas etapas e sincronização
// A nuvem é a fonte da verdade: ao entrar, os dados dela sempre são usados.
// A chave anon é pública; a proteção real é a RLS em supabase/schema.sql.
// A chave service_role nunca aparece aqui.
// ============================================================================

var Backend = {

  CHAVE_TOKEN: 'saas_auth_token',
  CHAVE_REFRESH: 'saas_auth_refresh',
  CHAVE_USUARIO: 'saas_auth_usuario',
  CHAVE_SYNC: 'saas_sync_at',
  CHAVE_MFA_RECUSADO: 'saas_mfa_recusado',

  _timer: null,
  _pendente: null,      // login/reautenticação esperando código de 2 etapas
  _modoMfa: '',         // 'convite' | 'enroll'
  _mfaEnroll: null,
  _mfaNome: '',
  _mfaOrigemPermanent: false,
  _reautenticarCallback: null,
  _aplicandoRemoto: false,

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

  refreshToken: function() {
    try { return sessionStorage.getItem(this.CHAVE_REFRESH); } catch (e) { return null; }
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

  headersComToken: function(token) {
    var h = this.headers(false);
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  },

  mensagem: function(texto, erro) {
    var el = document.getElementById('loginErro');
    if (!el) return;
    el.textContent = texto || '';
    el.style.display = texto ? 'block' : 'none';
    el.style.color = erro ? '#C16A4A' : 'var(--text-muted)';
  },

  mensagemMfa: function(texto, erro) {
    var el = document.getElementById('mfaErro');
    if (!el) return;
    el.textContent = texto || '';
    el.style.display = texto ? 'block' : 'none';
    el.style.color = erro ? '#C16A4A' : 'var(--text-muted)';
  },

  mensagemReaut: function(texto, erro) {
    var el = document.getElementById('reauthErro');
    if (!el) return;
    el.textContent = texto || '';
    el.style.display = texto ? 'block' : 'none';
    el.style.color = erro ? '#C16A4A' : 'var(--text-muted)';
  },

  // ---------- utilidades de rede ----------

  _resposta: function(resposta) {
    return resposta.json().catch(function() { return {}; }).then(function(dados) {
      if (!resposta.ok) {
        var erro = new Error(dados.msg || dados.message || 'Não foi possível concluir a operação.');
        erro.dados = dados;
        throw erro;
      }
      return dados;
    });
  },

  _post: function(caminho, headers, corpo) {
    return fetch(this.base() + caminho, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(corpo || {})
    }).then(this._resposta);
  },

  // Lê o conteúdo de um token JWT sem verificar a assinatura (o Supabase
  // verifica nas chamadas). Serve apenas para saber o nível de segurança (aal).
  decodificarJwt: function(token) {
    try {
      var parte = String(token || '').split('.')[1];
      if (!parte) return null;
      parte = parte.replace(/-/g, '+').replace(/_/g, '/');
      while (parte.length % 4) parte += '=';
      return JSON.parse(atob(parte));
    } catch (e) {
      return null;
    }
  },

  // ---------- verificação em duas etapas (MFA / TOTP) ----------

  _fatoresVerificados: function(usuario) {
    var lista = (usuario && Array.isArray(usuario.factors)) ? usuario.factors : [];
    var bons = [];
    for (var i = 0; i < lista.length; i++) {
      var f = lista[i];
      if (f && f.status === 'verified' && (f.factor_type === 'totp' || f.factor_type === 'phone')) {
        bons.push(f);
      }
    }
    return bons;
  },

  // Devolve true quando a conta tem 2º fator e a sessão ainda não passou por ele.
  verificarMfa: function(sessao) {
    var payload = this.decodificarJwt(sessao.token);
    if (payload && payload.aal === 'aal2') {
      sessao.fatores = [];
      return Promise.resolve(false);
    }
    var fatores = this._fatoresVerificados(sessao.usuario);
    sessao.fatores = fatores;
    return Promise.resolve(fatores.length > 0);
  },

  // Desafia o fator e troca o token por um de nível aal2.
  concluirDesafioMfa: function(codigo) {
    var p = this._pendente;
    if (!p) return Promise.reject(new Error('Não há verificação em duas etapas ativa.'));

    // Login, reautenticação e retomada de sessão guardam a sessão diretamente;
    // a ativação do fator usa um envelope. Normaliza os dois formatos aqui.
    if (!p.sessao && p.token) {
      p = this._pendente = {
        sessao: {
          token: p.token,
          refresh_token: p.refresh_token,
          usuario: p.usuario
        },
        fatores: p.fatores || [],
        mfa: !!p.mfa
      };
    }
    if (!p.fatores || !p.fatores.length) {
      return Promise.reject(new Error('Não há verificação em duas etapas ativa.'));
    }
    var codigoLimpo = String(codigo || '').replace(/\D/g, '');
    if (codigoLimpo.length !== 6) {
      return Promise.reject(new Error('Digite os 6 números do aplicativo.'));
    }
    var self = this;
    var fator = p.fatores[0];
    var headers = this.headersComToken(p.sessao.token);
    var id = encodeURIComponent(fator.id);

    return this._post('/auth/v1/factors/' + id + '/challenge', headers, {})
      .then(function(desafio) {
        if (!desafio || !desafio.id) throw new Error('Não foi possível iniciar a verificação. Tente de novo.');
        return self._post('/auth/v1/factors/' + id + '/verify', headers, {
          challenge_id: desafio.id,
          code: codigoLimpo
        });
      })
      .then(function(nova) {
        if (!nova || !nova.access_token) throw new Error('Código inválido ou expirado.');
        p.sessao = {
          token: nova.access_token,
          refresh_token: nova.refresh_token || p.sessao.refresh_token,
          usuario: nova.user || p.sessao.usuario
        };
        p.mfa = false;
        p.fatores = [];
        return p.sessao;
      });
  },

  _resolverMfa: function(campoId, erroId, aoSucesso) {
    var self = this;
    var campo = document.getElementById(campoId);
    var codigo = campo ? campo.value : '';
    this.concluirDesafioMfa(codigo).then(function(sessao) {
      self._pendente = null;
      if (campo) campo.value = '';
      aoSucesso(sessao);
    }).catch(function(erro) {
      var el = document.getElementById(erroId);
      if (el) {
        el.textContent = erro.message || 'Código inválido.';
        el.style.display = 'block';
        el.style.color = '#C16A4A';
      }
    });
  },

  _mostrarCampoMfa: function(grupoId, mensagem) {
    var grupo = document.getElementById(grupoId);
    if (grupo) grupo.style.display = 'block';
    var campo = grupoId === 'grupoMfaLogin' ?
      document.getElementById('loginMfaCodigo') : document.getElementById('reauthMfaCodigo');
    if (campo) { campo.value = ''; try { campo.focus(); } catch (e) {} }
    if (grupoId === 'grupoMfaLogin') this.mensagem(mensagem, false);
    else this.mensagemReaut(mensagem, false);
  },

  // ---------- convite para ativar o 2º fator ----------

  mostrarConviteMfaSeNecessario: function(usuario) {
    var fatores = this._fatoresVerificados(usuario);
    if (fatores.length) return;
    try {
      if (localStorage.getItem(this.CHAVE_MFA_RECUSADO) === '1') return;
    } catch (e) {}

    this._modoMfa = 'convite';
    this._mfaEnroll = null;
    this._mfaNome = '';
    this._mfaOrigemPermanent = false;
    var intro = document.getElementById('mfaIntro');
    if (intro) intro.textContent =
      'Proteja sua conta com um código que muda a cada 30 segundos. ' +
      'Use um aplicativo autenticador no celular (Google Authenticator, Authy, Microsoft Authenticator ou similar).';
    var qr = document.getElementById('mfaQr');
    if (qr) qr.style.display = 'none';
    var segredo = document.getElementById('mfaSegredo');
    if (segredo) segredo.style.display = 'none';
    var campo = document.getElementById('grupoMfaCodigo');
    if (campo) campo.style.display = 'none';
    var botao = document.getElementById('mfaBotao');
    if (botao) botao.textContent = 'Ativar agora';
    var secundario = document.getElementById('mfaSecundario');
    if (secundario) {
      secundario.textContent = 'Agora não';
      secundario.style.display = '';
    }
    var desativar = document.getElementById('mfaDesativar');
    if (desativar) desativar.style.display = 'none';
    this.mensagemMfa('');
    app.abrirModal('modalMfa');
  },

  ativarMfa: function() {
    var self = this;
    if (this._modoMfa !== 'convite') return;
    var nomeFator = this._mfaNome || 'App de autenticação';
    var headers = this.headersComToken(this.token());
    this._post('/auth/v1/factors', headers, {
      factor_type: 'totp',
      friendly_name: nomeFator
    }).then(function(dados) {
      if (!dados || !dados.id || !dados.totp) throw new Error('Não foi possível iniciar a ativação.');
      self._modoMfa = 'enroll';
      self._mfaEnroll = dados;

      var qr = document.getElementById('mfaQr');
      if (qr) {
        qr.innerHTML = '';
        var svg = String((dados.totp && dados.totp.qr_code) || '');
        if (svg) {
          var img = document.createElement('img');
          img.setAttribute('alt', 'QR code para o aplicativo autenticador');
          try { img.src = 'data:image/svg+xml;base64,' + Cripto.base64(Cripto.utf8(svg)); } catch (e) {}
          qr.appendChild(img);
          qr.style.display = '';
        }
      }
      var segredo = document.getElementById('mfaSegredo');
      if (segredo) {
        segredo.textContent = dados.totp.secret || '';
        segredo.style.display = dados.totp.secret ? '' : 'none';
      }
      var intro = document.getElementById('mfaIntro');
      if (intro) intro.textContent =
        'Escaneie o QR code com o aplicativo (ou digite o código secreto acima) ' +
        'e informe os 6 números que ele mostrou.';
      var grupo = document.getElementById('grupoMfaCodigo');
      if (grupo) grupo.style.display = 'block';
      var botao = document.getElementById('mfaBotao');
      if (botao) botao.textContent = 'Confirmar ativação';
      var secundario = document.getElementById('mfaSecundario');
      if (secundario) secundario.textContent = 'Cancelar';
      var campo = document.getElementById('mfaCodigo');
      if (campo) { campo.value = ''; try { campo.focus(); } catch (e) {} }
      self.mensagemMfa('');
    }).catch(function(erro) {
      self.mensagemMfa(erro.message || 'Não foi possível ativar a verificação.', true);
    });
  },

  confirmarMfa: function() {
    if (this._modoMfa !== 'enroll' || !this._mfaEnroll) return;
    var self = this;
    var campo = document.getElementById('mfaCodigo');
    var codigo = campo ? campo.value : '';
    this._pendente = {
      sessao: {
        token: this.token(),
        refresh_token: this.refreshToken(),
        usuario: this.usuario()
      },
      fatores: [{ id: this._mfaEnroll.id }],
      mfa: false
    };
    this.concluirDesafioMfa(codigo).then(function(sessao) {
      self._guardarSessao(sessao);
      self._pendente = null;
      self._modoMfa = '';
      self._mfaEnroll = null;
      self._mfaNome = '';
      self._mfaOrigemPermanent = false;
      try { localStorage.removeItem(self.CHAVE_MFA_RECUSADO); } catch (e) {}
      app.fecharModal('modalMfa');
      app.toast('Verificação em duas etapas ativada.');
    }).catch(function(erro) {
      self.mensagemMfa(erro.message || 'Código inválido.', true);
    });
  },

  // Botão permanente da sidebar. Cada conta entra com o seu login e cadastra o
  // seu próprio QR code. Se já houver um fator ativo, o botão serve para
  // adicionar um segundo aplicativo de reserva.
  abrirAtivacaoMfa: function() {
    if (!this.configurado() || !this.conectado()) {
      app.toast('Entre na sua conta para ativar a verificação em duas etapas.');
      return;
    }
    try { localStorage.removeItem(this.CHAVE_MFA_RECUSADO); } catch (e) {}

    var jaTem = this._fatoresVerificados(this.usuario()).length > 0;
    this._modoMfa = 'convite';
    this._mfaEnroll = null;
    this._mfaNome = jaTem ? 'App de autenticação (reserva)' : 'App de autenticação';
    this._mfaOrigemPermanent = true;

    var intro = document.getElementById('mfaIntro');
    if (intro) intro.textContent = jaTem
      ? 'Você já tem um código ativo. Pode gerar um código de reserva em outro celular/app. Se desativar, o código atual será removido do Supabase e, ao ativar de novo, você vai precisar escanear um QR novo no Google Authenticator.'
      : 'Vamos proteger esta conta com um código que muda a cada 30 segundos. Use um aplicativo autenticador no celular (Google Authenticator, Authy, Microsoft Authenticator ou similar).';
    var qr = document.getElementById('mfaQr');
    if (qr) qr.style.display = 'none';
    var segredo = document.getElementById('mfaSegredo');
    if (segredo) segredo.style.display = 'none';
    var grupo = document.getElementById('grupoMfaCodigo');
    if (grupo) grupo.style.display = 'none';
    var botao = document.getElementById('mfaBotao');
    if (botao) botao.textContent = jaTem ? 'Gerar código de reserva' : 'Gerar QR code';
    var secundario = document.getElementById('mfaSecundario');
    if (secundario) {
      secundario.textContent = 'Fechar';
      secundario.style.display = '';
    }
    var desativar = document.getElementById('mfaDesativar');
    if (desativar) desativar.style.display = jaTem ? '' : 'none';
    this.mensagemMfa('');
    app.abrirModal('modalMfa');
  },

  // Um botão só: gera o QR no modo convite e confirma o código no modo enroll.
  clicarMfa: function() {
    if (this._modoMfa === 'enroll') return this.confirmarMfa();
    if (this._modoMfa === 'convite') return this.ativarMfa();
  },

  // "Agora não" vale só para o convite automático. Pelo botão permanente,
  // fechar não grava a recusa.
  mfaSecundario: function() {
    if (this._mfaOrigemPermanent) this.fecharMfa();
    else this.recusarMfa();
  },

  recusarMfa: function() {
    try { localStorage.setItem(this.CHAVE_MFA_RECUSADO, '1'); } catch (e) {}
    this._modoMfa = '';
    this._mfaEnroll = null;
    this._mfaNome = '';
    this._mfaOrigemPermanent = false;
    app.fecharModal('modalMfa');
    app.toast('Você pode ativar a verificação em duas etapas depois.');
  },

  fecharMfa: function() {
    this._modoMfa = '';
    this._mfaEnroll = null;
    this._mfaNome = '';
    this._mfaOrigemPermanent = false;
    var campo = document.getElementById('mfaCodigo');
    if (campo) campo.value = '';
    var desativar = document.getElementById('mfaDesativar');
    if (desativar) desativar.style.display = 'none';
    app.fecharModal('modalMfa');
  },

  desativarMfa: function() {
    var self = this;
    if (!this.configurado() || !this.conectado()) return;
    var fatores = this._fatoresVerificados(this.usuario());
    if (!fatores.length) {
      app.toast('Nenhuma verificação em duas etapas ativa.');
      return;
    }
    if (!confirm('Desativar a verificação em duas etapas desta conta?\n\nVocê vai precisar da senha da conta e do código atual. Ao desativar, o QR atual deixa de funcionar. Quando ativar de novo, será gerado um QR novo.')) return;

    this.fecharMfa();
    this.reautenticar(function() {
      // Após reautenticar, a sessão está em aal2. Busca fatores atualizados.
      fetch(self.base() + '/auth/v1/factors', { headers: self.headers(true) })
        .then(function(r) { return r.json().catch(function() { return []; }); })
        .then(function(lista) {
          var fatoresAtuais = [];
          if (Array.isArray(lista)) fatoresAtuais = lista;
          else if (lista && Array.isArray(lista.all)) fatoresAtuais = lista.all;
          else if (lista && Array.isArray(lista.totp)) fatoresAtuais = lista.totp;
          fatoresAtuais = fatoresAtuais.filter(function(f) { return f && f.status === 'verified'; });
          if (!fatoresAtuais.length) {
            app.toast('Nenhum fator ativo encontrado.');
            return;
          }
          // Desativa todos os fatores verificados (TOTP). Sequencial para evitar problemas.
          var i = 0;
          function proximo() {
            if (i >= fatoresAtuais.length) {
              // atualiza usuário local
              var u = self.usuario() || {};
              u.factors = [];
              try { sessionStorage.setItem(self.CHAVE_USUARIO, JSON.stringify(u)); } catch (e) {}
              app.toast('Verificação em duas etapas desativada.');
              if (typeof segurancaModulo !== 'undefined') segurancaModulo.registrar('Verificação em duas etapas desativada');
              return;
            }
            var f = fatoresAtuais[i++];
            fetch(self.base() + '/auth/v1/factors/' + encodeURIComponent(f.id), {
              method: 'DELETE',
              headers: self.headers(true)
            }).then(function(r) {
              if (!r.ok) throw new Error('Não foi possível desativar o fator.');
              proximo();
            }).catch(function(err) {
              app.toast(err.message || 'Não foi possível desativar a verificação.');
            });
          }
          proximo();
        })
        .catch(function() {
          app.toast('Não foi possível desativar a verificação em duas etapas.');
        });
    });
  },

  // ---------- login ----------

  iniciar: function() {
    if (!this.configurado()) {
      // Modo local não pede login: libera o sistema que já veio protegido
      // no HTML para evitar qualquer lampejo da tela antes do JavaScript.
      app.fecharModal('modalLogin');
      return;
    }
    if (typeof fetch !== 'function') {
      app.toast('Este navegador não suporta sincronização online.');
      this.mostrarLogin();
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
    var grupo = document.getElementById('grupoMfaLogin');
    if (grupo) grupo.style.display = 'none';
    this.mensagem('');
    app.abrirModal('modalLogin');
    if (email) { try { email.focus(); } catch (e) {} }
  },

  _guardarSessao: function(sessao) {
    try {
      sessionStorage.setItem(this.CHAVE_TOKEN, sessao.token);
      if (sessao.refresh_token) sessionStorage.setItem(this.CHAVE_REFRESH, sessao.refresh_token);
      sessionStorage.setItem(this.CHAVE_USUARIO, JSON.stringify(sessao.usuario || {}));
    } catch (e) {}
  },

  autenticarSenha: function(email, senha) {
    var self = this;
    return this._post('/auth/v1/token?grant_type=password', this.headers(false), {
      email: email,
      password: senha
    }).then(function(dados) {
      if (!dados.access_token) throw new Error('E-mail ou senha incorretos.');
      var payload = self.decodificarJwt(dados.access_token);
      var sessao = {
        token: dados.access_token,
        refresh_token: dados.refresh_token || '',
        usuario: dados.user || { id: (payload && payload.sub) || '', email: email }
      };
      return self.verificarMfa(sessao).then(function(necessaria) {
        sessao.mfa = necessaria;
        return sessao;
      });
    }).catch(function() {
      // Não mostramos a mensagem bruta do Supabase (ela vem em inglês e pode
      // revelar detalhes da conta). Qualquer falha aqui vira aviso amigável.
      throw new Error('E-mail ou senha incorretos.');
    });
  },

  entrar: function() {
    var self = this;
    this.mensagem('');

    if (this._pendente && this._pendente.mfa) {
      this._resolverMfa('loginMfaCodigo', 'loginErro', function(sessao) {
        self._entrarComSessao(sessao);
      });
      return false;
    }

    var emailEl = document.getElementById('loginEmail');
    var senhaEl = document.getElementById('loginSenha');
    var email = emailEl ? emailEl.value.trim() : '';
    var senha = senhaEl ? senhaEl.value : '';

    if (!email || !senha) {
      this.mensagem('Informe o e-mail e a senha.', true);
      return false;
    }
    if (senhaEl) senhaEl.value = '';

    this.autenticarSenha(email, senha).then(function(sessao) {
      if (sessao.mfa) {
        self._pendente = sessao;
        self._mostrarCampoMfa('grupoMfaLogin',
          'Agora digite o código de 6 números do seu aplicativo autenticador.');
        return;
      }
      self._entrarComSessao(sessao);
    }).catch(function(erro) {
      self.mensagem(erro.message || 'Não foi possível conectar. Tente novamente.', true);
    });
    return false;
  },

  _entrarComSessao: function(sessao) {
    var self = this;
    this._guardarSessao(sessao);
    app.fecharModal('modalLogin');
    app.toast('Conectado. Carregando os dados da nuvem...');
    this.sincronizarNoInicio().then(function() {
      self.mostrarConviteMfaSeNecessario(sessao.usuario);
    });
  },

  // ---------- reautenticação para ações críticas ----------

  reautenticar: function(callback) {
    if (!this.configurado() || !this.conectado()) {
      if (callback) callback();
      return;
    }
    this._reautenticarCallback = callback || null;
    this._pendente = null;
    this.mensagemReaut('');
    var grupo = document.getElementById('grupoMfaReauth');
    if (grupo) grupo.style.display = 'none';
    var email = document.getElementById('reauthEmail');
    var senha = document.getElementById('reauthSenha');
    var usuario = this.usuario();
    if (email) email.value = (usuario && usuario.email) || '';
    if (senha) senha.value = '';
    var codigo = document.getElementById('reauthMfaCodigo');
    if (codigo) codigo.value = '';
    app.abrirModal('modalReautenticar');
    if (senha) { try { senha.focus(); } catch (e) {} }
  },

  confirmarReautenticacao: function() {
    var self = this;
    this.mensagemReaut('');

    if (this._pendente && this._pendente.mfa) {
      this._resolverMfa('reauthMfaCodigo', 'reauthErro', function(sessao) {
        self._finalizarReautenticacao(sessao);
      });
      return false;
    }

    var emailEl = document.getElementById('reauthEmail');
    var senhaEl = document.getElementById('reauthSenha');
    var email = emailEl ? emailEl.value.trim() : '';
    var senha = senhaEl ? senhaEl.value : '';
    if (!email || !senha) {
      this.mensagemReaut('Informe o e-mail e a senha da sua conta.', true);
      return false;
    }
    if (senhaEl) senhaEl.value = '';

    this.autenticarSenha(email, senha).then(function(sessao) {
      if (sessao.mfa) {
        self._pendente = sessao;
        self._mostrarCampoMfa('grupoMfaReauth',
          'Digite também o código de 6 números do aplicativo autenticador.');
        return;
      }
      self._finalizarReautenticacao(sessao);
    }).catch(function(erro) {
      self.mensagemReaut(erro.message || 'Não foi possível confirmar a senha.', true);
    });
    return false;
  },

  _finalizarReautenticacao: function(sessao) {
    var atual = this.usuario();
    var novo = sessao.usuario;
    if (!atual || !novo || !atual.id || novo.id !== atual.id) {
      this.mensagemReaut('Essa conta não é a mesma que está conectada. Ação cancelada.', true);
      return;
    }
    var callback = this._reautenticarCallback;
    this._reautenticarCallback = null;
    this._pendente = null;
    // Guarda o token com nível aal2: sem isso a RLS continuaria bloqueando
    // as ações protegidas de quem ativou o segundo fator.
    this._guardarSessao(sessao);
    app.fecharModal('modalReautenticar');
    if (typeof segurancaModulo !== 'undefined') {
      segurancaModulo.registrar('Senha confirmada para ação sensível');
    }
    if (callback) callback();
  },

  sair: function() {
    try {
      sessionStorage.removeItem(this.CHAVE_TOKEN);
      sessionStorage.removeItem(this.CHAVE_REFRESH);
      sessionStorage.removeItem(this.CHAVE_USUARIO);
    } catch (e) {}
    this._pendente = null;
    this._reautenticarCallback = null;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },

  // ---------- sessão ----------

  renovarSePreciso: function() {
    var payload = this.decodificarJwt(this.token());
    if (!payload || !payload.exp || (payload.exp * 1000) > (Date.now() + 60000)) {
      return Promise.resolve();
    }
    var refresh = this.refreshToken();
    if (!refresh) return Promise.reject(new Error('Sessão expirada.'));
    var self = this;
    return this._post('/auth/v1/token?grant_type=refresh_token', this.headers(false), {
      refresh_token: refresh
    }).then(function(dados) {
      if (!dados.access_token) throw new Error('Sessão expirada.');
      self._guardarSessao({
        token: dados.access_token,
        refresh_token: dados.refresh_token || refresh,
        usuario: dados.user || self.usuario()
      });
    });
  },

  verificarSessao: function() {
    var self = this;
    return this.renovarSePreciso()
      .then(function() {
        return fetch(self.base() + '/auth/v1/user', { headers: self.headers(true) });
      })
      .then(function(resposta) {
        if (!resposta.ok) throw new Error('Sessão expirada.');
        return resposta.json();
      })
      .then(function(usuario) {
        var sessao = {
          token: self.token(),
          refresh_token: self.refreshToken(),
          usuario: usuario
        };
        self._guardarSessao(sessao);
        return self.verificarMfa(sessao).then(function(necessaria) {
          if (necessaria) {
            self._pendente = sessao;
            self.mostrarLogin();
            self._mostrarCampoMfa('grupoMfaLogin',
              'Sua conta usa verificação em duas etapas. Digite o código de 6 números.');
            return;
          }
          return self.sincronizarNoInicio().then(function() {
            app.fecharModal('modalLogin');
            self.mostrarConviteMfaSeNecessario(usuario);
          });
        });
      })
      .catch(function() {
        self.sair();
        self.mostrarLogin();
      });
  },

  // ---------- dados ----------

  coletarDados: function() {
    var chave = '';
    if (typeof segurancaModulo !== 'undefined' && segurancaModulo.lerRegistroChave) {
      chave = segurancaModulo.lerRegistroChave() || '';
    }
    return {
      app: 'saas-livia',
      versao: 6,
      fontes: fontes,
      pacientes: pacientes,
      lancamentos: lancamentos,
      evolucoes: evolucoes,
      dadosProfissional: dadosProfissional,
      anos: anos,
      anoAtivo: anoAtivo,
      criptografia: { chave: chave },
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

  salvarSeConectado: function() {
    if (!this.configurado() || !this.conectado() || this._aplicandoRemoto) return;
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

  // A nuvem manda: ao entrar, o que está lá substitui o navegador.
  // Conta nova começa vazia; dados antigos só entram por importação explícita.
  sincronizarNoInicio: function() {
    var self = this;
    return this.carregar().then(function(remoto) {
      var deveSalvar = false;
      self._aplicandoRemoto = true;
      try {
        if (!remoto || typeof remoto !== 'object' || !remoto.app) {
          backupModulo.aplicarVazio();
          app.toast('Conta nova: começando do zero. Use Importar backup para trazer dados antigos.');
          deveSalvar = true;
        } else {
          backupModulo._aplicarDados(remoto);
          try { sessionStorage.setItem(self.CHAVE_SYNC, remoto.atualizadoEm || ''); } catch (e) {}
          app.toast('Dados carregados da nuvem.');
        }
      } finally {
        self._aplicandoRemoto = false;
      }
      if (typeof segurancaModulo !== 'undefined' && segurancaModulo.carregarTrilhaRemota) {
        segurancaModulo.carregarTrilhaRemota();
      }
      if (!deveSalvar) return null;
      return self.salvar(self.coletarDados()).then(function(ok) {
        if (ok) {
          try { sessionStorage.setItem(self.CHAVE_SYNC, new Date().toISOString()); } catch (e) {}
        }
      });
    }).catch(function() {
      app.toast('Não foi possível acessar a nuvem. Os dados da nuvem continuarão valendo na próxima entrada.');
    });
  },

  // ---------- trilha de acesso no banco ----------

  registrarAuditoria: function(acao, detalhe) {
    if (!this.configurado() || !this.conectado()) return;
    var usuario = this.usuario();
    if (!usuario || !usuario.id) return;
    var headers = this.headers(true);
    headers['Prefer'] = 'return=minimal';
    fetch(this.base() + '/rest/v1/auditoria', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        user_id: usuario.id,
        acao: String(acao || '').slice(0, 120),
        detalhe: String(detalhe || '').slice(0, 300)
      })
    }).catch(function() {});
  },

  carregarAuditoria: function() {
    if (!this.configurado() || !this.conectado()) return Promise.resolve([]);
    var url = this.base() + '/rest/v1/auditoria?select=criado_em,acao,detalhe&order=criado_em.desc&limit=50';
    return fetch(url, { headers: this.headers(true) })
      .then(function(resposta) { return resposta.ok ? resposta.json() : []; })
      .then(function(lista) { return Array.isArray(lista) ? lista : []; })
      .catch(function() { return []; });
  }

};

window.Backend = Backend;
