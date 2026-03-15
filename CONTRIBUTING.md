# Contributing to navcube

Thanks for your interest. Here's how the project is set up and how to contribute without breaking things.

---

## Branch structure

```
main   — production. never commit directly here.
dev    — integration branch. all work lands here first.
```

Feature branches are cut from `dev` and merged back into `dev` via PR. When `dev` is stable and ready for a release, it gets merged into `main` via PR.

```
your-feature  →  dev  →  main
```

---

## Day-to-day workflow

```bash
# 1. Start from dev
git checkout dev
git pull origin dev

# 2. Cut a feature branch
git checkout -b feat/my-thing

# 3. Do your work, commit using conventional commits (see below)
git commit -m "feat: add Y-up coordinate mode"

# 4. Push and open a PR targeting dev
git push origin feat/my-thing
```

Open the PR against `dev`, not `main`. CI will run tests on all platforms automatically.

---

## Commit message format

This project uses [Conventional Commits](https://www.conventionalcommits.org/). The format is what drives automatic version bumps and changelog generation — so please follow it.

```
<type>: <short description>

[optional body]

[optional footer]
```

| Type | When to use | Version bump |
|---|---|---|
| `feat` | New feature or capability | Minor `0.x.0` |
| `fix` | Bug fix | Patch `0.0.x` |
| `perf` | Performance improvement | Patch |
| `docs` | Documentation only | None |
| `refactor` | Code change, no behaviour change | None |
| `test` | Adding or fixing tests | None |
| `ci` | CI/CD changes | None |
| `chore` | Maintenance, dependency updates | None |

For a **breaking change**, add `!` after the type or include `BREAKING CHANGE:` in the footer:

```
feat!: change push_camera() argument order

BREAKING CHANGE: dx/dy/dz now come before ux/uy/uz
```

Breaking changes trigger a major version bump.

---

## Releasing

Releases are driven by **pushing a version tag** to `main`. There is no Release PR or release-please automation.

### How it works

1. Merge `dev` → `main` via PR as usual
2. Create and push a tag:

   ```bash
   git tag v0.3.0
   git push origin v0.3.0
   ```

3. The `release.yml` workflow triggers automatically and:
   - Creates a **GitHub Release** with auto-generated release notes (changelog from commits since the last tag)
   - Tags containing a `-` (e.g. `v1.0.0-beta.1`) are marked as pre-releases

### PyPI publishing

PyPI publishing **only happens on major releases** — i.e. tags matching `vX.0.0` where `X >= 1` (e.g. `v1.0.0`, `v2.0.0`).

Patch and minor releases (e.g. `v0.3.0`, `v1.2.0`) create a GitHub Release with changelog but do **not** upload to PyPI.

### Tag naming

| Tag example | GitHub Release | PyPI publish |
|---|---|---|
| `v0.3.0` | Yes | No |
| `v1.0.0` | Yes | Yes |
| `v1.2.0` | Yes | No |
| `v2.0.0` | Yes | Yes |
| `v1.0.0-beta.1` | Yes (pre-release) | No |

---

## Merging dev into main

When `dev` has been tested and is ready to ship:

1. Open a PR from `dev` → `main`
2. Make sure CI passes
3. Get a review if possible (even self-review for solo projects)
4. Merge
5. Push a version tag to trigger the release (see above)

---

## Running tests locally

```bash
pip install -e ".[occ]" pytest pytest-qt

# headless on Linux
QT_QPA_PLATFORM=offscreen pytest tests/ -v

# or with a real display
pytest tests/ -v
```

---

## Project structure

```
navcube/
├── __init__.py          exports NavCubeOverlay, NavCubeStyle
├── widget.py            the actual widget — no OCC/VTK imports
└── connectors/
    ├── occ.py           OCCNavCubeSync — bridges OCC V3d_View
    └── vtk.py           VTKNavCubeSync — bridges VTK renderer
```

The core rule: `widget.py` must never import OCC, VTK, or any renderer. Connectors are the only place renderer imports live.
