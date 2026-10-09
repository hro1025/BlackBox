#!/usr/bin/env bash
# Installs BlackBox on this machine: agent, ingest server and dashboard,
# each as a systemd service that only listens on this machine.
#
# Usage:  ./install.sh [agent-id]
# The agent id defaults to this machine's host name.
# Safe to run again: it rebuilds, keeps the existing token and restarts everything.
set -euo pipefail

SERVER_PORT=7070
DASHBOARD_PORT="${BLACKBOX_DASHBOARD_PORT:-3001}"

fail() {
  echo "install: $1" >&2
  exit 1
}

[ "$(id -u)" -ne 0 ] || fail "run this as your own user, without sudo. It asks for sudo itself."
[ -r /proc/meminfo ] || fail "BlackBox reads /proc, so it needs Linux."
command -v systemctl > /dev/null || fail "systemd (systemctl) was not found."
command -v sudo > /dev/null || fail "sudo was not found."

BUN="$(command -v bun || true)"
[ -n "$BUN" ] || fail "bun was not found. Install it from https://bun.sh first."

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO"
[ -f packages/ingest/index.ts ] || fail "install.sh must stay in the BlackBox folder."

case "$REPO$BUN" in
  *" "*) fail "the path to the BlackBox folder and to bun must not contain spaces." ;;
esac

RUN_AS="$(id -un)"
AGENT_ID="${1:-$(uname -n | tr '[:upper:]' '[:lower:]')}"
[[ "$AGENT_ID" =~ ^[A-Za-z0-9._-]+$ ]] || fail "agent id '$AGENT_ID' may only contain letters, digits, dot, dash and underscore."

sudo -v

echo "Stopping an earlier install, if there is one..."
sudo systemctl stop blackbox-agent blackbox-server blackbox-dashboard 2> /dev/null || true

for port in "$SERVER_PORT" "$DASHBOARD_PORT"; do
  if ss -tln | grep -q ":$port "; then
    fail "port $port is in use. Stop whatever holds it (a server or dashboard started by hand?) and run this again."
  fi
done

echo "Installing dependencies..."
"$BUN" install

# The agent proves who it is with a token. The server keeps the same token in agents.json.
if sudo test -s /etc/blackbox/agent.token; then
  TOKEN="$(sudo cat /etc/blackbox/agent.token)"
else
  TOKEN="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
fi

AGENTS_FILE="$REPO/packages/ingest/agents.json"
AGENTS_FILE="$AGENTS_FILE" AGENT_ID="$AGENT_ID" AGENT_TOKEN="$TOKEN" "$BUN" -e '
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const file = process.env.AGENTS_FILE;
const agents = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
agents[process.env.AGENT_ID] = process.env.AGENT_TOKEN;
writeFileSync(file, JSON.stringify(agents, null, 2) + "\n");
'
chmod 600 "$AGENTS_FILE"

echo "Building the agent..."
"$BUN" build packages/agent/index.ts --compile --outfile dist/blackbox-agent

echo "Building the dashboard..."
(cd packages/dashboard && BLACKBOX_INGEST_URL="http://127.0.0.1:$SERVER_PORT" "$BUN" run build)

echo "Installing the agent..."
if ! id -u blackbox > /dev/null 2>&1; then
  sudo useradd --system --user-group --no-create-home \
    --shell "$(command -v nologin || echo /usr/sbin/nologin)" blackbox
fi
sudo install -d -o blackbox -g blackbox -m 750 /etc/blackbox /var/lib/blackbox
sudo install -m 755 dist/blackbox-agent /usr/local/bin/blackbox-agent

sudo tee /etc/blackbox/agent.json > /dev/null <<EOF
{
  "serverUrl": "ws://127.0.0.1:$SERVER_PORT/agent",
  "agentId": "$AGENT_ID",
  "tokenPath": "agent.token",
  "sampleIntervalMs": 1000
}
EOF
printf '%s' "$TOKEN" | sudo tee /etc/blackbox/agent.token > /dev/null
sudo chown blackbox:blackbox /etc/blackbox/agent.json /etc/blackbox/agent.token
sudo chmod 640 /etc/blackbox/agent.json
sudo chmod 600 /etc/blackbox/agent.token

echo "Writing the service files..."
sudo tee /etc/systemd/system/blackbox-server.service > /dev/null <<EOF
[Unit]
Description=BlackBox ingest server
After=network.target

[Service]
User=$RUN_AS
WorkingDirectory=$REPO
ExecStart=$BUN run packages/ingest/index.ts
Restart=on-failure
RestartSec=5
StandardOutput=null

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/blackbox-agent.service > /dev/null <<EOF
[Unit]
Description=BlackBox agent
After=network-online.target blackbox-server.service
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
EOF

sudo tee /etc/systemd/system/blackbox-dashboard.service > /dev/null <<EOF
[Unit]
Description=BlackBox dashboard
After=network.target blackbox-server.service

[Service]
User=$RUN_AS
WorkingDirectory=$REPO/packages/dashboard
Environment="PATH=$PATH"
Environment=BLACKBOX_INGEST_URL=http://127.0.0.1:$SERVER_PORT
ExecStart=$BUN x next start -H 127.0.0.1 -p $DASHBOARD_PORT
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now blackbox-server blackbox-agent blackbox-dashboard

echo "Waiting for the services to start..."
sleep 5

echo
echo "Service states (server, agent, dashboard):"
systemctl is-active blackbox-server blackbox-agent blackbox-dashboard || true

echo
echo "Agents the server knows:"
curl -fsS "http://127.0.0.1:$SERVER_PORT/api/agents" || echo "no answer. Look at: journalctl -u blackbox-server -n 20 --no-pager"

echo
echo
echo "BlackBox is installed as agent '$AGENT_ID'."
echo "Open http://localhost:$DASHBOARD_PORT"
