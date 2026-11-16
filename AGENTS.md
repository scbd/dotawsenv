# AGENTS.md

This file provides guidance to AI coding agents (including Claude Code, claude.ai/code) when working with code in this repository.

## What this is

`dotawsenv` is a small npm library, similar to `dotenv`, that loads environment variables from AWS Secrets Manager. It reads a `.awsenv` file of `NAME=secretName` lines. For each `NAME` that is not already set in `process.env`, it fetches the secret `secretName` from AWS Secrets Manager and assigns the value (SecretString, or SecretBinary decoded) to `process.env.NAME`.

## Standards

Follow the SCBD [Software Development Standards](https://github.com/scbd/documentation/blob/master/devops/software-development-standards.md).

Fetch and review that document again every 3 months, then update this file to match it and change the dates below. The repo is private, so a plain web fetch returns 404. Use `gh api repos/scbd/documentation/contents/devops/software-development-standards.md -H "Accept: application/vnd.github.raw"`. Last reviewed: 2026-11-10. Next review due: 2027-02-10.

## Commands

| Task                     | Command                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| Build bundles to `dist/` | `npm run build` (`npx rollup -c`)                                        |
| Watch build              | `npm run dev`                                                            |
| Clean reinstall          | `npm run clean-reinstall`                                                |
| Test the shell wrapper   | `sh test/dotawsenv.test.sh` (`TEST_SH=dash dash test/dotawsenv.test.sh`) |
| Lint the shell wrapper   | `shellcheck -s sh bin/dotawsenv.sh test/dotawsenv.test.sh test/stub/aws` |

The shell wrapper has a test suite (stub `aws` CLI in `test/stub/aws`, CI in `.github/workflows/shell.yml` under dash and busybox). The npm package has no test suite and no lint script. `eslint` and `eslint-config-scbd` are dev dependencies, but there is no ESLint config file in the repo. To check a change, build and then run it by hand against a `.awsenv` file with real AWS credentials, for example `node -r ./dist/dotawsenv.cjs some_script.js dotawsenv_config_region=us-east-1`.

## Architecture

- `config.js` is the package entry point and the rollup input. It is a **self-executing IIFE with no exports**: importing or `-r` preloading the bundle runs the whole load immediately. It merges options (env-var options from `lib/options.js`, then CLI args from `lib/cli-options.js`, CLI wins), calls `loadConfig`, then `loadSecretsFromAws`, then `applySecrets`.
- Sync vs async: by default the async `loadSecretsFromAws` is forced to run synchronously through `node-force-sync`, so secrets are in `process.env` before the app's code runs. With the `async` option, it runs in a fire-and-forget async IIFE, so secrets show up later.
- `lib/main.js`:
  - `loadConfig` parses `.awsenv` with `dotenv.parse` (default path `process.cwd()/.awsenv`) and drops keys that are already set in `process.env`. If the file is missing or reading it fails, it returns `{}`.
  - `loadSecretsFromAws` dynamically imports `aws-sdk` (v2) and calls `SecretsManager.getSecretValue` once per key. Errors for each key are collected rather than thrown.
  - `applySecrets` writes only the keys that loaded without errors.
- `lib/options.js` reads `DOTAWSENV_CONFIG_*` env vars. `lib/cli-options.js` parses `dotawsenv_config_<option>=value` argv entries.
- Logging uses `console.debug`.

### Shell wrapper (`bin/dotawsenv.sh`)

A POSIX `sh` version for any language: `dotawsenv.sh <command> [args...]` loads `.awsenv` and `exec`s the command. It is independent of the Node code and uses a different contract: only `DOTAWSENV_CONFIG_PATH` (unset before `exec`), the default AWS credential chain (same credentials as the app), and fail fast with exit 1. Keep it minimal: do not add options for needs nobody has. Internal variables use the `_da_` prefix so they don't change the app's own variables. It fetches every secret into a temp dir before exporting any value. Releases for it use calver tags (`YYYY.x.y`, e.g. `2026.47.0`); `npm-publish.yml` skips tags that start with 4 digits. The npm package keeps semver tags with a 1-2 digit major (e.g. `1.0.3`) until it is phased out.

## Build and publish

- `rollup.config.js` outputs UMD (`dist/dotawsenv.cjs`, `.min.cjs`) and ESM (`dist/dotawsenv.js`, `.min.js`) builds with Babel and terser. `package.json` has `"type": "module"`, and its `exports` map points `require` at the `.cjs` bundle and `default` at the ESM bundle.
- `dist/` is gitignored and built in CI. `.github/workflows/npm-publish.yml` builds and runs `npm publish` when a GitHub release is published (Node 12). To release, bump `version` in `package.json` first.
- `.npmignore` leaves `lib/`, `config.js` and `rollup.config.js` out of the package, so only `dist/` ships.

## Known discrepancies

The README does not match the code in a few places. Check these before changing behavior or docs:

- The README shows `require('dotawsenv').config()` and a `config()` return value of `{ parsed, error }`, but the bundle exports nothing, so loading it runs the load as a side effect.
- The README shows `-r dotawsenv/config`, but the `exports` map defines no `./config` subpath.
- The README says the default path is `.env`, but the code uses `.awsenv`.
- In `lib/options.js`, the `DOTAWSENV_CONFIG_ENCODING` and `DOTAWSENV_CONFIG_PATH` branches assign to an undefined `options` variable (instead of `lOptions`). They throw a `ReferenceError` when those env vars are set.
- In rollup's `external` list, `aws` and `dotenv` are listed, but `aws-sdk` is not. `aws-sdk` stays external only because it is not resolved; there is no node-resolve plugin in the config.
