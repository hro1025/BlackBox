# BlackBox

  <!--toc:end-->

A system flight recorder written in TypeScript and Bun.

An agent reads system state from `/proc` and `/sys`, buffers it locally on disk, and streams it to an ingest server over WebSocket. The server stores the data, evaluates rules, and serves a dashboard that shows history, live data, and the events leading up to any incident.

## Install

BlackBox installs on one Linux machine and watches that machine. You need systemd, `sudo` and [Bun](https://bun.sh).

```
git clone https://github.com/hro1025/BlackBox.git
cd BlackBox
./install.sh
```

Then open <http://localhost:3001>.

The installer builds the agent into a single binary and sets up three services that start at boot:

- `blackbox-agent` collects the data, as its own user `blackbox`
- `blackbox-server` stores it and evaluates the rules
- `blackbox-dashboard` shows it

The server and the dashboard only listen on `127.0.0.1`, so nothing is reachable from other machines.

Run `./install.sh` again after pulling new code. It rebuilds and restarts everything and keeps the stored data. `./install.sh my-name` sets the agent's name, which otherwise is the host name. `BLACKBOX_DASHBOARD_PORT=4000 ./install.sh` moves the dashboard to another port.

To remove it again:

```
./uninstall.sh
```

If something looks wrong:

```
systemctl status blackbox-server blackbox-agent blackbox-dashboard
journalctl -u blackbox-server -n 20 --no-pager
```

## Progress

- [x] **1. Memory reader** — read `/proc/meminfo` on an interval
- [x] **2. Parser tests** — modules, fixtures, `bun test`
- [x] **3. CPU usage** — counters and deltas from `/proc/stat`
- [x] **4. More collectors** — load, network, temperature
- [x] **5. Local recording** — ring buffer on disk
- [x] **6. Lifecycle events** — crash, stop and reboot detection
- [x] **7. Shared protocol** — zod schemas, message union
- [x] **8. Ingest server** — WebSocket, hello, authentication
- [x] **9. Agent connection** — reconnect with backoff and jitter
- [x] **10. Resume** — sequence numbers, replay, acknowledgements
- [x] **11. Server storage** — SQLite, Drizzle, retention
- [x] **12. Rules** — thresholds, silence, clock skew
- [x] **13. Dashboard** — Next.js, history, live view
- [x] **14. Deployment** — single binary, systemd, one-command install on one machine

The step-by-step plan for every milestone is in the [workbook](docs/BlackBox-Workbook.pdf).

## Structure

```
packages/
  agent/      @blackbox/agent   collectors, local buffer, streaming
  ingest/     @blackbox/ingest  WebSocket server, storage, rules, HTTP API
  dashboard/  dashboard         Next.js dashboard
  shared/     @blackbox/shared  types and schemas used by all packages
docs/
  BlackBox-Workbook.pdf
install.sh
uninstall.sh
```

## Commands

For working on the code. Stop the installed services first, because they hold the same ports:

```
sudo systemctl stop blackbox-agent blackbox-server blackbox-dashboard
```

```
bun install                            install dependencies
bun test                               run all tests
bunx tsc --noEmit                      type check agent, ingest and shared
bun run lint                           lint
bun run packages/ingest/index.ts       start the server
bun run packages/agent/index.ts        start the agent
cd packages/dashboard && bun run dev   start the dashboard in dev mode
```

A hand-started agent reads `packages/agent/agent.config.json` and the token in `packages/agent/agent.token`. The same agent id and token must be in `packages/ingest/agents.json`. Neither the token file nor `agents.json` should ever be committed.
