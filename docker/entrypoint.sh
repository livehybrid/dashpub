#!/bin/sh
set -e

if [ -z "${DASHPUB_CONFIGFILE}" ];
then
  echo "Not using config file"
else
  echo "Configuring dashpub"
  dashpub init
  cd /app
  yarn build
  touch /tmp/hasBuilt
fi

while [ ! -f /tmp/hasBuilt ]
do
  echo "Waiting for app to be built - Please configure and build to continue..."
  sleep 5
done
cd /app && yarn start
