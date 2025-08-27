#!/bin/sh
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

if [ "${DASHPUB_BRANCH}" ];
  then
  echo "Using dashpub from branch $DASHPUB_BRANCH"
  npm i -g https://github.com/livehybrid/dashpub/tarball/$DASHPUB_BRANCH --unsafe-perm
fi

set -e
if [ ! -f /tmp/hasBuilt ];
then
  if [ "${DASHPUB_APP}" ];
  then
    echo "Configuring dashpub with Env variables"
    dashpub init
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
    dashpub init
    cd /home/nodejs/app
    npm install
    npm run build
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
  npm run dev:full
else
  export PORT=3000
  node server.js
fi
