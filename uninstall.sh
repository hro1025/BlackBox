#!/usr/bin/env bash
# Removes what install.sh put on this machine.
# The BlackBox folder itself, including the server's stored data, is left alone.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "uninstall: run this as your own user, without sudo. It asks for sudo itself." >&2
  exit 1
fi

sudo systemctl disable --now blackbox-agent blackbox-server blackbox-dashboard 2> /dev/null || true
sudo rm -f \
  /etc/systemd/system/blackbox-agent.service \
  /etc/systemd/system/blackbox-server.service \
  /etc/systemd/system/blackbox-dashboard.service
sudo systemctl daemon-reload

if id -u blackbox > /dev/null 2>&1; then
  sudo userdel blackbox
fi
sudo rm -rf /etc/blackbox /var/lib/blackbox /usr/local/bin/blackbox-agent

echo "BlackBox is removed. Delete this folder too if you no longer want the code and the stored data."
