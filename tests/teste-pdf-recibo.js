/* Teste do PDF do comprovante com assinatura (gerado sem bibliotecas) */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const raiz = path.resolve(__dirname, '..');
const codigo = fs.readFileSync(raiz + '/js/recibos.js', 'utf8');

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

const textos = [];
const imagens = [];
const dataUrls = [];
const ctx = {
  fillStyle: '', strokeStyle: '', font: '', textAlign: '', textBaseline: '',
  lineWidth: 1, globalAlpha: 1,
  fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
  save() {}, restore() {},
  fillText(t) { textos.push(String(t)); },
  measureText(t) { return { width: String(t).length * 14 }; },
  drawImage(img) { imagens.push(img); }
};
const jpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];
const canvas = {
  width: 0, height: 0,
  getContext() { return ctx; },
  toDataURL(tipo, qualidade) {
    dataUrls.push([tipo, qualidade]);
    return 'data:image/jpeg;base64,' + Buffer.from(jpegBytes).toString('base64');
  }
};

let avisos = [];
let downloads = [];
let blobCriado = null;
let urlCriada = '';
let urlRevogada = '';

class FakeImage {
  set src(v) {
    this._src = v;
    const self = this;
    setTimeout(function() { if (self.onload) self.onload(); }, 0);
  }
  get src() { return this._src; }
}

const lancamentos = [{
  id: 902, data: '2026-11-26', horario: '14:00', paciente: 'Ana Silva', tipo: 'avaliacao',
  valor: 250, pagamento: 'cartao', status: 'pago'
}];
const dadosProfissional = {
  nome: 'Lívia Ferreira', crp: '04/74163', cpf: '000.000.000-00',
  assinatura: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
};

const c = {
  console, Promise, Uint8Array, Math, String, Number, JSON, Array, Object, Date,
  RegExp, Boolean, isFinite, parseInt, parseFloat, encodeURIComponent,
  setTimeout, setImmediate, atob, Buffer,
  lancamentos, dadosProfissional,
  CRP_PADRAO: '04/74163',
  hojeStr: '2026-11-26',
  formatarData() { return '26/11/2026'; },
  formatarMoeda(v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); },
  formatarCpf(v) { return String(v); },
  cpfValido() { return true; },
  escapeHtml(s) { return String(s); },
  Store: { salvar() {} },
  app: { toast(m) { avisos.push(m); }, abrirModal() {}, fecharModal() {} },
  segurancaModulo: { registrar() {} },
  whatsappModulo: { copiarTexto() {} },
  document: {
    createElement(tag) {
      if (tag === 'canvas') return canvas;
      return {
        href: '', download: '',
        click() { downloads.push(this.download); }
      };
    },
    getElementById() { return null; },
    body: { appendChild() {}, removeChild() {} },
    execCommand() { return true; }
  },
  Image: FakeImage,
  Blob: class {
    constructor(partes, opcoes) { blobCriado = { partes, opcoes }; }
  },
  URL: {
    createObjectURL() { urlCriada = 'blob:pdf-teste'; return urlCriada; },
    revokeObjectURL(u) { urlRevogada = u; }
  }
};
c.window = c;

// ===========================================================================
// 1. Código carregado
// ===========================================================================
vm.createContext(c);
vm.runInContext(codigo, c, { filename: 'recibos.js' });
const r = c.recibosModulo;

// ===========================================================================
// 2. Segurança da assinatura e nome do arquivo
// ===========================================================================
check('assinatura válida é aceita',
  r.assinaturaValida(dadosProfissional.assinatura) === dadosProfissional.assinatura);
check('código escondido na assinatura é recusado', r.assinaturaValida('<script>alert(1)</script>') === '');
check('nome do arquivo é limpo', r._nomePdf(lancamentos[0]) === 'comprovante-ana-silva-902.pdf',
  r._nomePdf(lancamentos[0]));

