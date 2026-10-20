# Session rules

| # | Session | Spec file | Owns these directories | Depends on |
| --- | --- | --- | --- | --- |
| 1 | **Stabilise** | `MASTER-BACKLOG.md` | existing `js/`, `css/`, `index.html` | — |
| 2 | **Architecture** | `SESSION-ARCHITECTURE.md` | `docs/adr/` only (no code) | 1 |
| 3 | **Backend** | `SESSION-BACKEND.md` | `server/`, `db/`, `api/` | 2 |
| 4 | **Knowledge** | `KNOWLEDGE-BASE-INGESTION.md` | `js/knowledge/`, `docs/`, `tools/` | — |
| 5 | **Agent** | `SESSION-AGENT.md` | `js/agent/` | 3, 4 |
| 6 | **Design** | `SESSION-DESIGN.md` | `css/`, `js/components/` | 1 |
