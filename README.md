![bRRelease](./readme/brrelease.svg)

Short for "Branch Release" - this is a CLI that allows you to create releases 
off any branch and either merge back into that branch or into a different 
branch. It allows you to follow the `git-flow` methodology if you want to but 
also allows you the freedom to create release versions on different branches 
without merging into `main`.

This project extends the [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version)
project. So it uses their versioning and bumping logic, but builds a workflow
on top of it.

To install this package, you can pull the `tar` files from the 
[releases](https://github.com/kerren/brrelease/releases) page, or you can use
Homebrew (which is much easier):
```shell
brew install kerren/brrelease-tap/brrelease
```

Here's a video on how to use the CLI for different workflows,
[![brrelease youtube video](https://img.youtube.com/vi/UoJ43CeyeoI/0.jpg)](https://www.youtube.com/watch?v=UoJ43CeyeoI)

You can do single branch workflows or multibranch workflows. For a single branch
your git commit graph would look something like this:
![Single Branch Workflow](./readme/single_branch.svg)

For a multi-branch workflow, your git graph would look something like this:
![Multi Branch Workflow](./readme/multi_branch.svg)

Check out the [release command](#brrelease-release) below for more information 
on how to use it!


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
* [FAQ](#faq)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g brrelease
$ brrelease COMMAND
running command...
$ brrelease (--version)
brrelease/1.14.3 linux-x64 node-v23.5.0
$ brrelease --help [COMMAND]
USAGE
  $ brrelease COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`brrelease autocomplete [SHELL]`](#brrelease-autocomplete-shell)
* [`brrelease help [COMMAND]`](#brrelease-help-command)
* [`brrelease release`](#brrelease-release)

## `brrelease autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ brrelease autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ brrelease autocomplete

  $ brrelease autocomplete bash

  $ brrelease autocomplete zsh

  $ brrelease autocomplete powershell

  $ brrelease autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.15/src/commands/autocomplete/index.ts)_

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
    <value>] [-r <value>...] [-m <value>] [-b <value>] [--bump-files-commit-message <value>] [-p <value>...] [-B
    <value>...] [-u <value>...] [--release-as major|minor|patch] [--first-release] [--prerelease <value>] [-s] [-A]

FLAGS
  -A, --auto-push                                         Automatically push the branches and tag once the release has
                                                          been merged (this is more for convenience)
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
                                                          you're on. Please note that this branch will be merged into
                                                          the branch you're on after the release runs to ensure the
                                                          changelog generates correctly.
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

_See code: [src/commands/release.ts](https://github.com/kerren/brrelease/blob/v1.14.3/src/commands/release.ts)_
<!-- commandsstop -->


# FAQ

## Why no npmjs.com entry?

In order to get the other libraries to work the way I wanted, I needed to use 
patches on the `node_modules` libraries installed. I thought that the 
`postinstall` script would run on my library when you `npm install` it, but it
looks like it skips that lifecycle hook. So I've had to create full builds for
this and rather provide other ways of installing!
