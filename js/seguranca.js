// ============================================================================
// Segurança do prontuário — senha PBKDF2 + chave AES-GCM + trilha de acesso
//
// A senha do prontuário continua sendo conferida com PBKDF2, mas agora ela
// também gera (via Cripto) a chave que cifra as evoluções. A chave fica só na
// memória enquanto o prontuário está desbloqueado. O registro da chave (sal +
// conferência cifrada) vai no backup e na nuvem — a senha em texto nunca é
// salva, e não existe recuperação se ela for esquecida.
//
// O código PBKDF2 em JavaScript puro abaixo fica apenas para abrir registros
// criados nas versões antigas. Registros novos usam WebCrypto (600.000 it.).
// ============================================================================

// ---------- PBKDF2 antigo, somente para compatibilidade ----------

var SEG_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function seg_rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

function seg_sha256(bytes) {
  var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
           0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  var len = bytes.length;
  var total = len + 1 + ((56 - ((len + 1) % 64) + 64) % 64) + 8;
  var msg = new Uint8Array(total);
  msg.set(bytes);
  msg[len] = 0x80;

  var bits = len * 8;
  var hi = Math.floor(bits / 4294967296);
  var lo = bits >>> 0;
  msg[total - 8] = (hi >>> 24) & 0xff;
  msg[total - 7] = (hi >>> 16) & 0xff;
  msg[total - 6] = (hi >>> 8) & 0xff;
  msg[total - 5] = hi & 0xff;
  msg[total - 4] = (lo >>> 24) & 0xff;
  msg[total - 3] = (lo >>> 16) & 0xff;
  msg[total - 2] = (lo >>> 8) & 0xff;
  msg[total - 1] = lo & 0xff;

  var w = new Int32Array(64);
  for (var off = 0; off < total; off += 64) {
    for (var t = 0; t < 16; t++) {
      var p = off + (t * 4);
      w[t] = (msg[p] << 24) | (msg[p + 1] << 16) | (msg[p + 2] << 8) | msg[p + 3];
    }
    for (t = 16; t < 64; t++) {
      var s0 = seg_rotr(w[t - 15], 7) ^ seg_rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      var s1 = seg_rotr(w[t - 2], 17) ^ seg_rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    var a = h[0], b = h[1], c = h[2], d = h[3];
    var e = h[4], f = h[5], g = h[6], hh = h[7];

    for (t = 0; t < 64; t++) {
      var S1 = seg_rotr(e, 6) ^ seg_rotr(e, 11) ^ seg_rotr(e, 25);
      var ch = (e & f) ^ (~e & g);
      var temp1 = (hh + S1 + ch + SEG_K[t] + w[t]) | 0;
      var S0 = seg_rotr(a, 2) ^ seg_rotr(a, 13) ^ seg_rotr(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (S0 + maj) | 0;

      hh = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }

  var out = new Uint8Array(32);
  for (var i = 0; i < 8; i++) {
    out[i * 4] = (h[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    out[i * 4 + 3] = h[i] & 0xff;
  }
  return out;
}

function seg_utf8(texto) {
  var out = [];
  var s = String(texto);
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
}

function seg_hmac(key, msg) {
  var k = Array.prototype.slice.call(key);
  if (k.length > 64) k = Array.prototype.slice.call(seg_sha256(new Uint8Array(k)));
  while (k.length < 64) k.push(0);

  var inner = new Uint8Array(64 + msg.length);
  var outer = new Uint8Array(96);
  for (var i = 0; i < 64; i++) {
    inner[i] = k[i] ^ 0x36;
    outer[i] = k[i] ^ 0x5c;
  }
  for (i = 0; i < msg.length; i++) inner[64 + i] = msg[i];

  var ih = seg_sha256(inner);
  for (i = 0; i < 32; i++) outer[64 + i] = ih[i];
  return seg_sha256(outer);
}

function seg_pbkdf2(senha, sal, iteracoes, tamanho) {
  var pass = seg_utf8(senha);
  var out = [];
  var blocos = Math.ceil(tamanho / 32);

  for (var b = 1; b <= blocos; b++) {
    var msg = new Uint8Array(sal.length + 4);
    msg.set(sal);
    msg[sal.length] = (b >>> 24) & 0xff;
    msg[sal.length + 1] = (b >>> 16) & 0xff;
    msg[sal.length + 2] = (b >>> 8) & 0xff;
    msg[sal.length + 3] = b & 0xff;

    var u = seg_hmac(pass, msg);
    var t = Array.prototype.slice.call(u);
    for (var j = 1; j < iteracoes; j++) {
      u = seg_hmac(pass, u);
      for (var k = 0; k < 32; k++) t[k] ^= u[k];
    }
    out = out.concat(t);
  }
  return out.slice(0, tamanho);
}

function seg_hex(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    s += ('0' + (bytes[i] & 0xff).toString(16)).slice(-2);
  }
  return s;
}

function seg_deHex(texto) {
  var out = [];
  for (var i = 0; i + 1 < texto.length; i += 2) {
    out.push(parseInt(texto.slice(i, i + 2), 16));
  }
  return out;
}

function seg_novaSal() {
  var s = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(s);
  } else {
    for (var i = 0; i < s.length; i++) s[i] = Math.floor(Math.random() * 256);
  }
  return s;
}

function seg_criarRegistro(senha) {
  var sal = seg_novaSal();
  var it = 12000;
  var derivada = seg_pbkdf2(senha, sal, it, 32);
  return 'pbkdf2$' + it + '$' + seg_hex(sal) + '$' + seg_hex(new Uint8Array(derivada));
}

function seg_igual(a, b) {
  if (String(a).length !== String(b).length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function seg_conferir(senha, registro) {
  registro = String(registro || '');
  if (registro.indexOf('pbkdf2$') === 0) {
    var partes = registro.split('$');
    if (partes.length !== 4) return false;
    var it = parseInt(partes[1], 10) || 12000;
    var sal = new Uint8Array(seg_deHex(partes[2]));
    var calculada = seg_hex(new Uint8Array(seg_pbkdf2(senha, sal, it, 32)));
    return seg_igual(calculada, partes[3]);
  }
  // compatibilidade com senhas criadas nas versões anteriores
  return segurancaModulo.hash(senha) === registro;
}

// ---------- Módulo ----------

var segurancaModulo = {

  CHAVE_SENHA: 'saas_seguranca_senha',
  CHAVE_CHAVE: 'saas_cripto_chave',
  CHAVE_TRILHA: 'saas_seguranca_trilha',
  CHAVE_BLOQUEIO: 'saas_seguranca_bloqueio',
  INATIVIDADE: 15 * 60 * 1000,

  desbloqueado: false,
  chaveAes: null,
  ultimaAtividade: 0,
  tentativas: 0,
  bloqueioAte: 0,
  modo: 'criar',
  aposDesbloqueio: null,
  relogio: null,

  init: function() {
    try {
      var ate = Number(sessionStorage.getItem(this.CHAVE_BLOQUEIO) || 0);
      if (ate > Date.now()) this.bloqueioAte = ate;
      else sessionStorage.removeItem(this.CHAVE_BLOQUEIO);
    } catch (e) {}
    this.iniciarRelogio();
    this.renderTrilha();
    this.carregarTrilhaRemota();
  },

  iniciarRelogio: function() {
    var self = this;
    this.relogio = setInterval(function() { self.verificarInatividade(); }, 30000);
  },

  verificarInatividade: function() {
    if (this.desbloqueado && Date.now() - this.ultimaAtividade > this.INATIVIDADE) {
      this.desbloqueado = false;
      this.chaveAes = null;
      if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.limparCache();
      this.registrar('Bloqueio automático por inatividade');
      this.renderTrilha();
      app.toast('Prontuário bloqueado por inatividade.');
      if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.render();
    }
  },

  estaDesbloqueado: function() {
    return this.desbloqueado && !!this.chaveAes;
  },

  registrarAtividade: function() {
    this.ultimaAtividade = Date.now();
  },

  criptografiaDisponivel: function() {
    return typeof Cripto !== 'undefined' && Cripto.disponivel();
  },

  // ---------- Senha ----------

  lerHash: function() {
    try { return localStorage.getItem(this.CHAVE_SENHA); } catch (e) { return null; }
  },

  temSenha: function() {
    return !!this.lerHash();
  },

  // Prepara pbkdf2$iteracoes$salt$hash sem gravar. Separar preparação de
  // gravação permite trocar senha e recifrar as evoluções de forma atômica.
  prepararRegistroSenha: function(senha) {
    if (this.criptografiaDisponivel()) return Cripto.criarRegistroSenha(senha);
    return Promise.resolve(seg_criarRegistro(senha));
  },

  salvarRegistro: function(senha) {
    var self = this;
    return this.prepararRegistroSenha(senha).then(function(registro) {
      try { localStorage.setItem(self.CHAVE_SENHA, registro); } catch (e) {}
      return registro;
    });
  },

  verificarSenha: function(senha) {
    var registro = this.lerHash();
    if (!registro) return Promise.resolve(false);
    if (this.criptografiaDisponivel() && registro.indexOf('pbkdf2$') === 0) {
      return Cripto.conferirRegistroSenha(senha, registro);
    }
    return Promise.resolve(seg_conferir(senha, registro));
  },

  // Sobe para 600.000 iterações e cria o registro da chave quando a pessoa já
  // vinha da versão anterior. A senha não muda.
  migrarSeNecessario: function(senha) {
    var atual = this.lerHash();
    var self = this;
    if (!atual) return Promise.resolve(false);

    if (atual.indexOf('pbkdf2$') !== 0) {
      return this.salvarRegistro(senha).then(function() {
        self.registrar('Senha atualizada para proteção mais forte');
        return true;
      });
    }

    if (this.criptografiaDisponivel()) {
      return Cripto.migrarRegistroSenha(senha, atual).then(function(novo) {
        if (!novo) return false;
        try { localStorage.setItem(self.CHAVE_SENHA, novo); } catch (e) {}
        self.registrar('Senha atualizada para proteção mais forte');
        return true;
      });
    }
    return Promise.resolve(false);
  },

  // Mantido SOMENTE para reconhecer senhas criadas antes do PBKDF2.
  hash: function(texto) {
    var sal = 'saas-livia-prontuario-v2|';
    var s = sal + String(texto);
    var h1 = 5381;
    var h2 = 52711;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 = ((h1 << 5) + h1 + c) >>> 0;
      h2 = ((h2 << 5) + h2 + c) >>> 0;
    }
    return h1.toString(16) + '-' + h2.toString(16);
  },

  // ---------- Registro da chave AES ----------

  lerRegistroChave: function() {
    try { return localStorage.getItem(this.CHAVE_CHAVE) || ''; } catch (e) { return ''; }
  },

  salvarRegistroChave: function(registro) {
    try { localStorage.setItem(this.CHAVE_CHAVE, registro); } catch (e) {}
  },

  // Usado quando chega um backup ou um carregamento da nuvem.
  aplicarRegistroChave: function(registro) {
    var valor = String(registro || '');
    if (!valor) return false; // backup antigo: mantém a chave atual
    if (!this.criptografiaDisponivel() || !Cripto.registroValido(valor)) return false;
    this.salvarRegistroChave(valor);
    this.desbloqueado = false;
    this.chaveAes = null;
    if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.limparCache();
    return true;
  },

  // Prepara uma chave nova sem gravar o registro (usado na troca de senha).
  prepararChave: function(senha) {
    if (!this.criptografiaDisponivel()) {
      return Promise.reject(new Error(
        'Este navegador não oferece criptografia. Abra o site pelo endereço HTTPS.'
      ));
    }
    return Cripto.criarRegistroChave(senha);
  },

  // Cria uma chave nova (primeira criação) e grava o registro.
  renovarChave: function(senha) {
    var self = this;
    return this.prepararChave(senha).then(function(resultado) {
      self.salvarRegistroChave(resultado.registro);
      return resultado.chave;
    });
  },

  // Abre a chave existente ou cria uma quando ainda não houver registro.
  derChave: function(senha) {
    var registro = this.lerRegistroChave();
    if (!registro) return this.renovarChave(senha);
    if (!this.criptografiaDisponivel()) {
      return Promise.reject(new Error(
        'Não foi possível abrir as evoluções: este navegador não oferece criptografia. Abra o site pelo HTTPS.'
      ));
    }
    if (!Cripto.registroValido(registro)) {
      return Promise.reject(new Error(
        'O registro da chave está corrompido. Não é possível abrir as evoluções com segurança.'
      ));
    }
    return Cripto.abrirRegistroChave(registro, senha).then(function(chave) {
      if (!chave) throw new Error('Não foi possível abrir a chave com essa senha.');
      return chave;
    });
  },

  // ---------- Fluxo da tela de senha ----------

  exigirAcesso: function(callback) {
    if (!this.temSenha()) {
      this.modo = 'criar';
      this.aposDesbloqueio = callback || null;
      this.mostrarModal();
      return false;
    }
    if (!this.estaDesbloqueado()) {
      this.modo = 'desbloquear';
      this.aposDesbloqueio = callback || null;
      this.mostrarModal();
      return false;
    }
    this.registrarAtividade();
    if (callback) callback();
    return true;
  },

  mostrarModal: function() {
    var criar = this.modo === 'criar';
    var titulo = document.getElementById('senhaTitulo');
    if (titulo) titulo.textContent = criar ? 'Criar senha do prontuário' : 'Desbloquear prontuário';
    var aviso = document.getElementById('senhaAviso');
    if (aviso) aviso.style.display = criar ? 'block' : 'none';
    var confirmarGroup = document.getElementById('grupoConfirmarSenha');
    if (confirmarGroup) confirmarGroup.style.display = criar ? 'block' : 'none';
    var label = document.getElementById('labelNovaSenha');
    if (label) label.textContent = criar ? 'Crie uma senha' : 'Digite sua senha';
    var botao = document.getElementById('senhaBotao');
    if (botao) botao.textContent = criar ? 'Criar senha' : 'Entrar';
    var nova = document.getElementById('senhaNova');
    if (nova) nova.value = '';
    var confirmar = document.getElementById('senhaConfirmar');
    if (confirmar) confirmar.value = '';

    this.mensagem('');
    app.abrirModal('modalSenha');
    if (nova) { try { nova.focus(); } catch (e) {} }
  },

  mensagem: function(texto, erro) {
    var el = document.getElementById('senhaErro');
    if (!el) return;
    el.textContent = texto || '';
    el.className = 'senha-erro' + (erro ? ' erro' : '');
    el.style.display = texto ? 'block' : 'none';
  },

  mensagemTroca: function(texto, erro) {
    var el = document.getElementById('trocaSenhaErro');
    if (!el) return;
    el.textContent = texto || '';
    el.className = 'senha-erro' + (erro ? ' erro' : '');
    el.style.display = texto ? 'block' : 'none';
  },

  confirmar: function() {
    if (this.modo === 'criar') return this.criarSenha();
    return this.desbloquear();
  },

  criarSenha: function() {
    var self = this;
    var novaEl = document.getElementById('senhaNova');
    var confirmarEl = document.getElementById('senhaConfirmar');
    var senha = novaEl ? novaEl.value : '';

    if (senha.length < 4) {
      this.mensagem('Use pelo menos 4 caracteres.', true);
      return Promise.resolve(false);
    }
    if (senha !== (confirmarEl ? confirmarEl.value : '')) {
      this.mensagem('As senhas não coincidem.', true);
      return Promise.resolve(false);
    }

    return this.salvarRegistro(senha)
      .then(function() { return self.renovarChave(senha); })
      .then(function(chave) {
        self.chaveAes = chave;
        self.desbloqueado = true;
        self.tentativas = 0;
        self.bloqueioAte = 0;
        try { sessionStorage.removeItem(self.CHAVE_BLOQUEIO); } catch (e) {}
        self.registrarAtividade();
        if (typeof prontuarioModulo !== 'undefined' && prontuarioModulo.migrarParaChave) {
          return prontuarioModulo.migrarParaChave(chave);
        }
        return null;
      })
      .then(function() {
        if (typeof Store !== 'undefined') Store.salvar();
        self.registrar('Senha de acesso criada');
        app.fecharModal('modalSenha');
        app.toast('Senha criada. Evoluções protegidas com criptografia.');
        self.renderTrilha();
        if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.render();
        self.executarPendente();
        return true;
      })
      .catch(function(erro) {
        self.mensagem(erro.message || 'Não foi possível criar a senha.', true);
        return false;
      });
  },

  desbloquear: function() {
    var self = this;
    if (Date.now() < this.bloqueioAte) {
      this.mensagem('Aguarde alguns segundos e tente novamente.', true);
      return Promise.resolve(false);
    }

    var nova = document.getElementById('senhaNova');
    var digitada = nova ? nova.value : '';

    return this.verificarSenha(digitada).then(function(ok) {
      if (!ok) {
        self.tentativas++;
        self.registrar('Tentativa de acesso com senha incorreta');
        if (self.tentativas >= 3) {
          self.bloqueioAte = Date.now() + 30000;
          self.tentativas = 0;
          try { sessionStorage.setItem(self.CHAVE_BLOQUEIO, String(self.bloqueioAte)); } catch (e) {}
          self.mensagem('Três tentativas erradas. Aguarde 30 segundos.', true);
        } else {
          self.mensagem('Senha incorreta. Tente novamente.', true);
        }
        if (nova) { nova.value = ''; try { nova.focus(); } catch (e) {} }
        self.renderTrilha();
        return false;
      }

      return self.derChave(digitada).then(function(chave) {
        self.chaveAes = chave;
        self.desbloqueado = true;
        self.tentativas = 0;
        self.bloqueioAte = 0;
        try { sessionStorage.removeItem(self.CHAVE_BLOQUEIO); } catch (e) {}
        self.registrarAtividade();
        return Promise.all([
          self.migrarSeNecessario(digitada),
          (typeof prontuarioModulo !== 'undefined' && prontuarioModulo.migrarParaChave) ?
            prontuarioModulo.migrarParaChave(chave) : Promise.resolve(false)
        ]);
      }).then(function() {
        self.registrar('Desbloqueio do prontuário');
        if (typeof Store !== 'undefined') Store.salvar();
        app.fecharModal('modalSenha');
        app.toast('Prontuário desbloqueado.');
        self.renderTrilha();
        if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.render();
        self.executarPendente();
        return true;
      });
    }).catch(function(erro) {
      self.mensagem(erro.message || 'Não foi possível desbloquear.', true);
      return false;
    });
  },

  executarPendente: function() {
    var funcao = this.aposDesbloqueio;
    this.aposDesbloqueio = null;
    if (funcao) funcao();
  },

  bloquear: function() {
    if (!this.desbloqueado) return;
    this.desbloqueado = false;
    this.chaveAes = null;
    if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.limparCache();
    this.registrar('Bloqueio manual');
    this.renderTrilha();
    if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.render();
    app.toast('Prontuário bloqueado.');
  },

  // ---------- Troca de senha com recifração ----------

  solicitarTrocaSenha: function() {
    var self = this;
    var abrir = function() {
      var atual = document.getElementById('trocaSenhaAtual');
      var nova = document.getElementById('trocaSenhaNova');
      var conf = document.getElementById('trocaSenhaConfirmar');
      if (atual) atual.value = '';
      if (nova) nova.value = '';
      if (conf) conf.value = '';
      self.mensagemTroca('');
      app.abrirModal('modalTrocarSenha');
      if (atual) { try { atual.focus(); } catch (e) {} }
    };

    // A senha da conta é confirmada antes de mexer na chave de todas as evoluções.
    if (typeof Backend !== 'undefined' && Backend.configurado && Backend.configurado() &&
        Backend.conectado && Backend.conectado()) {
      Backend.reautenticar(abrir);
      return;
    }
    abrir();
  },

  trocarSenha: function(nova, atual) {
    var self = this;
    if (!nova || String(nova).length < 4) return Promise.resolve(false);
    if (!this.estaDesbloqueado()) return Promise.resolve(false);

    return this.verificarSenha(atual).then(function(ok) {
      if (!ok) return false;
      // Nada é gravado antes da recifração terminar. Se ela falhar, a senha e
      // a chave antigas continuam valendo e nenhuma evolução fica ilegível.
      return Promise.all([
        self.prepararRegistroSenha(nova),
        self.prepararChave(nova)
      ]).then(function(resultados) {
        var registroNovo = resultados[0];
        var chaveNova = resultados[1].chave;
        var registroChaveNovo = resultados[1].registro;
        var antiga = self.chaveAes;
        var promessa = (typeof prontuarioModulo !== 'undefined' && prontuarioModulo.recifrar) ?
          prontuarioModulo.recifrar(antiga, chaveNova) : Promise.resolve(true);
        return promessa.then(function() {
          try { localStorage.setItem(self.CHAVE_SENHA, registroNovo); } catch (e) {}
          self.salvarRegistroChave(registroChaveNovo);
          self.chaveAes = chaveNova;
          if (typeof Store !== 'undefined') Store.salvar();
          self.registrar('Senha de acesso alterada — evoluções recifradas');
          self.renderTrilha();
          return true;
        });
      });
    }).catch(function() {
      return false;
    });
  },

  confirmarTrocaSenha: function() {
    var self = this;
    var atual = document.getElementById('trocaSenhaAtual');
    var nova = document.getElementById('trocaSenhaNova');
    var conf = document.getElementById('trocaSenhaConfirmar');
    var senhaAtual = atual ? atual.value : '';
    var senhaNova = nova ? nova.value : '';
    var confirmacao = conf ? conf.value : '';

    if (senhaNova.length < 4) {
      this.mensagemTroca('Use pelo menos 4 caracteres na nova senha.', true);
      return false;
    }
    if (senhaNova !== confirmacao) {
      this.mensagemTroca('As novas senhas não coincidem.', true);
      return false;
    }
    if (senhaNova === senhaAtual) {
      this.mensagemTroca('Escolha uma senha diferente da atual.', true);
      return false;
    }

    this.trocarSenha(senhaNova, senhaAtual).then(function(ok) {
      if (!ok) {
        self.mensagemTroca('A senha atual está incorreta ou a criptografia falhou.', true);
        return;
      }
      app.fecharModal('modalTrocarSenha');
      app.toast('Senha trocada. Guarde a nova em local seguro.');
    });
    return false;
  },

  // ---------- Trilha de acesso ----------

  lerTrilha: function() {
    try {
      var raw = localStorage.getItem(this.CHAVE_TRILHA);
      var lista = raw ? JSON.parse(raw) : [];
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  },

  registrar: function(acao, detalhe) {
    var trilha = this.lerTrilha();
    trilha.unshift({
      ts: new Date().toISOString(),
      acao: String(acao),
      detalhe: String(detalhe || '')
    });
    if (trilha.length > 500) trilha.length = 500;
    try { localStorage.setItem(this.CHAVE_TRILHA, JSON.stringify(trilha)); } catch (e) {}
    if (typeof Backend !== 'undefined' && Backend.registrarAuditoria) {
      Backend.registrarAuditoria(acao, detalhe);
    }
  },

  // Junta a trilha do banco com a deste navegador, sem duplicar eventos.
  carregarTrilhaRemota: function() {
    if (typeof Backend === 'undefined' || !Backend.carregarAuditoria) return;
    if (!Backend.configurado || !Backend.configurado() || !Backend.conectado || !Backend.conectado()) return;
    var self = this;
    Backend.carregarAuditoria().then(function(lista) {
      if (!lista || !lista.length) return;
      var trilha = self.lerTrilha();
      var vistos = {};
      for (var i = 0; i < trilha.length; i++) {
        vistos[trilha[i].ts + '|' + trilha[i].acao + '|' + (trilha[i].detalhe || '')] = true;
      }
      for (var j = 0; j < lista.length; j++) {
        var item = lista[j];
        var chave = (item.criado_em || '') + '|' + (item.acao || '') + '|' + (item.detalhe || '');
        if (vistos[chave]) continue;
        trilha.push({ ts: item.criado_em || '', acao: item.acao || '', detalhe: item.detalhe || '', remoto: true });
        vistos[chave] = true;
      }
      trilha.sort(function(a, b) { return String(b.ts).localeCompare(String(a.ts)); });
      if (trilha.length > 500) trilha.length = 500;
      try { localStorage.setItem(self.CHAVE_TRILHA, JSON.stringify(trilha)); } catch (e) {}
      self.renderTrilha();
    });
  },

  mascararNome: function(nome) {
    return String(nome || '').trim().split(/\s+/).map(function(parte) {
      return parte.charAt(0).toUpperCase() + '.';
    }).join(' ') || '—';
  },

  renderTrilha: function() {
    var el = document.getElementById('trilhaLista');
    if (!el) return;

    if (!this.desbloqueado) {
      el.innerHTML = '<p class="texto-vazio">Desbloqueie o prontuário para ver a trilha de acesso.</p>';
      return;
    }

    var trilha = this.lerTrilha();
    if (trilha.length === 0) {
      el.innerHTML = '<p class="texto-vazio">Nenhum registro ainda.</p>';
      return;
    }

    var html = '';
    var primeiros = trilha.slice(0, 8);
    for (var i = 0; i < primeiros.length; i++) {
      var item = primeiros[i];
      var quando = '';
      try { quando = new Date(item.ts).toLocaleString('pt-BR'); } catch (e) { quando = item.ts; }
      html += '<div class="trilha-item">' +
        '<span class="trilha-data">' + escapeHtml(quando) + '</span>' +
        '<span class="trilha-acao">' + escapeHtml(item.acao) +
          (item.remoto ? ' <span class="trilha-nuvem">nuvem</span>' : '') + '</span>' +
        (item.detalhe ? '<span class="trilha-detalhe">' + escapeHtml(item.detalhe) + '</span>' : '') +
        '</div>';
    }
    el.innerHTML = html;
  }

};

window.segurancaModulo = segurancaModulo;

(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { segurancaModulo.init(); });
  } else {
    segurancaModulo.init();
  }
})();
