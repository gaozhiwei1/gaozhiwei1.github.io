# Repository Guidelines

## Project Structure & Module Organization

This repository currently has no application source files. When adding code, keep the layout predictable and document any deviation in the README.

- `src/` should contain production code, grouped by feature or module.
- `tests/` should contain automated tests that mirror the `src/` structure.
- `assets/` should hold static files such as sample data, images, or fixtures.
- `docs/` should hold design notes, user-facing documentation, and longer technical references.

Keep generated output, dependency folders, and local environment files out of version control.

## Build, Test, and Development Commands

No build system is defined yet. Add commands through the project’s chosen toolchain and keep them runnable from the repository root. Prefer standard names:

- `npm test`, `pytest`, `go test ./...`, or equivalent: run the full test suite.
- `npm run build`, `make build`, or equivalent: produce distributable artifacts.
- `npm run dev`, `make dev`, or equivalent: start a local development server or watcher.

When adding tooling, document required versions and setup steps in `README.md`.

## Coding Style & Naming Conventions

Follow the formatter and linter for the language introduced. Commit their configuration with the code, for example `.prettierrc`, `ruff.toml`, `eslint.config.js`, or `gofmt` defaults.

Use clear, descriptive names. Prefer `snake_case` for Python files and functions, `camelCase` for JavaScript/TypeScript variables and functions, and `PascalCase` for classes, React components, and exported types. Keep modules focused and avoid mixing unrelated concerns in one file.

## Testing Guidelines

Add tests with any new behavior. Name test files so they are easy for tools and humans to discover, such as `test_*.py`, `*.test.ts`, or `*_test.go`. Keep fixtures small and place reusable fixtures under `tests/fixtures/`.

Tests should cover expected behavior, edge cases, and failure paths. If a change cannot be tested automatically, describe the manual verification steps in the pull request.

## Commit & Pull Request Guidelines

This workspace does not expose usable git history, so no local commit convention can be inferred. Use concise, imperative commit messages such as `Add import validation` or `Fix missing config fallback`.

Pull requests should include a short summary, test results, linked issues when applicable, and screenshots or recordings for UI changes. Call out breaking changes, migrations, new configuration, and known limitations.

