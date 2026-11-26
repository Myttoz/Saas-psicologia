// ============================================================================
// Portal do paciente — utilitários sem rede e sem efeito colateral.
// Aqui ficam só as regras que dá para testar antes de ligar a interface.
// Nenhuma chave administrativa aparece neste arquivo.
// ============================================================================

var Portal = {

  // O paciente não usa MFA, mas precisa criar uma senha forte no primeiro acesso.
  forcaSenha: function(senha) {
    var s = String(senha === null || senha === undefined ? '' : senha);
    var regras = [
      { nome: '12 caracteres ou mais', ok: s.length >= 12 },
      { nome: 'letra', ok: /[A-Za-zÀ-ÿ]/.test(s) },
      { nome: 'número', ok: /[0-9]/.test(s) },
      { nome: 'símbolo', ok: /[^A-Za-z0-9À-ÿ\s]/.test(s) },
      { nome: 'sem espaços', ok: !/\s/.test(s) }
    ];
    var faltam = [];
    for (var i = 0; i < regras.length; i++) {
      if (!regras[i].ok) faltam.push(regras[i].nome);
    }
    return {
      ok: faltam.length === 0,
      pontos: regras.length - faltam.length,
      total: regras.length,
      faltam: faltam,
      mensagem: faltam.length === 0
        ? 'Senha forte.'
        : 'Faltam: ' + faltam.join(', ') + '.'
    };
  },

  _aleatorio: function() {
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        var numeros = new Uint32Array(1);
        crypto.getRandomValues(numeros);
        return numeros[0] / 4294967296;
      }
    } catch (e) {}
    return Math.random();
  },

  sugerirSenha: function() {
    var grupos = [
      'abcdefghjkmnpqrstuvwxyz',
      'ABCDEFGHJKLMNPQRSTUVWXYZ',
      '23456789',
      '@#$%&*+-'
    ];
    var todos = grupos.join('');
    var senha = [];
    for (var g = 0; g < grupos.length; g++) {
      var grupo = grupos[g];
      senha.push(grupo.charAt(Math.floor(this._aleatorio() * grupo.length)));
    }
    while (senha.length < 14) {
      senha.push(todos.charAt(Math.floor(this._aleatorio() * todos.length)));
    }
    for (var i = senha.length - 1; i > 0; i--) {
      var j = Math.floor(this._aleatorio() * (i + 1));
      var temporario = senha[i];
      senha[i] = senha[j];
      senha[j] = temporario;
    }
    return senha.join('');
  },

  // O link mágico do Supabase chega no fragmento (#...), não na query.
  lerTokenDaUrl: function(hash) {
    var bruto = String(hash === undefined || hash === null ? '' : hash).replace(/^#/, '');
    var partes = {};
    var pares = bruto.split('&');
    for (var i = 0; i < pares.length; i++) {
      var pedaco = pares[i];
      if (!pedaco) continue;
      var indice = pedaco.indexOf('=');
      var chave = indice < 0 ? pedaco : pedaco.slice(0, indice);
      var valor = indice < 0 ? '' : pedaco.slice(indice + 1);
      try { chave = decodeURIComponent(chave); } catch (e) {}
      try { valor = decodeURIComponent(valor); } catch (e) {}
      partes[chave] = valor;
    }
    return {
      token: partes.access_token || '',
      refresh: partes.refresh_token || '',
      tipo: partes.type || '',
      erro: partes.error_description || partes.error || ''
    };
  },

  // Monta a URL do portal a partir de qualquer endereço da página
  // (origin puro perde o caminho /Saas-psicologia, por isso usamos a URL completa).
  urlDeRetorno: function(base) {
    var s = String(base === undefined || base === null ? '' : base)
      .split('#')[0].split('?')[0]
      .replace(/[^/]*$/, ''); // remove nome do arquivo (index.html, portal.html...)
    return s.replace(/\/+$/, '') + '/portal.html';
  },

  // Traduz o erro técnico do link mágico para uma mensagem que o paciente entende.
  mensagemErroLink: function(desc) {
    var s = String(desc === undefined || desc === null ? '' : desc).toLowerCase();
    if (/expired|invalid|otp_expired|access_denied|has already been used/.test(s)) {
      return 'Este link expirou ou já foi usado (ele vale uma única vez). ' +
        'Não tem problema: entre com o seu e-mail e a senha que você criou. ' +
        'Se não lembrar da senha, peça à sua psicóloga para reenviar o acesso.';
    }
    return String(desc || '');
  },

  validarEmail: function(email) {
    var s = String(email === null || email === undefined ? '' : email).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

};

window.Portal = Portal;
