// ============================================================================
// Criptografia das evoluções — AES-GCM com chave derivada da senha do
// prontuário (PBKDF2-HMAC-SHA256, 600.000 iterações).
//
// A chave AES nunca é salva: ela existe só na memória enquanto o prontuário
// está desbloqueado. O que fica salvo (e vai no backup/nuvem) é o "registro da
// chave": sal + um texto cifrado de conferência. Sem a senha, ninguém consegue
// derivar a chave — inclusive a própria profissional. Não há recuperação.
//
// Precisa de WebCrypto (crypto.subtle), disponível no site publicado em HTTPS.
// ============================================================================

var Cripto = {

  ITERACOES: 600000,
  TAMANHO_SAL: 16,
  TAMANHO_IV: 12,
  VERIFICACAO: 'saas-livia-chave-v1',

  disponivel: function() {
    return !!(typeof crypto !== 'undefined' && crypto && crypto.subtle &&
      typeof crypto.subtle.importKey === 'function' &&
      typeof crypto.subtle.deriveBits === 'function' &&
      typeof crypto.subtle.encrypt === 'function' &&
      typeof crypto.subtle.decrypt === 'function');
  },

  // ---------- conversões ----------

  utf8: function(texto) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(texto));
    var bytes = [];
    var s = String(texto);
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) {
        bytes.push(c);
      } else if (c < 0x800) {
        bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var prox = s.charCodeAt(i + 1);
        if (prox >= 0xdc00 && prox <= 0xdfff) {
          var ponto = 0x10000 + ((c - 0xd800) << 10) + (prox - 0xdc00);
          bytes.push(0xf0 | (ponto >> 18), 0x80 | ((ponto >> 12) & 0x3f),
            0x80 | ((ponto >> 6) & 0x3f), 0x80 | (ponto & 0x3f));
          i++;
          continue;
        }
        bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      } else {
        bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return new Uint8Array(bytes);
  },

  deUtf8: function(bytes) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      if (b < 0x80) {
        out += String.fromCharCode(b);
      } else if (b < 0xe0) {
        out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
      } else if (b < 0xf0) {
        out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f));
      } else {
        var ponto = ((b & 0x07) << 18) | ((bytes[++i] & 0x3f) << 12) |
          ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f);
        ponto -= 0x10000;
        out += String.fromCharCode(0xd800 + (ponto >> 10), 0xdc00 + (ponto & 0x3ff));
      }
    }
    return out;
  },

  base64: function(bytes) {
    var bin = '';
    var vista = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (var i = 0; i < vista.length; i += 8192) {
      bin += String.fromCharCode.apply(null, vista.subarray(i, i + 8192));
    }
    return btoa(bin);
  },

  deBase64: function(texto) {
    var bin = atob(String(texto));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },

  hexagonal: function(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += ('0' + (bytes[i] & 0xff).toString(16)).slice(-2);
    return s;
  },

  deHexadecimal: function(texto) {
    var s = String(texto || '');
    if (!/^[0-9a-f]*$/i.test(s) || s.length % 2) throw new Error('Hexadecimal inválido.');
    var out = new Uint8Array(s.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
    return out;
  },

  aleatorio: function(tamanho) {
    var out = new Uint8Array(tamanho);
    crypto.getRandomValues(out);
    return out;
  },

  // Comparação em tempo constante (não vaza a senha pela diferença de tempo).
  _igual: function(a, b) {
    var x = String(a), y = String(b);
    if (x.length !== y.length) return false;
    var diff = 0;
    for (var i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return diff === 0;
  },

  // ---------- PBKDF2 ----------

  derivar: function(senha, sal, iteracoes, bits) {
    if (!this.disponivel()) return Promise.reject(new Error('Criptografia indisponível neste navegador.'));
    var base = crypto.subtle.importKey('raw', this.utf8(senha), 'PBKDF2', false, ['deriveBits']);
    return base.then(function(chaveBase) {
      return crypto.subtle.deriveBits({
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: sal,
        iterations: iteracoes
      }, chaveBase, bits);
    }).then(function(bitsDerivados) {
      return new Uint8Array(bitsDerivados);
    });
  },

  chaveAes: function(bytes) {
    return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  },

  // Registro da senha: pbkdf2$iteracoes$salt$hash (compatível com o formato antigo)
  criarRegistroSenha: function(senha) {
    var self = this;
    var sal = this.aleatorio(this.TAMANHO_SAL);
    return this.derivar(senha, sal, this.ITERACOES, 256).then(function(bits) {
      return 'pbkdf2$' + self.ITERACOES + '$' + self.hexagonal(sal) + '$' + self.hexagonal(bits);
    });
  },

  conferirRegistroSenha: function(senha, registro) {
    var texto = String(registro || '');
    if (texto.indexOf('pbkdf2$') !== 0) {
      return Promise.resolve(typeof segurancaModulo !== 'undefined' && segurancaModulo.hash(senha) === texto);
    }
    var partes = texto.split('$');
    if (partes.length !== 4) return Promise.resolve(false);
    var iteracoes = parseInt(partes[1], 10) || 12000;
    var sal;
    try { sal = this.deHexadecimal(partes[2]); } catch (e) { return Promise.resolve(false); }
    var self = this;
    return this.derivar(senha, sal, iteracoes, 256).then(function(bits) {
      return self._igual(self.hexagonal(bits), partes[3]);
    }).catch(function() { return false; });
  },

  // Sobe as iterações de um registro antigo sem trocar a senha.
  migrarRegistroSenha: function(senha, registro) {
    var texto = String(registro || '');
    if (texto.indexOf('pbkdf2$') !== 0) return Promise.resolve(null);
    var partes = texto.split('$');
    if (partes.length !== 4) return Promise.resolve(null);
    var iteracoes = parseInt(partes[1], 10) || 12000;
    if (iteracoes >= this.ITERACOES) return Promise.resolve(null);
    var sal;
    try { sal = this.deHexadecimal(partes[2]); } catch (e) { return Promise.resolve(null); }
    var self = this;
    return this.derivar(senha, sal, this.ITERACOES, 256).then(function(bits) {
      return 'pbkdf2$' + self.ITERACOES + '$' + partes[2] + '$' + self.hexagonal(bits);
    }).catch(function() { return null; });
  },

  // ---------- Registro da chave AES ----------
  // aesgcm$iteracoes$salt$iv$texto-cifrado-de-conferencia

  criarRegistroChave: function(senha) {
    var self = this;
    var sal = this.aleatorio(this.TAMANHO_SAL);
    var iv = this.aleatorio(this.TAMANHO_IV);
    return this.derivar(senha, sal, this.ITERACOES, 256)
      .then(function(bits) { return self.chaveAes(bits); })
      .then(function(chave) {
        return crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv, tagLength: 128 }, chave, self.utf8(self.VERIFICACAO)
        ).then(function(cifrado) {
          var registro = 'aesgcm$' + self.ITERACOES + '$' + self.hexagonal(sal) + '$' +
            self.hexagonal(iv) + '$' + self.hexagonal(new Uint8Array(cifrado));
          return { registro: registro, chave: chave };
        });
      });
  },

  abrirRegistroChave: function(registro, senha) {
    var partes = String(registro || '').split('$');
    if (partes.length !== 5 || partes[0] !== 'aesgcm') return Promise.resolve(null);
    var iteracoes = parseInt(partes[1], 10) || this.ITERACOES;
    var sal, iv, cifrado;
    try {
      sal = this.deHexadecimal(partes[2]);
      iv = this.deHexadecimal(partes[3]);
      cifrado = this.deHexadecimal(partes[4]);
    } catch (e) { return Promise.resolve(null); }
    if (sal.length !== this.TAMANHO_SAL || iv.length !== this.TAMANHO_IV) return Promise.resolve(null);

    var self = this;
    return this.derivar(senha, sal, iteracoes, 256)
      .then(function(bits) { return self.chaveAes(bits); })
      .then(function(chave) {
        return crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv, tagLength: 128 }, chave, cifrado
        ).then(function(plain) {
          var texto = self.deUtf8(new Uint8Array(plain));
          return self._igual(texto, self.VERIFICACAO) ? chave : null;
        }).catch(function() { return null; });
      }).catch(function() { return null; });
  },

  registroValido: function(registro) {
    return /^aesgcm\$\d+\$[0-9a-f]{32}\$[0-9a-f]{24}\$[0-9a-f]{32,}$/i.test(String(registro || ''));
  },

  // ---------- Cifrar / decifrar uma evolução ----------

  cifrar: function(chave, objeto) {
    var iv = this.aleatorio(this.TAMANHO_IV);
    var plain = this.utf8(JSON.stringify(objeto));
    return crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 }, chave, plain
    ).then(function(cifrado) {
      return {
        cifrado: true,
        iv: Cripto.base64(iv),
        dados: Cripto.base64(new Uint8Array(cifrado))
      };
    });
  },

  decifrar: function(chave, registro) {
    var iv, dados;
    try {
      iv = this.deBase64(registro.iv);
      dados = this.deBase64(registro.dados);
    } catch (e) { return Promise.reject(new Error('Evolução com formato inválido.')); }
    if (iv.length !== this.TAMANHO_IV) return Promise.reject(new Error('Evolução com formato inválido.'));
    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 }, chave, dados
    ).then(function(plain) {
      var objeto = JSON.parse(Cripto.deUtf8(new Uint8Array(plain)));
      if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) throw new Error('Conteúdo inválido.');
      return objeto;
    });
  }

};

window.Cripto = Cripto;
