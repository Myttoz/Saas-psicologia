#!/usr/bin/env bash
# Backup local do banco Supabase para a pasta Backup/ do projeto.
# Uso: scripts/backup-banco.sh
# A senha é digitada na hora (não fica salva em arquivo nem no histórico).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="$RAIZ/Backup"
mkdir -p "$DESTINO"

# O project ref vem do próprio config.js do site (evita digitar e errar).
REF="$(grep -o 'https://[a-z0-9]*\.supabase\.co' "$RAIZ/js/config.js" | head -1 | sed 's#https://##; s#\.supabase\.co##')"
if [ -z "$REF" ]; then
  echo "Não consegui ler o project ref em js/config.js." >&2
  exit 1
fi

HOST="${SUPABASE_POOLER_HOST:-aws-0-sa-east-1.pooler.supabase.com}"
ARQUIVO="$DESTINO/backup-supabase-$(date +%F).sql"

echo "Projeto Supabase: $REF"
echo "Servidor:        $HOST"
echo "Arquivo:         $ARQUIVO"
echo

if command -v pg_dump >/dev/null 2>&1; then
  DUMP="$(command -v pg_dump)"
else
  DUMP="/usr/lib/postgresql/17/bin/pg_dump"
fi
"$DUMP" --version

read -rsp 'Senha do banco Supabase: ' SENHA
echo

PGPASSWORD="$SENHA" "$DUMP" \
  --host="$HOST" \
  --port=5432 \
  --username="postgres.$REF" \
  --dbname=postgres \
  --schema=public \
  --no-owner --no-privileges \
  --format=plain \
  --file="$ARQUIVO"

if [ ! -s "$ARQUIVO" ]; then
  echo "ERRO: o arquivo ficou vazio." >&2
  exit 1
fi

echo
echo "Backup concluído: $ARQUIVO"
echo "Copie esse arquivo para a pasta privada do Drive."
