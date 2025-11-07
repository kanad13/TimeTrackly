# Documentation Index

TimeTrackly documentation is organized by purpose and audience. Start with what matches your role:

## Getting Started

- **[../readme.md](../readme.md)** – **Start here.** Overview, features, quick start (30 seconds), and tech stack. For users and new developers.
- **[setup.md](setup.md)** – Detailed installation, running modes (dev/production), health checks, and troubleshooting.

## Architecture & Design

- **[architecture.md](architecture.md)** – Complete technical architecture for developers. Covers module structure, data flow, design philosophy, and implementation patterns.
- **[API.md](API.md)** – Frontend API reference. Function signatures, state structures, and module exports for all 7 ES6 modules.

## Decision Records

Why certain choices were made over alternatives (read when you want to understand the "why" behind architectural decisions):

- **[ADR-001-vanilla-javascript.md](ADR-001-vanilla-javascript.md)** – Why vanilla JavaScript over React/Vue/frameworks
- **[ADR-002-json-file-storage.md](ADR-002-json-file-storage.md)** – Why JSON files over databases (SQLite, PostgreSQL)
- **[ADR-003-singleton-state-pattern.md](ADR-003-singleton-state-pattern.md)** – Why ES6 singleton pattern over Redux/MobX

## Testing

See **[../tests/README.md](../tests/README.md)** for comprehensive testing guide, test patterns, and CI/CD information.

---

### At a Glance

| Role | Read First | Then Read |
|------|------------|-----------|
| **User** | [../readme.md](../readme.md) | [setup.md](setup.md) |
| **Developer** | [architecture.md](architecture.md) | [API.md](API.md) |
| **Decision Reviewer** | Any [ADR](.) | [architecture.md](architecture.md) for context |
| **Contributor** | [../CONTRIBUTING.md](../CONTRIBUTING.md) | [architecture.md](architecture.md) + [../tests/README.md](../tests/README.md) |
