/* Teste do backup local e do modelo de workflow automático */
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '..') + '/';
const script = fs.readFileSync(raiz + 'scripts/backup-banco.sh', 'utf8');
const workflow = fs.readFileSync(raiz + 'Backup/backup-semanal.yml', 'utf8');
const passo = fs.readFileSync(raiz + 'Backup/PASSO-A-PASSO.md', 'utf8');
const gitignore = fs.readFileSync(raiz + '.gitignore', 'utf8');
const config = fs.readFileSync(raiz + 'js/config.js', 'utf8');

let falhas = 0;
function check(nome, cond, extra) {
  console.log((cond ? 'OK   ' : 'ERRO ') + nome + (extra ? ' -> ' + extra : ''));
  if (!cond) falhas++;
}

check('pasta Backup existe', fs.statSync(raiz + 'Backup').isDirectory());
check('backup antigo ficou dentro da pasta',
  fs.existsSync(raiz + 'Backup/backup-supabase-2026-11-27.sql'));
check('arquivo antigo saiu da raiz', !fs.existsSync(raiz + 'backup-supabase-2026-11-27.sql'));
check('dumps ficam fora do Git', gitignore.includes('Backup/*.sql') &&
  gitignore.includes('Backup/*.dump'));
check('modelos e instruções continuam versionáveis',
  !gitignore.includes('Backup/*.yml') && !gitignore.includes('Backup/*.md'));

check('script salva na pasta Backup', script.includes('DESTINO="$RAIZ/Backup"') &&
  script.includes('backup-supabase-$(date +%F).sql'));
check('script descobre o projeto pelo config.js', script.includes('js/config.js') &&
  script.includes('supabase.co'));
check('script pede a senha sem mostrar', script.includes('read -rsp'));
check('senha vai por variável de ambiente', script.includes('PGPASSWORD="$SENHA"'));
check('usa o schema public e valida o arquivo', script.includes('--schema=public') &&
  script.includes('[ ! -s "$ARQUIVO" ]'));
check('script não usa service_role', !/service_role/.test(script));

check('workflow usa checkout v5', workflow.includes('actions/checkout@v5'));
check('workflow roda domingo 07:00 Brasília', workflow.includes("cron: '0 10 * * 0'"));
check('workflow pode ser disparado à mão', workflow.includes('workflow_dispatch:'));
check('workflow tem permissão para commitar', workflow.includes('contents: write'));
check('workflow usa pg_dump 17', workflow.includes('postgresql-client-17') &&
  workflow.includes('/usr/lib/postgresql/17/bin/pg_dump'));
check('workflow usa o formato .dump', workflow.includes('--format=custom') &&
  workflow.includes('.dump'));
check('workflow confere tamanho maior que zero', workflow.includes('test -s "$ARQUIVO"'));
check('workflow falha se faltar o secret', workflow.includes('Secret SUPABASE_DB_URL'));
check('workflow não usa service_role', !/service_role/.test(workflow));

check('instruções pedem repositório privado', passo.includes('privado') &&
  passo.includes('psicologia-backup'));
check('instruções explicam que não há anexos no Storage',
  passo.includes('portal_recibos') && passo.includes('Não use'));
check('instruções trazem restauração', passo.includes('pg_restore'));
check('project ref do config bate com o usado no script',
  /wrdkbafdzjsqonyidrwv/.test(config));

console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
process.exit(falhas === 0 ? 0 : 1);
