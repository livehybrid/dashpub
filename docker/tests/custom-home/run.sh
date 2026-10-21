#!/bin/sh
# Build the template once per fixture header, installed exactly as the container
# entrypoint installs it, and prove the header's marker text reached the bundle.
#
# Usage (from the repo root, after `npm ci` in template/):
#   docker/tests/custom-home/run.sh [fixture ...]
set -u

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
components="$root/template/src/components"
fixtures="${*:-jsx-in-js.js jsx.jsx plain.js}"

# Restore the template's header files after every case, from git, not from memory.
restore() {
  rm -f "$components"/home_header.*
  git -C "$root" checkout -- template/src/components
}

failed=""
for f in $fixtures; do
  marker="$(grep -o 'marker-custom-home-[a-z-]*' "$here/$f" | head -n1)"
  echo "=== $f (expect '$marker' in the bundle)"
  restore
  rm -rf "$root/template/dist"
  if ! "$root/docker/install-custom-home.sh" "$here/$f" "$components"; then
    echo "FAIL $f: install script failed"; failed="$failed $f"; continue
  fi
  if ! (cd "$root/template" && NODE_ENV=production npm run build >"/tmp/custom-home-$f.log" 2>&1); then
    echo "FAIL $f: build failed"; grep -iE 'error|jsx' "/tmp/custom-home-$f.log" | head -n 20
    failed="$failed $f"; continue
  fi
  if grep -rqF "$marker" "$root/template/dist"; then
    echo "PASS $f"
  else
    echo "FAIL $f: build passed but '$marker' is not in template/dist"; failed="$failed $f"
  fi
done
restore

if [ -n "$failed" ]; then
  echo "custom home header failures:$failed"
  exit 1
fi
echo "all custom home headers built"
