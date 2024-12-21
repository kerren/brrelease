brrelease
=================

A CLI used to create releases on a repository but it runs on any branch and allows you to trigger file generateors, etc as part of the release.


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/brrelease.svg)](https://npmjs.org/package/brrelease)
[![Downloads/week](https://img.shields.io/npm/dw/brrelease.svg)](https://npmjs.org/package/brrelease)


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
brrelease/0.0.0 linux-x64 node-v23.5.0
$ brrelease --help [COMMAND]
USAGE
  $ brrelease COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`brrelease hello PERSON`](#brrelease-hello-person)
* [`brrelease hello world`](#brrelease-hello-world)
* [`brrelease help [COMMAND]`](#brrelease-help-command)
* [`brrelease plugins`](#brrelease-plugins)
* [`brrelease plugins add PLUGIN`](#brrelease-plugins-add-plugin)
* [`brrelease plugins:inspect PLUGIN...`](#brrelease-pluginsinspect-plugin)
* [`brrelease plugins install PLUGIN`](#brrelease-plugins-install-plugin)
* [`brrelease plugins link PATH`](#brrelease-plugins-link-path)
* [`brrelease plugins remove [PLUGIN]`](#brrelease-plugins-remove-plugin)
* [`brrelease plugins reset`](#brrelease-plugins-reset)
* [`brrelease plugins uninstall [PLUGIN]`](#brrelease-plugins-uninstall-plugin)
* [`brrelease plugins unlink [PLUGIN]`](#brrelease-plugins-unlink-plugin)
* [`brrelease plugins update`](#brrelease-plugins-update)

## `brrelease hello PERSON`

Say hello

```
USAGE
  $ brrelease hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ brrelease hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/kerren/brrelease/blob/v0.0.0/src/commands/hello/index.ts)_

## `brrelease hello world`

Say hello world

```
USAGE
  $ brrelease hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ brrelease hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/kerren/brrelease/blob/v0.0.0/src/commands/hello/world.ts)_

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

## `brrelease plugins`

List installed plugins.

```
USAGE
  $ brrelease plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ brrelease plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/index.ts)_

## `brrelease plugins add PLUGIN`

Installs a plugin into brrelease.

```
USAGE
  $ brrelease plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into brrelease.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the BRRELEASE_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the BRRELEASE_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ brrelease plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ brrelease plugins add myplugin

  Install a plugin from a github url.

    $ brrelease plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ brrelease plugins add someuser/someplugin
```

## `brrelease plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ brrelease plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ brrelease plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/inspect.ts)_

## `brrelease plugins install PLUGIN`

Installs a plugin into brrelease.

```
USAGE
  $ brrelease plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into brrelease.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the BRRELEASE_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the BRRELEASE_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ brrelease plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ brrelease plugins install myplugin

  Install a plugin from a github url.

    $ brrelease plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ brrelease plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/install.ts)_

## `brrelease plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ brrelease plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ brrelease plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/link.ts)_

## `brrelease plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ brrelease plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ brrelease plugins unlink
  $ brrelease plugins remove

EXAMPLES
  $ brrelease plugins remove myplugin
```

## `brrelease plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ brrelease plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/reset.ts)_

## `brrelease plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ brrelease plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ brrelease plugins unlink
  $ brrelease plugins remove

EXAMPLES
  $ brrelease plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/uninstall.ts)_

## `brrelease plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ brrelease plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ brrelease plugins unlink
  $ brrelease plugins remove

EXAMPLES
  $ brrelease plugins unlink myplugin
```

## `brrelease plugins update`

Update installed plugins.

```
USAGE
  $ brrelease plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/update.ts)_
<!-- commandsstop -->
