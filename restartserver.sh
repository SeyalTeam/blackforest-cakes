#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/env/r2_env.sh" ]; then
    . "$SCRIPT_DIR/env/r2_env.sh"
fi

# function to disply all completed process
print_process() {
    echo "* * * *  * *  * *  * *  * *  * *  * *  * * $1 * * * *  * *  * *  * *  * *  * *  * *  * * "
}

forever list
print_process "LISTED CURRENTLY RUNNING SERVER"

forever stopall
print_process "STOPPED ALL RUNNING SERVER"

forever list
print_process "LISTED CURRENTLY RUNNING SERVER"

ENV=production forever start server.js
print_process "STARTED SERVER"

ENV=production forever start server-admin.js
print_process "STARTED SERVER SECURE"

ENV=production forever start server-socket.js
print_process "STARTED SERVER SOCKET"

ENV=production forever start server-cron.js
print_process "STARTED SERVER CRON"


timeout 10s bash <<EOT
function listRunningScript {
  forever list
  echo "* * * *  * *  * *  * *  * *  * *  * *  * * LISTED CURRENTLY RUNNING SERVER AFTER RESTART SERVER * * * *  * *  * *  * *  * *  * *  * *  * * ";
}

listRunningScript
sleep 20
EOT
