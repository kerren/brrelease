# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.7.1](https://github.com/kerren/brrelease/compare/v1.7.0...v1.7.1) (2024-12-22)


### Bug Fixes

* **merge:** Add additional commentry around the merge into branch flag ([29844ac](https://github.com/kerren/brrelease/commit/29844ac02521cdac90f27fa3bee6536f91553c2b))

## [1.7.0](https://github.com/kerren/brrelease/compare/v1.6.0...v1.7.0) (2024-12-22)


### Features

* **merge:** Merge the original branch back into the current one to improve changelog accuracy ([93e4749](https://github.com/kerren/brrelease/commit/93e4749aeb0cbd310709f85a31f432f06e6b5db7)), closes [#12](https://github.com/kerren/brrelease/issues/12)

## [1.6.0](https://github.com/kerren/brrelease/compare/v1.5.0...v1.6.0) (2024-12-22)


### Features

* **patch:** Use the patch-package library so that npx supports the change ([8267dc1](https://github.com/kerren/brrelease/commit/8267dc14246b813a7d8672b6b66464b61e754207)), closes [#11](https://github.com/kerren/brrelease/issues/11)

## [1.5.0](https://github.com/kerren/brrelease/compare/v1.1.0...v1.5.0) (2024-12-22)


### Features

* **git:** Add the --no-ff flag to the branch merges ([707c753](https://github.com/kerren/brrelease/commit/707c7533a4b8cd3c3dcccc6e23189e50b85d456e))
* **release:** Add the release script that rebuilds the readme ([d6a1ff3](https://github.com/kerren/brrelease/commit/d6a1ff360e260ead2d612c79c9870fc5a61dfced))
* **scripts:** Run the additional scripts AFTER the version bump, as they may be reliant on the package.json version change ([df94b51](https://github.com/kerren/brrelease/commit/df94b516432e5e58c59d3d1b17e63f97bb167db8))


### Bug Fixes

* **release:** Commit my release changes with my own commit message ([714a18c](https://github.com/kerren/brrelease/commit/714a18c618db1073cd17f8d58b90346c6a8affae))

## [1.4.0](https://github.com/kerren/brrelease/compare/v1.1.0...v1.4.0) (2024-12-22)


### Features

* **git:** Add the --no-ff flag to the branch merges ([707c753](https://github.com/kerren/brrelease/commit/707c7533a4b8cd3c3dcccc6e23189e50b85d456e))
* **release:** Add the release script that rebuilds the readme ([d6a1ff3](https://github.com/kerren/brrelease/commit/d6a1ff360e260ead2d612c79c9870fc5a61dfced))
* **scripts:** Run the additional scripts AFTER the version bump, as they may be reliant on the package.json version change ([df94b51](https://github.com/kerren/brrelease/commit/df94b516432e5e58c59d3d1b17e63f97bb167db8))


### Bug Fixes

* **release:** Commit my release changes with my own commit message ([714a18c](https://github.com/kerren/brrelease/commit/714a18c618db1073cd17f8d58b90346c6a8affae))

## [1.3.0](https://github.com/kerren/brrelease/compare/v1.1.0...v1.3.0) (2024-12-22)


### Features

* **git:** Add the --no-ff flag to the branch merges ([707c753](https://github.com/kerren/brrelease/commit/707c7533a4b8cd3c3dcccc6e23189e50b85d456e))
* **release:** Add the release script that rebuilds the readme ([d6a1ff3](https://github.com/kerren/brrelease/commit/d6a1ff360e260ead2d612c79c9870fc5a61dfced))
* **scripts:** Run the additional scripts AFTER the version bump, as they may be reliant on the package.json version change ([df94b51](https://github.com/kerren/brrelease/commit/df94b516432e5e58c59d3d1b17e63f97bb167db8))


### Bug Fixes

* **release:** Commit my release changes with my own commit message ([714a18c](https://github.com/kerren/brrelease/commit/714a18c618db1073cd17f8d58b90346c6a8affae))

## [1.2.0](https://github.com/kerren/brrelease/compare/v1.1.0...v1.2.0) (2024-12-22)


### Features

* **git:** Add the --no-ff flag to the branch merges ([707c753](https://github.com/kerren/brrelease/commit/707c7533a4b8cd3c3dcccc6e23189e50b85d456e))
* **release:** Add the release script that rebuilds the readme ([d6a1ff3](https://github.com/kerren/brrelease/commit/d6a1ff360e260ead2d612c79c9870fc5a61dfced))
* **scripts:** Run the additional scripts AFTER the version bump, as they may be reliant on the package.json version change ([df94b51](https://github.com/kerren/brrelease/commit/df94b516432e5e58c59d3d1b17e63f97bb167db8))

## [1.1.0](https://github.com/kerren/brrelease/compare/v1.0.0...v1.1.0) (2024-12-22)


### Features

* **changelog:** Add the ability to extract the changelog text ([e31d658](https://github.com/kerren/brrelease/commit/e31d658d0c3a6651485e8f9af04402c76c59b11f)), closes [#9](https://github.com/kerren/brrelease/issues/9)
* **changelog:** Discard unstaged files after changelog generation ([30d7974](https://github.com/kerren/brrelease/commit/30d7974c433fd93f259197ad54862aba800d450a))
* **debugging:** Log errors of different structures ([fc2cb44](https://github.com/kerren/brrelease/commit/fc2cb44bb8d28808b1d1f37f8407d84cd247f172))
* **tags:** Add the changelog to the annotation message on a tag ([53762ee](https://github.com/kerren/brrelease/commit/53762ee2c8df5f4b8a8ecc4c0244936588bc4522)), closes [#10](https://github.com/kerren/brrelease/issues/10)


### Bug Fixes

* **changelog:** Do not skip the bump version in changelog generation ([25b4182](https://github.com/kerren/brrelease/commit/25b4182424aacaf49c16d27e7ee78e3fbd4f788a))
* **changelog:** Don't skip the bump but only stage the changelog file ([9e0809e](https://github.com/kerren/brrelease/commit/9e0809e1c10c551939f5a2b17f9eacfc57878f30))

## 0.0.0 (2024-12-22)


### Features

* **bump-files:** Add the ability to bump up the version in different files using the original commit-and-tag-version API ([d184721](https://github.com/kerren/brrelease/commit/d184721f55fdfc932dd48691194b7b8635558a9e)), closes [#8](https://github.com/kerren/brrelease/issues/8)
* **cli:** Add all of the additional calls to the commit-and-tag-version API ([3372a81](https://github.com/kerren/brrelease/commit/3372a8178d62c638b19a5139a9b377928811bf3b))
* **prefix:** Add the ability to specify the tag prefix [#4](https://github.com/kerren/brrelease/issues/4) ([506340a](https://github.com/kerren/brrelease/commit/506340ade72eea97267773e5c9d535ca8a05fa33))
* **release:** Add the ability to generate the changelog [#6](https://github.com/kerren/brrelease/issues/6) ([279a9f1](https://github.com/kerren/brrelease/commit/279a9f10b1a757040d9aab53f137c43c23582269))
* **tag:** Add the ability to tag the repo when merging ([2dbd2e3](https://github.com/kerren/brrelease/commit/2dbd2e379f991414d98a698c1daf37a68337efe6))


### Bug Fixes

* **bump-files:** Don't run a bump on a first release ([57f668f](https://github.com/kerren/brrelease/commit/57f668fde4ec325bed2e5565a322a2c2ef124f2a))
* Minor code cleanup ([9146dfd](https://github.com/kerren/brrelease/commit/9146dfd14b31696b6d6bf09b94618a85bb471214))
* **tag:** Make the tag non-interactive ([557929e](https://github.com/kerren/brrelease/commit/557929e0be23c00f8dfc0d7dd8588b9e77f789f2))
