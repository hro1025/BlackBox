#!/usr/bin/env bash
# Installs the BlackBox agent on this machine as a systemd service.
# Run as root, with the blackbox-agent binary in the same folder as this script:
#   bash install-agent.sh <agent-id> <server-url> <token>
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: bash install-agent.sh <agent-id> <server-url> <token>"
  exit 1
fi

AGENT_ID="$1"
SERVER_URL="$2"
TOKEN="$3"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root."
  exit 1
fi

if [ ! -f "$HERE/blackbox-agent" ]; then
  echo "The blackbox-agent binary was not found next to this script ($HERE)."
  exit 1
fi

if ! id blackbox > /dev/null 2>&1; then
  useradd --system --no-create-home --shell "$(command -v nologin)" blackbox
  echo "created the blackbox user"
fi

mkdir -p /etc/blackbox /var/lib/blackbox
chown blackbox:blackbox /var/lib/blackbox
chmod 750 /var/lib/blackbox

( umask 077 && printf '%s' "$TOKEN" > /etc/blackbox/agent.token )
chown blackbox:blackbox /etc/blackbox/agent.token
chmod 600 /etc/blackbox/agent.token

cat > /etc/blackbox/agent.json <<JSON
{
  "serverUrl": "$SERVER_URL",
  "agentId": "$AGENT_ID",
  "tokenPath": "agent.token",
  "sampleIntervalMs": 1000
}
JSON
chmod 644 /etc/blackbox/agent.json
echo "wrote /etc/blackbox/agent.json and agent.token"

install -m 755 "$HERE/blackbox-agent" /usr/local/bin/blackbox-agent
echo "installed /usr/local/bin/blackbox-agent"

cat > /etc/systemd/system/blackbox-agent.service <<'UNIT'
[Unit]
Description=BlackBox agent
After=network-online.target
Wants=network-online.target

[Service]
User=blackbox
Group=blackbox
Environment=BLACKBOX_CONFIG=/etc/blackbox/agent.json
Environment=BLACKBOX_DB=/var/lib/blackbox/blackbox.db
Environment=BLACKBOX_MARKER=/var/lib/blackbox/blackbox.marker
Environment=BLACKBOX_LAST_BOOT_ID=/var/lib/blackbox/blackbox.bootid
ExecStart=/usr/local/bin/blackbox-agent
StandardOutput=null
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now blackbox-agent
echo "started the blackbox-agent service"
echo
systemctl --no-pager --lines=0 status blackbox-agent || true
