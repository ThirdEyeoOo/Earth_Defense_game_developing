#!/bin/sh
# Rigenera "lista aggiornamenti/commits.txt": cronologia dei commit con
# dimensione dell'albero versionato e variazione rispetto al commit precedente.
# Chiamato automaticamente dagli hook git post-commit / post-merge / post-rewrite.

cd "$(git rev-parse --show-toplevel)" || exit 1
mkdir -p "lista aggiornamenti"
out="lista aggiornamenti/commits.txt"

human() {
  b=$1
  neg=""
  case $b in -*) neg="-"; b=${b#-} ;; esac
  if [ "$b" -ge 1048576 ]; then
    printf "%s%d.%d MB" "$neg" $((b / 1048576)) $((b % 1048576 * 10 / 1048576))
  elif [ "$b" -ge 1024 ]; then
    printf "%s%d.%d KB" "$neg" $((b / 1024)) $((b % 1024 * 10 / 1024))
  else
    printf "%s%d B" "$neg" "$b"
  fi
}

{
  echo "CRONOLOGIA COMMIT - Earth Defense"
  echo "Rigenerato automaticamente a ogni commit (hook git). Non modificare a mano."
  echo "Dimensione = somma dei file versionati a quel commit. Variazione = differenza dal commit precedente."
  echo "Branch: $(git rev-parse --abbrev-ref HEAD) - Aggiornato: $(git log -1 --date=format:'%Y-%m-%d %H:%M' --format=%cd)"
  echo "================================================================"
  echo ""

  prev=0
  n=0
  git log --reverse --date=format:'%Y-%m-%d %H:%M' --format='%H|%h|%cd|%s' | \
  while IFS='|' read -r full short date subject; do
    n=$((n + 1))
    size=$(git ls-tree -r -l "$full" | awk '{s+=$4} END {printf "%d", s}')
    delta=$((size - prev))
    if [ "$n" -eq 1 ]; then
      deltastr="(commit iniziale)"
    elif [ "$delta" -ge 0 ]; then
      deltastr="+$(human $delta)"
    else
      deltastr="$(human $delta)"
    fi
    printf '%3d) %s  %s\n' "$n" "$short" "$date"
    printf '     %s\n' "$subject"
    printf '     dimensione: %s | variazione: %s\n\n' "$(human "$size")" "$deltastr"
    prev=$size
  done
} > "$out"
