#!/bin/sh
set -e

# Set environment variables
export NEXT_PUBLIC_DASHPUBTITLE=$DASHPUB_TITLE
export NEXT_PUBLIC_DASHPUBSCREENSHOTDIR=$DASHPUB_SCREENSHOT_DIR
export NEXT_PUBLIC_DASHPUBSCREENSHOTEXT=$DASHPUB_SCREENSHOT_EXT
export NEXT_PUBLIC_DASHPUBSCREENSHOTS=$DASHPUB_SCREENSHOTS
export NEXT_PUBLIC_HOMETHEME=$DASHPUB_THEME
export NEXT_PUBLIC_DASHPUBHOSTEDBY=$DASHPUB_HOSTEDBY_NAME
export NEXT_PUBLIC_DASHPUBHOSTEDURL=$DASHPUB_HOSTEDBY_URL
export NEXT_PUBLIC_DASHPUBFOOTER=$DASHPUB_FOOTER
export NEXT_PUBLIC_DASHPUBREPO=$DASHPUB_REPO
export NEXT_PUBLIC_URL=$VERCEL_URL
ENV_MODE="${ENV_MODE:-production}"
NODE_ENV="${NODE_ENV:-production}"

git config --global user.email "dashpub@yourdomain.com"
git config --global user.name "Splunk DashPub"

# Ensure PATH includes standard locations
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

echo "Starting DashPub container..."
echo "User: $(id)"
echo "Working directory: $(pwd)"
echo "Environment mode: $ENV_MODE"
echo "Current PATH: $PATH"

# Handle DASHPUB_BRANCH installation with proper permissions
if [ "${DASHPUB_BRANCH}" ]; then
  echo "Using dashpub from branch $DASHPUB_BRANCH"
  # Ensure we have proper permissions for global installation
  if [ "$(id -u)" = "0" ]; then
    # Running as root, install globally
    echo "Installing dashpub globally as root..."
    npm i -g https://github.com/livehybrid/dashpub/tarball/$DASHPUB_BRANCH --unsafe-perm
  else
    # Not running as root, install to user directory
    echo "Installing dashpub to user directory..."
    npm i -g https://github.com/livehybrid/dashpub/tarball/$DASHPUB_BRANCH --unsafe-perm --prefix /home/nodejs/.npm-global
    export PATH="/home/nodejs/.npm-global/bin:$PATH"
    echo "Updated PATH: $PATH"
  fi
  echo "DashPub installation completed"
fi

# Function to run dashpub command
run_dashpub() {
  local cmd="$1"
  shift
  local args="$@"
  
  echo "Attempting to run dashpub $cmd with args: $args"
  
  # Try to find dashpub command
  if command -v dashpub >/dev/null 2>&1; then
    echo "Using global dashpub command: $(which dashpub)"
    dashpub $cmd $args
  elif [ -f "/usr/local/bin/dashpub" ]; then
    echo "Using dashpub from /usr/local/bin"
    /usr/local/bin/dashpub $cmd $args
  elif [ -f "/home/nodejs/.npm-global/bin/dashpub" ]; then
    echo "Using dashpub from user npm global"
    /home/nodejs/.npm-global/bin/dashpub $cmd $args
  elif [ -f "/build/cli/cli.js" ]; then
    echo "Using dashpub from build directory CLI"
    node /build/cli/cli.js $cmd $args
  else
    echo "ERROR: dashpub command not found anywhere!"
    echo "Available commands in /usr/local/bin:"
    ls -la /usr/local/bin/ || echo "No /usr/local/bin directory"
    echo "Available commands in /home/nodejs/.npm-global/bin:"
    ls -la /home/nodejs/.npm-global/bin/ 2>/dev/null || echo "No user npm global directory"
    echo "Checking for dashpub in common locations:"
    find /usr/local -name "dashpub" 2>/dev/null || echo "No dashpub found in /usr/local"
    find /home/nodejs -name "dashpub" 2>/dev/null || echo "No dashpub found in /home/nodejs"
    echo "Checking npm global list:"
    npm list -g --depth=0 2>/dev/null || echo "npm global list failed"
    echo "Checking if CLI file exists:"
    ls -la /build/cli/ 2>/dev/null || echo "No /build/cli directory"
    echo "Checking package.json bin field:"
    if [ -f "/build/package.json" ]; then
      echo "Package.json bin field:"
      node -e "const pkg = require('/build/package.json'); console.log('bin:', pkg.bin); console.log('main:', pkg.main);" 2>/dev/null || echo "Failed to read package.json"
    else
      echo "No package.json found in /build"
    fi
    exit 1
  fi
}

echo "DashPub command resolution completed"

if [ ! -f /tmp/hasBuilt ];
then
  if [ "${DASHPUB_APP}" ];
  then
    echo "Configuring dashpub with Env variables"
    run_dashpub init
    cd /home/nodejs/app
    if [ "${DASHPUB_CUSTOM_HOME_PATH}" ];
      then
      cp $DASHPUB_CUSTOM_HOME_PATH src/components/home_header.js
    fi
    yarn add typescript
    yarn add --dev typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin @next/eslint-plugin-next
    yarn build
    touch /tmp/hasBuilt
  elif [ -z "${DASHPUB_CONFIGFILE}" ];
  then
    echo "Not using config file"
  else
    echo "Configuring dashpub"
    run_dashpub init
    cd /home/nodejs/app
    touch /tmp/hasBuilt
  fi
fi
while [ ! -f /tmp/hasBuilt ]
do
  echo "Waiting for app to be built - Please configure and build to continue..."
  sleep 5
done
cd /home/nodejs/app
NODE_OPTIONS="--max-old-space-size=4096" npm run build
if [ "$ENV_MODE" = "dev" ]; then
  echo "Starting in development mode..."
  npm run dev:full
else
  echo "Starting in production mode on port 3001..."
  export PORT=3000
  node server.js
fi
