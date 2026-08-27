# Technical Reference

> Configuration options, specifications, and technical details.

This section contains detailed technical reference material for project-mcp.

## Documents

| Document | Description |
|----------|-------------|
| [**CONFIGURATION.md**](./CONFIGURATION.md) | All configuration options |
| [**INTENT_MAPPING.md**](./INTENT_MAPPING.md) | Intent detection and source mapping |
| [**FILE_FORMATS.md**](./FILE_FORMATS.md) | File format specifications |
| [**ENVIRONMENT.md**](./ENVIRONMENT.md) | Environment variables |

## Quick Reference

### Configuration

```json
{
  "mcpServers": {
    "project": {
      "command": "npx",
      "args": ["-y", "project-mcp"],
      "cwd": "/path/to/project",
      "env": {
        "DOCS_DIR": "/custom/docs/path"
      }
    }
  }
}
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DOCS_DIR` | Custom docs directory | `./docs` |

### Intent Types

| Intent | Searches |
|--------|----------|
| `project` | Everything |
| `docs` | `docs/` only |
| `plan` | `.project/` only |
| `decisions` | DECISIONS.md only |

---

## Related Documentation

- [API Reference](../api/) — Tool specifications
- [Architecture](../architecture/) — System design
- [Guides](../guides/) — Tutorials

---

*See individual documents for detailed specifications.*