// ===========================================================================
// 3. Desenho do comprovante com assinatura e marca
// ===========================================================================
r._desenharComprovante(lancamentos[0], { width: 400, height: 400 }, { width: 300, height: 120 });
check('título aparece no PDF', textos.includes('COMPROVANTE SIMPLES'));
check('paciente aparece no PDF', textos.includes('Ana Silva'));
check('nome da profissional aparece', textos.includes('Lívia Ferreira'));
check('CRP aparece', textos.includes('CRP 04/74163'));
check('CPF aparece', textos.includes('CPF: 000.000.000-00'));
check('aviso de validade aparece', textos.some(t => t.includes('sem validade oficial')));
check('assinatura organizacional aparece', textos.includes('SaaS by Myttoz'));
check('marca e assinatura foram desenhadas', imagens.length === 2, imagens.length);
check('PDF usa Arial em A4 a 150 dpi', canvas.width === 1240 && canvas.height === 1754);

// ===========================================================================
// 4. Estrutura do arquivo PDF
// ===========================================================================
const pdf = r._pdfDeCanvas(canvas);
const conteudo = Buffer.from(pdf).toString('latin1');
check('cabeçalho PDF', conteudo.startsWith('%PDF-1.4'));
check('página A4', conteudo.includes('/MediaBox [0 0 595.28 841.89]'));
check('imagem JPEG embutida', conteudo.includes('/Filter /DCTDecode') &&
  conteudo.includes('/Width 1240 /Height 1754'));
check('imagem ocupa a página', conteudo.includes('/Im0 Do'));
check('canvas exportado em JPEG', dataUrls.length === 1 && dataUrls[0][0] === 'image/jpeg');
check('xref e trailer presentes', conteudo.includes('\nxref\n0 6\n') &&
  conteudo.includes('/Size 6 /Root 1 0 R') && conteudo.includes('%%EOF'));

const ref = conteudo.match(/startxref\n(\d+)/);
check('startxref aponta para a tabela xref',
  !!ref && conteudo.slice(Number(ref[1]), Number(ref[1]) + 4) === 'xref', ref && ref[1]);
const idxImg = conteudo.indexOf('/DCTDecode');
const inicioStream = conteudo.indexOf('stream\n', idxImg) + 'stream\n'.length;
const tamanhoImg = Number(conteudo.slice(idxImg, inicioStream).match(/\/Length (\d+)/)[1]);
check('tamanho do JPEG confere com o declarado', tamanhoImg === jpegBytes.length &&
  conteudo.slice(inicioStream, inicioStream + 3) === '\xFF\xD8\xFF', tamanhoImg);

// ===========================================================================
// 5. Fluxo completo de download
// ===========================================================================
(async function() {
  avisos = []; downloads = []; imagens.length = 0;
  r.baixarPdf(902);
  await new Promise(function(resolve) { setTimeout(resolve, 30); });

  check('arquivo baixado com o nome do paciente',
    downloads.length === 1 && downloads[0] === 'comprovante-ana-silva-902.pdf', downloads.join(','));
  check('blob é um PDF', blobCriado && blobCriado.opcoes.type === 'application/pdf');
  check('url temporária foi liberada', urlRevogada === urlCriada && !!urlCriada);
  check('aviso de PDF baixado', avisos.some(m => m.includes('PDF com assinatura')),
    avisos.join(' | '));
  check('imagens carregadas para o PDF', imagens.length === 2, imagens.length);

  // sem assinatura cadastrada, o PDF ainda sai com a marca e o nome/CRP
  dadosProfissional.assinatura = '';
  textos.length = 0; imagens.length = 0; downloads.length = 0;
  r._desenharComprovante(lancamentos[0], { width: 400, height: 400 }, null);
  check('sem assinatura: nome e CRP continuam', textos.includes('Lívia Ferreira') &&
    textos.includes('CRP 04/74163'));
  check('sem assinatura: só a marca é desenhada', imagens.length === 1, imagens.length);

  console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
  process.exit(falhas === 0 ? 0 : 1);
})().catch(function(erro) {
  console.log('ERRO ' + (erro && erro.stack ? erro.stack : erro));
  process.exit(1);
});
