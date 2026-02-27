# AGENTS.md

## Cursor Cloud specific instructions

### Environment

- **Node.js**: Requires `^20.0.0`. Use `nvm` to switch: `nvm use 20`.
- **Package manager**: Yarn 4 (Berry) via corepack. Run `corepack enable` before `yarn install`.
- **Lockfile**: `yarn.lock` — always use `yarn`, never `npm` or `pnpm`.

### Key commands

See `CLAUDE.md` for the full list. Quick reference:

- `yarn dev` — starts examples app at `localhost:5420` (also starts `bemo-worker` and `image-resize-worker`)
- `yarn build` — incremental build of all packages via LazyRepo
- `yarn lint` — lint all workspaces
- `yarn typecheck` — typecheck all packages (runs `refresh-assets` first; must be run from repo root)
- `yarn test run` — run tests once in a workspace (cd to the workspace first)

### Gotchas

- **Never run bare `tsc`** — always use `yarn typecheck` from the repo root.
- **Dev server startup time**: `yarn dev` takes ~20-30 seconds to be ready. The examples app serves on port 5420.
- **`yarn build` must succeed before `yarn dev`**: On a fresh clone, run `yarn build` once before starting the dev server, as the examples app depends on built packages.
- **Husky pre-commit hook** runs `yarn install --immutable`, `build-api`, `build-i18n`, and `lint-staged`. If you want to skip hooks for a quick commit, use `git commit --no-verify`, but ensure CI passes afterward.
