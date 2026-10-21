#!/bin/sh
# Install a custom home-page header (DASHPUB_CUSTOM_HOME_PATH) into a dashpub app.
#
# Usage: install-custom-home.sh <header file> <app src/components dir>
set -e

src="$1"
dest_dir="$2"

if [ -z "$src" ] || [ -z "$dest_dir" ]; then
  echo "usage: $0 <header file> <components dir>" >&2
  exit 2
fi
if [ ! -f "$src" ]; then
  echo "custom home header not found: $src" >&2
  exit 1
fi

# Always install as .jsx. Vite 8 (rolldown) parses .js files with JSX disabled, so a
# JSX header copied to home_header.js fails the build with "JSX syntax is disabled".
# JSX is a superset of plain JS, so a plain-JS header still builds as .jsx.
# home.jsx imports "./home_header" without an extension and Vite tries .js before
# .jsx, so the template's own home_header.js (and any other variant) must go.
rm -f "$dest_dir"/home_header.js "$dest_dir"/home_header.jsx \
      "$dest_dir"/home_header.ts "$dest_dir"/home_header.tsx
cp "$src" "$dest_dir/home_header.jsx"
echo "Installed custom home header $src as $dest_dir/home_header.jsx"
