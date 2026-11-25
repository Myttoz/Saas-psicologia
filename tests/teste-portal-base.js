/* Teste: base do portal do paciente — tabelas, RLS, convite e utilitários */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const raiz = path.resolve(__dirname, '..') + '/';
const sql = fs.readFileSync(raiz + 'supabase/schema.sql', 'utf8');
const config = fs.readFileSync(raiz + 'js/config.js', 'utf8');
const portalJs = fs.readFileSync(raiz + 'js/portal.js', 'utf8');

let falhas = 0;
function check(nome, condicao, extra) {
  console.log((condicao ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!condicao) falhas++;
}

const secao = sql.slice(sql.indexOf('-- ---------- 4. Portal do paciente'));
const tabelas = [
  'portal_pacientes',
  'portal_convites',
  'portal_acessos',
  'portal_recados',
  'portal_recibos',
  'portal_sessoes'
];

console.log('\n[1] Tabelas e RLS');
tabelas.forEach(function(tabela) {
  check('tabela ' + tabela, sql.indexOf('create table if not exists public.' + tabela) > -1);
  check('RLS ligada em ' + tabela,
    sql.indexOf('alter table public.' + tabela + ' enable row level security') > -1);
  check('política MFA em ' + tabela,
    new RegExp('on public\\.' + tabela + ' as restrictive').test(sql));
  check('anon revogado em ' + tabela,
    new RegExp('revoke all on public\\.' + tabela + ' from anon, public').test(sql));
});

console.log('\n[2] Regras de acesso');
check('paciente entra só pelo vínculo', secao.indexOf('portal_acessos a') > -1);
check('sem vínculo por nome', !/where\s+nome\s*=/i.test(secao));
check('recados: profissional inicia', secao.indexOf("autor = 'profissional'") > -1);
check('recados: paciente responde', secao.indexOf("autor = 'paciente'") > -1);
check('recados: só lido_em pode mudar', secao.indexOf('grant update (lido_em)') > -1);
check('recibo guarda número e código',
  secao.indexOf('numero text') > -1 && secao.indexOf('codigo text') > -1);
check('sessões filtradas por paciente', secao.indexOf('Paciente vê só suas sessões') > -1);
check('todas as políticas são para authenticated', !/create policy[^\n]*to public/i.test(secao));
check('política do vínculo vem depois da tabela de acessos',
  sql.indexOf('create policy "Paciente lê o próprio vínculo"') >
  sql.indexOf('create table if not exists public.portal_acessos'));
check('helper evita recursão RLS', sql.indexOf('function public.portal_eh_profissional') > -1);
check('portal_acessos não consulta portal_pacientes direto nas políticas',
  !/create policy "Profissional lê acessos dos seus pacientes"[\s\S]*?portal_pacientes[\s\S]*?create policy "Profissional revoga acesso"/.test(sql) &&
  sql.indexOf('public.portal_eh_profissional(paciente_portal_id)') > -1);

console.log('\n[3] Convite sem chave administrativa');
check('função de aceite existe', secao.indexOf('function public.portal_aceitar_convite()') > -1);
check('função roda no banco', secao.indexOf('security definer') > -1);
check('e-mail vem do token', secao.indexOf("auth.jwt()->>'email'") > -1);
check('convite expira', secao.indexOf('expira_em > now()') > -1);
check('um usuário fica ligado a um paciente', secao.indexOf('on conflict (user_id) do update') > -1);
const semComentarios = (sql + '\n' + config + '\n' + portalJs)
  .replace(/--[^\n]*/g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');
check('sem service_role em código ativo', !/service_role/.test(semComentarios));
check('nenhuma chamada de rede no utilitário', !/fetch\s*\(/.test(portalJs));

console.log('\n[4] Utilitários do portal');
global.window = global;
vm.runInThisContext(portalJs, { filename: 'js/portal.js' });
const Portal = global.Portal;
check('senha fraca é recusada', Portal.forcaSenha('Curta1!').ok === false);
check('senha sugerida é forte', Portal.forcaSenha(Portal.sugerirSenha()).ok === true);
check('link mágico é lido do #', Portal.lerTokenDaUrl('#access_token=abc&refresh_token=def&type=magiclink').token === 'abc');
check('erro do link é aproveitado',
  Portal.lerTokenDaUrl('#error=access_denied&error_description=expirado').erro === 'expirado');
check('retorno aponta para portal.html',
  Portal.urlDeRetorno('https://myttoz.github.io/Saas-psicologia/') ===
  'https://myttoz.github.io/Saas-psicologia/portal.html');
check('e-mail inválido é recusado', Portal.validarEmail('ana@') === false);

console.log('\n' + (falhas === 0
  ? 'BASE DO PORTAL OK'
  : 'FALHAS: ' + falhas));
process.exit(falhas === 0 ? 0 : 1);
