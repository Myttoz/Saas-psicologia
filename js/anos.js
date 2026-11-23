// ============================================================================
// Gestão Anual — criar anos limpos, escolher o ano em uso e excluir com confirmação
// ============================================================================

var gestaoAnualModulo = {

  // Um ano novo começa SEM dados: nada de atendimentos, evoluções ou pacientes
  // é copiado. Pacientes e convênios são gerais e permanecem.
  inicializar: function() {
    var mudou = this.garantirAnos();
    if (typeof mesesModulo !== 'undefined') {
      mesesModulo.ano = anoAtivo;
      mesesModulo.reiniciarSelecao(anoAtivo);
    }
    return mudou;
  },

  // Inclui o ano atual, o ano em uso e qualquer ano que já apareça nos dados.
  // Assim um backup antigo (sem a lista de anos) continua funcionando.
  garantirAnos: function() {
    var antes = JSON.stringify({ anos: anos, anoAtivo: anoAtivo });
    anos = typeof normalizarAnos === 'function' ? normalizarAnos(anos) : [];
    var vistos = {};
    var i;
    for (i = 0; i < anos.length; i++) vistos[anos[i].ano] = true;

    function adicionar(valor) {
      var n = typeof anoValido === 'function' ? anoValido(valor) : Number(valor);
      if (n === null || !isFinite(n) || Math.floor(n) !== n || n < 1900 || n > 2100) return;
      if (vistos[n]) return;
      vistos[n] = true;
      anos.push({ ano: n, criadoEm: '' });
    }

    adicionar(anoAtivo);
    adicionar(new Date().getFullYear());
    for (i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].data) adicionar(String(lancamentos[i].data).slice(0, 4));
    }
    for (i = 0; i < evolucoes.length; i++) {
      if (evolucoes[i].data) adicionar(String(evolucoes[i].data).slice(0, 4));
    }

    anos.sort(function(a, b) { return a.ano - b.ano; });
    var at = typeof anoValido === 'function' ? anoValido(anoAtivo) : null;
    if (at === null || !vistos[at]) {
      anoAtivo = anos.length ? anos[anos.length - 1].ano : new Date().getFullYear();
    }
    return JSON.stringify({ anos: anos, anoAtivo: anoAtivo }) !== antes;
  },

  anosDisponiveis: function() {
    var vistos = {};
    var lista = [];
    var i;
    function adicionar(valor) {
      var n = typeof anoValido === 'function' ? anoValido(valor) : Number(valor);
      if (n === null || !isFinite(n) || Math.floor(n) !== n || n < 1900 || n > 2100) return;
      if (vistos[n]) return;
      vistos[n] = true;
      lista.push(n);
    }
    for (i = 0; i < anos.length; i++) adicionar(anos[i].ano);
    for (i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].data) adicionar(String(lancamentos[i].data).slice(0, 4));
    }
    for (i = 0; i < evolucoes.length; i++) {
      if (evolucoes[i].data) adicionar(String(evolucoes[i].data).slice(0, 4));
    }
    lista.sort(function(a, b) { return a - b; });
    return lista;
  },

  contar: function(ano) {
    var prefixo = String(ano) + '-';
    var atendimentos = 0;
    var evolucoesAno = 0;
    var i;
    for (i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].data && String(lancamentos[i].data).indexOf(prefixo) === 0) atendimentos++;
    }
    for (i = 0; i < evolucoes.length; i++) {
      if (evolucoes[i].data && String(evolucoes[i].data).indexOf(prefixo) === 0) evolucoesAno++;
    }
    return { atendimentos: atendimentos, evolucoes: evolucoesAno, total: atendimentos + evolucoesAno };
  },

  definirAno: function(ano, semAuditoria) {
    var n = typeof anoValido === 'function' ? anoValido(ano) : Number(ano);
    if (n === null || this.anosDisponiveis().indexOf(n) === -1) {
      if (typeof app !== 'undefined') app.toast('Esse ano não existe na lista.');
      return false;
    }
    anoAtivo = n;
    if (typeof mesesModulo !== 'undefined') {
      mesesModulo.ano = n;
      mesesModulo.reiniciarSelecao(n);
    }
    if (typeof Store !== 'undefined') Store.salvar();
    if (!semAuditoria && typeof segurancaModulo !== 'undefined') {
      segurancaModulo.registrar('Ano ativo alterado', String(n));
    }
    var pagina = typeof document !== 'undefined' ? document.querySelector('.page.active') : null;
    if (pagina && pagina.id !== 'page-anos' && typeof app !== 'undefined') {
      app.renderizarPagina(pagina.id.replace('page-', ''));
    }
    this.render();
    return true;
  },

  criar: function() {
    var sugerido = (typeof anoValido === 'function' ? anoValido(anoAtivo) : Number(anoAtivo)) || new Date().getFullYear();
    var resposta = window.prompt('Qual ano deseja criar? Ele começa vazio.', String(sugerido + 1));
    if (resposta === null) return;
    var ano = typeof anoValido === 'function' ? anoValido(resposta) : Number(resposta);
    if (ano === null || !isFinite(ano) || Math.floor(ano) !== ano || ano < 1900 || ano > 2100) {
      if (typeof app !== 'undefined') app.toast('Ano inválido. Use quatro números, como 2027.');
      return;
    }
    if (this.anosDisponiveis().indexOf(ano) !== -1) {
      if (typeof app !== 'undefined') app.toast('Esse ano já existe. Escolha outro.');
      return;
    }
    anos.push({ ano: ano, criadoEm: new Date().toISOString() });
    anos.sort(function(a, b) { return a.ano - b.ano; });
    this.definirAno(ano, true);
    if (typeof segurancaModulo !== 'undefined') segurancaModulo.registrar('Ano criado', String(ano));
    if (typeof app !== 'undefined') app.toast('Ano ' + ano + ' criado vazio. Os meses dele estão prontos.');
  },

  excluir: function(ano) {
    var n = typeof anoValido === 'function' ? anoValido(ano) : Number(ano);
    if (n === null || !isFinite(n)) return;
    var contagem = this.contar(n);
    var aviso = 'Excluir TODO o ano ' + n + '?\n\n' +
      'Serão apagados: ' + contagem.atendimentos + ' atendimento(s) e ' +
      contagem.evolucoes + ' evolução(ões) desse ano.\n' +
      'Pacientes e convênios ficam.\n\n' +
      'A exclusão pede a senha da sua conta e o código do celular.';
    if (!window.confirm(aviso)) return;
    var digitado = window.prompt('Para confirmar, digite o ano ' + n + ':');
    if (digitado === null || String(digitado).trim() !== String(n)) {
      if (typeof app !== 'undefined') app.toast('Confirmação não conferiu. Nada foi apagado.');
      return;
    }

    var self = this;
    var executar = function() {
      var removidos = self.contar(n);
      var prefixo = String(n) + '-';
      lancamentos = lancamentos.filter(function(item) {
        return !(item.data && String(item.data).indexOf(prefixo) === 0);
      });
      evolucoes = evolucoes.filter(function(item) {
        return !(item.data && String(item.data).indexOf(prefixo) === 0);
      });
      anos = anos.filter(function(item) { return item.ano !== n; });
      if (anoAtivo === n) {
        var restantes = self.anosDisponiveis();
        anoAtivo = restantes.length ? restantes[restantes.length - 1] : new Date().getFullYear();
      }
      self.garantirAnos();
      if (typeof mesesModulo !== 'undefined') {
        mesesModulo.ano = anoAtivo;
        mesesModulo.reiniciarSelecao(anoAtivo);
      }
      if (typeof Store !== 'undefined') Store.salvar();
      if (typeof segurancaModulo !== 'undefined') {
        segurancaModulo.registrar('Ano excluído', n + ' (' + removidos.atendimentos +
          ' atendimentos, ' + removidos.evolucoes + ' evoluções)');
      }
      if (typeof app !== 'undefined') app.toast('Ano ' + n + ' excluído.');
      self.render();
    };

    if (typeof backupModulo !== 'undefined' && typeof backupModulo._reautenticar === 'function') {
      backupModulo._reautenticar(executar);
    } else {
      executar();
    }
  },

  render: function() {
    var root = document.getElementById('anosConteudo');
    if (!root) return;
    var lista = this.anosDisponiveis();
    var html = '<div class="alert-note">' +
      '<strong>Anos separados.</strong> Criar um ano novo não copia nada: ele começa com os meses vazios. ' +
      'Trocar de ano muda os atendimentos, resumos e situações mostrados. Excluir um ano apaga ' +
      'somente os dados dele e pede sua senha e o código do celular. Pacientes e convênios ficam.' +
      '</div>';

    html += '<div class="card"><div class="card-header-inline">' +
      '<h2>Anos do sistema</h2>' +
      '<span class="card-subtitle">Ano em uso: ' + escapeHtml(String(anoAtivo)) + '</span>' +
      '</div>';

    if (!lista.length) {
      html += '<div class="empty"><h3>Nenhum ano ainda</h3>' +
        '<p>Crie o primeiro ano para começar a organizar os atendimentos.</p></div>';
    } else {
      html += '<div class="anos-lista">';
      for (var i = 0; i < lista.length; i++) {
        var ano = lista[i];
        var c = this.contar(ano);
        var emUso = ano === anoAtivo;
        html += '<div class="ano-linha' + (emUso ? ' ativo' : '') + '">' +
          '<div><strong>' + ano + '</strong> ' +
          (emUso ? '<span class="badge badge-compareceu">Em uso</span>' : '') +
          '<div class="cell-sub">' + c.atendimentos + ' atendimento(s) · ' +
          c.evolucoes + ' evolução(ões)</div></div>' +
          '<div class="header-actions">' +
          (emUso ? '' : '<button type="button" class="btn btn-outline" onclick="gestaoAnualModulo.definirAno(' + ano + ')">Trabalhar neste ano</button>') +
          '<button type="button" class="btn btn-outline" onclick="gestaoAnualModulo.excluir(' + ano + ')">🗑 Excluir ano</button>' +
          '</div></div>';
      }
      html += '</div>';
    }
    html += '</div>';
    root.innerHTML = html;
  }

};

window.gestaoAnualModulo = gestaoAnualModulo;
