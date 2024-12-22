brrelease
=================

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/brrelease.svg)](https://npmjs.org/package/brrelease)
[![Downloads/week](https://img.shields.io/npm/dw/brrelease.svg)](https://npmjs.org/package/brrelease)

This is a CLI that allows you to create releases off any branch and either merge
back into that branch or into a different branch. It allows you to follow the
`git-flow` methodology if you want to but also allows you the freedom to create
release versions on different branches without merging into `main`.

This project extends the [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version)
project. So it uses their versioning and bumping logic, but builds a workflow
on top of it.

The easiest way to use this would be via `npx` by running the following command:
```shell
npx brrelease release --help
```

Check out the documentation below to get an idea on how to use it.



<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g brrelease
$ brrelease COMMAND
running command...
$ brrelease (--version)
brrelease/1.6.0 linux-x64 node-v23.5.0
$ brrelease --help [COMMAND]
USAGE
  $ brrelease COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`brrelease help [COMMAND]`](#brrelease-help-command)
* [`brrelease release`](#brrelease-release)

## `brrelease help [COMMAND]`

Display help for brrelease.

```
USAGE
  $ brrelease help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for brrelease.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.20/src/commands/help.ts)_

## `brrelease release`

Run a release on the branch that you're on

```
USAGE
  $ brrelease release [-P <value>] [-G <value>] [-R <value>] [-c <value>] [-C] [--changelog-commit-message
    <value>] [-r <value>...] [-m <value>] [-s -b <value>] [--bump-files-commit-message <value>] [-p <value>...] [-B
    <value>...] [-u <value>...] [--release-as major|minor|patch] [--first-release] [--prerelease <value>] [-s]

FLAGS
  -B, --bump-file=<value>...                              The files where the version should be bumped with out the
                                                          previous version being considered (see
                                                          https://github.com/absolute-version/commit-and-tag-version)
  -C, --skip-changelog                                    Skip writing to a changelog file
  -G, --git-binary-path=<value>                           [default: git] The path to the git binary (default is "git"
                                                          since it assumes it is globally accessible)
  -P, --tag-prefix=<value>                                [default: v] The prefix that should be before the number on
                                                          the tag made in git (default is "v")
  -R, --release-branch-prefix=<value>                     [default: release/] The prefix that is used to create release
                                                          branches (default is "release/")
  -b, --merge-into-branch=<value>                         If you would like the release to merge into a different
                                                          branch, specify it here. The default is the current branch
                                                          you're on
  -c, --changelog-file-path=<value>                       [default: CHANGELOG.md] The path to the file that the
                                                          changelog should be written to
  -m, --run-script-during-release-commit-message=<value>  [default: chore: generate the release file changes] The commit
                                                          message that should be used to commit the changed files that
                                                          occur after running the custom release job
  -p, --package-file=<value>...                           [default: package.json] The package files that should be used
                                                          to determine the current version of the project (see
                                                          https://github.com/absolute-version/commit-and-tag-version)
  -r, --run-script-during-release=<value>...              One or many scripts that should be run during the release,
                                                          it's recommended that you make these npm scripts and they
                                                          don't contain the '"' character
  -s, --[no-]sign                                         Sign the git commits
  -s, --skip-merge-back-into-current-branch               If you are merging into a different branch, you can elect to
                                                          skip merging it back into the current branch you're on
  -u, --updater=<value>...                                The updater files/scripts that should run during execution
                                                          (see
                                                          https://github.com/absolute-version/commit-and-tag-version)
      --bump-files-commit-message=<value>                 [default: chore: bump the version in project files] The commit
                                                          message to use when bumping the version in files
      --changelog-commit-message=<value>                  [default: chore: generate the changelog] The commit message
                                                          that should be used to commit the changelog file
      --first-release                                     If this is the first release being created (see
                                                          https://github.com/absolute-version/commit-and-tag-version)
      --prerelease=<value>                                The prerelease prefix that should be used if necessary (see
                                                          https://github.com/absolute-version/commit-and-tag-version)
      --release-as=<option>                               Specify the type of release (see
                                                          https://github.com/absolute-version/commit-and-tag-version)
                                                          <options: major|minor|patch>

DESCRIPTION
  Run a release on the branch that you're on

EXAMPLES
  $ brrelease release

  $ brrelease release --release-as=major

  $ brrelease release --merge-into-branch=main

  $ brrelease release --merge-into-branch=main --run-script-during-release="npm run update-readme"

  $ brrelease release --merge-into-branch=main --run-script-during-release="npm run update-readme" --run-script-during-release="echo $(date) > .latest-build-time"

  $ brrelease release --prerelease=beta --skip-changelog

  $ brrelease release --package-file=package.json --bump-file=package-lock.json --bump-file=.versionrc
```

_See code: [src/commands/release.ts](https://github.com/kerren/brrelease/blob/v1.6.0/src/commands/release.ts)_
<!-- commandsstop -->
