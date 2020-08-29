#!/bin/bash
# https://github.com/mikaelbr/node-notifier/issues/226
export XDG_RUNTIME_DIR=/run/user/$(id -u) # fixes notifications not displaying from inside cron 



DIR="$(cd "$(dirname "$0")" && pwd)"
node $DIR/src/index.js
