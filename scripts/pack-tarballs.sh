#!/bin/bash

set -euo pipefail

# Builds the release tarballs and refuses to hand over one that is missing its dependencies.
#
# oclif packs each target in ./tmp and installs the production dependencies there, and it picks the
# package manager purely from the lockfiles sitting in the root of this repository. A pnpm-lock.yaml
# makes it run `pnpm install --production` inside ./tmp/brrelease. That directory is underneath this
# repository, so when a pnpm-workspace.yaml is present pnpm resolves this repository as the
# workspace root, installs the root package instead, and leaves ./tmp/brrelease with no node_modules
# at all. oclif then tars up the empty workspace quite happily. That is how v1.15.0 and v1.16.0 were
# published: the tarballs carry dist/ and bin/node but no dependencies, and every command dies with
# "Cannot find package '@oclif/core'".
#
# So the pnpm files are moved aside for the duration of the pack, which puts oclif back on the npm
# path and package-lock.json, and the finished tarballs are checked before they can be uploaded.

# Every target that gets published. Override it to try a single one out: TARGETS=linux-x64 ...
TARGETS="${TARGETS:-linux-x64,linux-arm,linux-arm64,win32-x64,win32-arm64,darwin-x64,darwin-arm64}"
# Any dependency would do, this is the one whose absence produced the broken releases.
CANARY="node_modules/@oclif/core/package.json"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STASH="$(mktemp -d)"

restore_lockfiles() {
  for file in pnpm-lock.yaml pnpm-workspace.yaml; do
    if [ -e "$STASH/$file" ]; then
      echo "Restoring $file"
      mv "$STASH/$file" "$ROOT/$file"
    fi
  done
  rmdir "$STASH" 2>/dev/null || true
}

trap restore_lockfiles EXIT

for file in pnpm-lock.yaml pnpm-workspace.yaml; do
  if [ -e "$ROOT/$file" ]; then
    echo "Moving $file aside so that oclif installs the tarball dependencies with npm"
    mv "$ROOT/$file" "$STASH/$file"
  fi
done

echo "Packing the tarballs for $TARGETS"
npx oclif pack tarballs --targets="$TARGETS" --parallel

echo "Checking that every tarball contains its dependencies"

found=0

for tarball in dist/brrelease-v*.tar.gz; do
  if [ ! -e "$tarball" ]; then
    echo "No tarballs were produced in dist/ - the pack did not get as far as writing one"
    exit 1
  fi

  found=$((found + 1))

  # Not `grep -q`: it closes the pipe on the first match, tar dies of SIGPIPE, and `pipefail` then
  # reports the whole check as a failure on a tarball that is perfectly fine.
  if tar tzf "$tarball" | grep -F "$CANARY" > /dev/null; then
    echo "  $(basename "$tarball") contains its dependencies"
  else
    echo ""
    echo "$(basename "$tarball") has no $CANARY in it."
    echo "The dependencies were not installed into the pack workspace, so this tarball would fail"
    echo "with ERR_MODULE_NOT_FOUND on the machine it is installed on. Nothing has been uploaded."
    exit 1
  fi
done

# The .tar.xz files are packed from the same workspace as the .tar.gz ones, so checking one of each
# pair is enough to know the workspace had its dependencies.
echo "All $found tarballs contain their dependencies"
