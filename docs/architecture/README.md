# Architecture Documentation

> Technical design documentation for project-mcp internals.

This section covers the system architecture, component design, and technical decisions that shape how project-mcp works.

## Documents

| Document | Description |
|----------|-------------|
| [**OVERVIEW.md**](./OVERVIEW.md) | High-level system architecture and design philosophy |
| [**COMPONENTS.md**](./COMPONENTS.md) | Detailed breakdown of system components |
| [**DATA_FLOW.md**](./DATA_FLOW.md) | How data flows through the system |
| [**DECISIONS.md**](./DECISIONS.md) | Architecture Decision Records (ADRs) |

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client                                │
│                    (Cursor, Claude, etc.)                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │ JSON-RPC over stdio
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      project-mcp Server                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Prompts   │  │    Tools    │  │       Resources         │  │
│  │  (10 types) │  │ (40+ tools) │  │   (file:// protocol)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │   Intent Engine   │                        │
│                    │  (Query → Source) │                        │
│                    └─────────┬─────────┘                        │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │  .project/  │      │    Root     │      │    docs/    │     │
│  │ (Operational)│      │  (README)  │      │ (Reference) │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   File System   │
                    └─────────────────┘
```

## Key Design Principles

1. **Intent over Structure** — Natural language maps to intent, not directory names
2. **Separation of Concerns** — Operational (`.project/`) vs Reference (`docs/`)
3. **Modular Tools** — Each tool does one thing well
4. **Backlog-First** — Plan many, activate few (10-30 active tasks max)

## Related Documentation

- [API Reference](../api/) — Tool and prompt specifications
- [Reference Documentation](../reference/) — Configuration options

---

*See individual documents for detailed information.*

