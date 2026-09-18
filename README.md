# Kalvi Outreach CLI

Public, zero-runtime-dependency Node.js 22+ client for the Outreach agent API. This repository is generated from the private platform monorepo; do not hand-edit generated contract files.

## Install

```sh
npm install -g https://github.com/ErwanFx/kalvi-outreach-cli/archive/refs/tags/v1.2.0.tar.gz
outreach --version
outreach --help
```

Use `outreach login`, then `outreach whoami` before the first read. Run `outreach operations` to discover commands supported by the installed contract and `outreach docs` for the verified instance contract. Writes are never retried automatically.

Auto-update checks run after business commands, at most once per window. Set `OUTREACH_AUTO_UPDATE=0` to disable or `OUTREACH_CLI_VERSION=1.2.0` to pin the exact active version. Major upgrades are manual.

See `docs/cli.md` and `skill/hermes-outreach/SKILL.md`.
