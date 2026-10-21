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

cp "$src" "$dest_dir/home_header.js"
echo "Installed custom home header $src as $dest_dir/home_header.js"
