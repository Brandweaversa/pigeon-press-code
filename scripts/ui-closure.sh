#!/usr/bin/env bash
# Compute which shadcn ui components / hooks are transitively used, list the unused ones.
cd /home/z/my-project

# start from everything outside src/components/ui
roots=$(rg -l "@/components/ui/" src/ --glob '!src/components/ui/**' 2>/dev/null)

declare -A used
queue=()
for f in $roots; do
  while IFS= read -r m; do
    queue+=("$m")
  done < <(rg -o '@/components/ui/[a-z-]+' "$f" -N | sed 's|@/components/ui/||' | sort -u)
done

while [ ${#queue[@]} -gt 0 ]; do
  m="${queue[-1]}"; queue=("${queue[@]:0:${#queue[@]}-1}")
  [ -n "$m" ] || continue
  [ -n "${used[$m]:-}" ] && continue
  file="src/components/ui/$m.tsx"
  [ -f "$file" ] || { used["$m"]="missing"; continue; }
  used["$m"]="1"
  for dep in $(rg -o '@/components/ui/[a-z-]+' "$file" -N | sed 's|@/components/ui/||' | sort -u); do
    [ -n "${used[$dep]:-}" ] || queue+=("$dep")
  done
done

echo "=== USED ui components ==="
printf "%s\n" "${!used[@]}" | sort
echo ""
echo "=== UNUSED ui components (delete candidates) ==="
for f in src/components/ui/*.tsx; do
  name=$(basename "$f" .tsx)
  [ -z "${used[$name]:-}" ] && echo "$name"
done | sort
echo ""
echo "=== hooks usage outside ui ==="
rg -l '@/hooks/' src/ --glob '!src/hooks/**' 2>/dev/null | while read -r f; do echo "$f -> $(rg -o '@/hooks/[a-z-]+' "$f" -N | sort -u | tr '\n' ' ')"; done
echo "(files in src/components/ui using hooks:)"; rg -l '@/hooks/' src/components/ui/ 2>/dev/null
