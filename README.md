# BlackBox

  <!--toc:end-->

A system flight recorder written in TypeScript and Bun.

An agent on every machine reads system state from `/proc` and `/sys`, buffers it locally on disk, and streams it to a central ingest server over WebSocket. The server stores the data, evaluates rules, and serves a dashboard that shows history, live data, and the events leading up to any incident.

## Progress

- [x] **1. Memory reader** — read `/proc/meminfo` on an interval
- [x] **2. Parser tests** — modules, fixtures, `bun test`
- [x] **3. CPU usage** — counters and deltas from `/proc/stat`
- [x] **4. More collectors** — load, network, temperature
- [x] **5. Local recording** — ring buffer on disk
- [x] **6. Lifecycle events** — crash, stop and reboot detection
- [x] **7. Shared protocol** — zod schemas, message union
- [ ] **8. Ingest server** — WebSocket, hello, authentication
- [ ] **9. Agent connection** — reconnect with backoff and jitter
- [ ] **10. Resume** — sequence numbers, replay, acknowledgements
- [ ] **11. Server storage** — SQLite, Drizzle, retention
- [ ] **12. Rules** — thresholds, silence, clock skew
- [ ] **13. Dashboard** — Next.js, history, live view
- [ ] **14. Deployment** — single binary, systemd, all machines

The step-by-step plan for every milestone is in the [workbook](docs/BlackBox-Workbook.pdf).

## Structure

```
packages/
  agent/     @blackbox/agent   collectors, local buffer, streaming
  ingest/    @blackbox/ingest  WebSocket server, storage, rules
  shared/    @blackbox/shared  types and schemas used by all packages
docs/
  BlackBox-Workbook.pdf
```

## Commands

All commands run from the repository root.

| Task                 | Command                           |
| -------------------- | --------------------------------- |
| Install dependencies | `bun install`                     |
| Run the agent        | `bun run packages/agent/index.ts` |
| Run tests            | `bun test`                        |
| Type check           | `bunx tsc --noEmit`               |
| Lint                 | `bun run lint`                    |

## Stack

Bun · TypeScript (strict) · zod · SQLite with Drizzle · Next.js with shadcn/ui · Oxlint · Prettier
