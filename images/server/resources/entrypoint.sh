#!/bin/sh
set -e

chown -R pocketmine:pocketmine /data /plugins

[ -p /tmp/cmd ] || mkfifo /tmp/cmd

exec su pocketmine -s /bin/sh -c "tail -f /tmp/cmd | start-pocketmine"