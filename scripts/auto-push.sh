#!/usr/bin/env bash
# auto-push.sh — commita, envia para a branch de trabalho e leva tudo para a main.
#
# Uso:
#   ./scripts/auto-push.sh "mensagem do commit"
#   ./scripts/auto-push.sh                      # usa uma mensagem padrão com data/hora
#
# O que ele faz:
#   1. git add -A + commit (se houver mudanças)
#   2. push para a branch de trabalho (arena/...)
#   3. abre um PR para a main (se ainda não existir) e faz o merge automático
#   4. atualiza a branch local com o estado novo da main

set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
BASE="main"
MSG="${1:-chore: sincronização automática $(date -u '+%Y-%m-%d %H:%M UTC')}"

echo "==> Branch de trabalho: $BRANCH"

if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "$MSG"
  echo "==> Commit criado: $MSG"
else
  echo "==> Nenhuma alteração para commitar."
fi

echo "==> Enviando para origin/$BRANCH"
git push -u origin "$BRANCH"

# Nada novo em relação à main? Então não há PR a abrir.
if [[ -z "$(git log "origin/$BASE..$BRANCH" --oneline)" ]]; then
  echo "==> $BRANCH já está igual à $BASE. Nada a mesclar."
  exit 0
fi

PR="$(gh pr list --head "$BRANCH" --base "$BASE" --state open --json number --jq '.[0].number' || true)"

if [[ -z "$PR" ]]; then
  echo "==> Abrindo PR para $BASE"
  gh pr create --base "$BASE" --head "$BRANCH" --title "$MSG" --body "Sincronização automática de \`$BRANCH\` para \`$BASE\`."
  PR="$(gh pr list --head "$BRANCH" --base "$BASE" --state open --json number --jq '.[0].number')"
fi

echo "==> Mesclando PR #$PR na $BASE"
gh pr merge "$PR" --merge --admin

git fetch origin "$BASE"
echo "==> Pronto. main atualizada: $(git log --oneline -1 "origin/$BASE")"
