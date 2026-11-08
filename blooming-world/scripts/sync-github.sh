#!/usr/bin/env bash
# ============================================================
# Синк «Цветущий мир» → GitHub (БЕЗ Cloudflare, решение игрока).
#
# Зеркалит проект в отдельную папку blooming-world/ целевого
# репозитория (по умолчанию — репозиторий SciFi Mahjong; в его
# файлы при этом НИЧЕГО не меняется — см. STATE.md §4).
#
# Конфиг — в .env корня проекта (заполняет игрок):
#   GITHUB_TOKEN=…            # PAT, Contents: Read and Write
#   GITHUB_REPO=owner/name    # целевой репозиторий
#   GITHUB_TARGET_FOLDER=blooming-world   # пусто = корень репо
#
# Запуск: bash scripts/sync-github.sh "Task N: суть изменений"
# Токен НЕ печатается и НЕ сохраняется в .git/config.
# ============================================================
set -euo pipefail

SRC="/home/z/my-project"
DST="$SRC/.github-sync"
MSG="${1:-sync: обновление проекта «Цветущий мир»}"

# --- конфиг из .env (только строки KEY=VALUE) ---
if [ ! -f "$SRC/.env" ]; then
  echo "✗ Нет $SRC/.env — заполни GITHUB_TOKEN/GITHUB_REPO (STATE.md §4)"; exit 1
fi
set -a
# shellcheck disable=SC2046
source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$SRC/.env")
set +a
: "${GITHUB_TOKEN:?✗ Заполни GITHUB_TOKEN в .env (см. STATE.md §4)}"
: "${GITHUB_REPO:?✗ Заполни GITHUB_REPO в .env (owner/name, см. STATE.md §4)}"
FOLDER="${GITHUB_TARGET_FOLDER:-blooming-world}"
AUTH_HDR="Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)"

# --- клон (или переиспользование) ---
if [ ! -d "$DST/.git" ]; then
  echo "→ Клонирую $GITHUB_REPO …"
  rm -rf "$DST"
  git -c http.extraheader="$AUTH_HDR" clone "https://github.com/$GITHUB_REPO.git" "$DST"
fi
BR="$(git -C "$DST" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')"
BR="${BR:-main}"
git -C "$DST" config user.name  "${GIT_AUTHOR_NAME:-Blooming World Sync}"
git -C "$DST" config user.email "${GIT_AUTHOR_EMAIL:-sync@blooming-world.local}"

# --- коммит + пуш (повторы, если origin уехал вперёд) ---
OK=0
for attempt in 1 2 3; do
  git -C "$DST" -c http.extraheader="$AUTH_HDR" fetch origin "$BR"
  git -C "$DST" reset --hard "origin/$BR"
  DEST="$DST"; [ -n "$FOLDER" ] && DEST="$DST/$FOLDER"
  mkdir -p "$DEST"
  rsync -a --delete --exclude-from "$SRC/scripts/sync-exclude.txt" "$SRC/" "$DEST/"
  git -C "$DST" add -A
  if git -C "$DST" diff --cached --quiet; then
    echo "• Изменений нет — пуш не нужен."; OK=1; break
  fi
  git -C "$DST" commit -m "blooming-world: $MSG"
  if git -C "$DST" -c http.extraheader="$AUTH_HDR" push origin "HEAD:$BR"; then
    OK=1; break
  fi
  echo "• Пуш отклонён (origin обновился) — повтор $attempt/3 …"
done

if [ "$OK" != 1 ]; then echo "✗ Не удалось запушить после 3 попыток"; exit 1; fi

echo "— последние коммиты:"
git -C "$DST" log --oneline -3
echo "✓ GitHub $GITHUB_REPO → ${FOLDER:-корень репозитория}"

# --- гвард секретов: в зеркале не должно быть .env/токенов ---
if git -C "$DST" ls-files | grep -qE '(^|/)\.env($|\.)|secret|credential'; then
  echo "⚠ ВНИМАНИЕ: в индексе есть файл, похожий на секрет — проверь sync-exclude.txt и убери вручную до следующего пуша!"
fi
