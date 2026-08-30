# brrelease

An oclif CLI that runs a release on any branch: it creates a release branch, generates the
changelog, bumps the version files, runs user scripts, merges the result back and tags it.

`src/commands/release.ts` is the whole command. The steps it runs are thin wrappers in
`src/shared/git/*`, each of which shells out to the real `git` binary through
`src/shared/spawn-command.ts`.

## Changing a function's parameters

**When you change a function's signature, update its tests in the same change.** The helpers in
`src/shared/` are called directly from `test/`, so adding, removing or reordering a parameter
breaks those call sites, and `npm run typecheck` fails in CI on the test sources rather than on
`src/`. A change that builds is not a change that passes.

The order that catches it:

1. `grep -rn "<functionName>" src test` for every caller, including the test files.
2. Update the callers and the tests together.
3. Add a test for whatever the new parameter actually does - both sides of a boolean, not just the
   default. A parameter with no test is a parameter nobody will notice breaking.
4. `npm run typecheck` - this is what compiles `test/`, and it is the check that fails on an
   argument-count mismatch.
5. `npm run test:ci`.

If the parameter changes a git invocation, assert on the resulting git state (the tag object, the
commit, the branch), not on the argument list. That is the convention the existing tests follow.

## Commands

`Taskfile.yaml` is the front door - `task` on its own lists what is there. Every task is a thin
wrapper over the npm script in the same row, so either column works.

| Task | npm script | What it does |
| --- | --- | --- |
| `task init` | `npm ci` | Installs the dependencies from `package-lock.json` |
| `task typecheck` | `npm run typecheck` | `tsc` over `test/tsconfig.json` - type checks the source *and* the tests |
| `task test` | `npm run test:ci` | Applies the patches, then runs mocha. **Use this**, not `npm test` |
| `task compile` | `npm run build` | Compiles to `dist/` and copies `patches/` and `scripts/` in |
| `task build` | `npm run generate:main` | Compiles, writes the manifest, then builds the release tarball for every platform into `dist/` |

`task build` takes a while - it downloads a node binary per platform. Pass `TARGETS` to narrow it
while you are working on the packaging itself: `task build TARGETS=linux-x64`. It also regenerates
`README.md` through `oclif readme`, the same way a release does.

`npm test` triggers `posttest`, which runs `npm run lint`, which currently fails for everyone: the
`.eslintrc.js` config uses `module.exports` while `package.json` sets `"type": "module"`, so ESLint
cannot load it at all. It is a pre-existing problem unrelated to whatever you are working on. CI
uses `test:ci` for exactly this reason - do the same rather than "fixing" the failure.

CI (`.github/workflows/test.yml`) runs `npm ci`, `npm run typecheck` and `npm run test:ci` on Node
18, 20 and 22.

## Package manager

**Use npm. Do not use pnpm, and do not use yarn.** This is not a preference about tooling, it is a
packaging constraint:

`oclif pack tarballs` builds each platform in `./tmp` and installs the production dependencies
there, and it chooses the package manager purely by looking for a lockfile in the root of this
repository - `yarn.lock`, then `pnpm-lock.yaml`, then `package-lock.json`. With a `pnpm-lock.yaml`
present it runs `pnpm install --production` inside `./tmp/brrelease`. That directory is underneath
this repository, so if a `pnpm-workspace.yaml` is there too, pnpm resolves this repository as its
workspace root, installs the root package instead, and leaves `./tmp/brrelease` with no
`node_modules` at all. oclif tars up the empty workspace without complaining, and the CLI dies on
the user's machine with `ERR_MODULE_NOT_FOUND: Cannot find package '@oclif/core'`. That is exactly
how v1.15.0 and v1.16.0 were published.

So:

- `package-lock.json` is the tracked lockfile. `pnpm-lock.yaml`, `pnpm-workspace.yaml` and
  `yarn.lock` are gitignored and must not be committed back.
- `pnpm install` recreates both pnpm files, and they only have to exist *on disk* to break the
  pack, not be committed. `scripts/pack-tarballs.sh` moves them aside while it packs and then
  refuses to finish if a finished tarball has no dependencies inside it, so a broken release cannot
  get out the door a second time. Build through `task build` (or `npm run generate:main`) rather
  than calling `oclif pack tarballs` yourself, which has no such guard.
- The `scripts` entries in `package.json` all call `npm run`. If you find one saying `pnpm`, it is
  a mistake.

## Tests

- Fixtures come from `test/helpers/temp-git-repo.ts` - a throwaway repository in a temp directory
  with its own identity and signing turned off.
- `test/helpers/git-environment.ts` points `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_SYSTEM` at empty files,
  so the suite never picks up the config of the machine it runs on. Anything that depends on git
  config has to set it on the fixture.
- Signing defaults to on in the command, so `test/helpers/run-release.ts` passes `--no-sign` to
  every release run except one specifically exercising signing. The runner has no key: to test a
  signing path, point `gpg.program` at a stub that prints a signature (see `useStubSigningProgram`
  in `test/shared/git/git-helpers.test.ts`).

## Conventions

- Work off `develop`, which is the base branch. Fetch it before starting - a stale local `develop`
  produces a branch that builds locally and fails in CI against the real base.
- The flag list in `README.md` is generated by `oclif readme`. Regenerating it also rewrites
  unrelated lines (plugin versions, the node version in the usage banner), so when only a flag
  description changed, edit that line by hand and keep the diff to it.
- Lockfile: `package-lock.json` is the tracked one, and the pnpm and yarn lockfiles are gitignored.
  Read "Package manager" above before you reach for a different one - the choice decides whether
  the released binaries contain their dependencies.
