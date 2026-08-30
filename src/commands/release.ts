import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { gitCreateBranch } from '../shared/git/git-create-branch.js';
import ora from 'ora';
import { gitStageChanges } from '../shared/git/git-stage-changes.js';
import { gitCommitChanges } from '../shared/git/git-commit-changes.js';
import { spawnCommand } from '../shared/spawn-command.js';
import { gitCheckForChanges } from '../shared/git/git-check-for-changes.js';
import { gitGetCurrentBranch } from '../shared/git/git-get-current-branch.js';
import { gitCheckoutBranch } from '../shared/git/git-checkout-branch.js';
import { gitMergeBranch } from '../shared/git/git-merge-branch.js';
import { gitDeleteBranch } from '../shared/git/git-delete-branch.js';
import { gitCreateTag } from '../shared/git/git-create-tag.js';
import { commitAndTagVersion } from '../shared/commit-and-tag-version.js';
import { gitStageFile } from '../shared/git/git-stage-file.js';
import { gitDiscardAllUnstagedChanges } from '../shared/git/git-discard-all-unstaged-changes.js';
import { gitPushBranch } from '../shared/git/git-push-branch.js';
import { gitIsInsideWorkTree } from '../shared/git/git-is-inside-work-tree.js';
import { hasFailure, PreflightCheck, PreflightOptions } from '../shared/preflight/preflight-check.js';
import { runRepositoryChecks } from '../shared/preflight/run-repository-checks.js';
import { runVersionChecks } from '../shared/preflight/run-version-checks.js';

export default class Release extends Command {
    static override args = {};

    static override description = `Run a release on the branch that you're on`;

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
        `<%= config.bin %> <%= command.id %> --release-as=major`,
        `<%= config.bin %> <%= command.id %> --merge-into-branch=main`,
        `<%= config.bin %> <%= command.id %> --merge-into-branch=main --run-script-during-release="npm run update-readme"`,
        `<%= config.bin %> <%= command.id %> --merge-into-branch=main --run-script-during-release="npm run update-readme" --run-script-during-release="echo $(date) > .latest-build-time"`,
        `<%= config.bin %> <%= command.id %> --prerelease=beta --skip-changelog`,
        `<%= config.bin %> <%= command.id %> --package-file=package.json --bump-file=package-lock.json --bump-file=.versionrc`,
    ];

    static override flags = {
        'tag-prefix': Flags.string({
            char: 'P',
            description: 'The prefix that should be before the number on the tag made in git (default is "v")',
            default: 'v',
        }),
        'git-binary-path': Flags.string({
            char: 'G',
            description: 'The path to the git binary (default is "git" since it assumes it is globally accessible)',
            default: 'git',
        }),
        'release-branch-prefix': Flags.string({
            char: 'R',
            description: 'The prefix that is used to create release branches (default is "release/")',
            default: 'release/',
        }),
        'changelog-file-path': Flags.string({
            char: 'c',
            description: 'The path to the file that the changelog should be written to',
            default: 'CHANGELOG.md',
        }),
        'skip-changelog': Flags.boolean({
            char: 'C',
            description: 'Skip writing to a changelog file',
            default: false,
        }),
        'changelog-commit-message': Flags.string({
            description: 'The commit message that should be used to commit the changelog file',
            default: 'chore: generate the changelog',
        }),
        'run-script-during-release': Flags.string({
            char: 'r',
            description: `One or many scripts that should be run during the release, it's recommended that you make these npm scripts and they don't contain the '"' character`,
            multiple: true,
        }),
        'run-script-during-release-commit-message': Flags.string({
            char: 'm',
            description: `The commit message that should be used to commit the changed files that occur after running the custom release job`,
            default: 'chore: generate the release file changes',
        }),
        'merge-into-branch': Flags.string({
            char: 'b',
            description: `If you would like the release to merge into a different branch, specify it here. The default is the current branch you're on. Please note that this branch will be merged into the branch you're on after the release runs to ensure the changelog generates correctly.`,
        }),
        'bump-files-commit-message': Flags.string({
            description: 'The commit message to use when bumping the version in files',
            default: 'chore: bump the version in project files',
        }),
        'package-file': Flags.string({
            char: 'p',
            description: `The package files that should be used to determine the current version of the project (see https://github.com/absolute-version/commit-and-tag-version)`,
            multiple: true,
            default: ['package.json'],
        }),
        'bump-file': Flags.string({
            char: 'B',
            description: `The files where the version should be bumped with out the previous version being considered (see https://github.com/absolute-version/commit-and-tag-version)`,
            multiple: true,
        }),
        updater: Flags.string({
            char: 'u',
            description: `The updater files/scripts that should run during execution (see https://github.com/absolute-version/commit-and-tag-version)`,
            multiple: true,
        }),
        'release-as': Flags.string({
            description: `Specify the type of release (see https://github.com/absolute-version/commit-and-tag-version)`,
            options: ['major', 'minor', 'patch'],
        }),
        'first-release': Flags.boolean({
            description: `If this is the first release being created (see https://github.com/absolute-version/commit-and-tag-version)`,
            default: false,
        }),
        prerelease: Flags.string({
            description: `The prerelease prefix that should be used if necessary (see https://github.com/absolute-version/commit-and-tag-version)`,
        }),
        sign: Flags.boolean({
            char: 's',
            description: `Sign the git commits and the release tag`,
            default: true,
            allowNo: true,
        }),
        'auto-push': Flags.boolean({
            char: 'A',
            description: `Automatically push the branches and tag once the release has been merged (this is more for convenience)`,
            default: false,
        }),
        'skip-preflight': Flags.boolean({
            description: `Skip the preflight checks that run before the release starts. This is an escape hatch, you are strongly encouraged to fix what the checks report instead.`,
            default: false,
        }),
        'fail-on-uncommitted': Flags.boolean({
            description: `Fail the preflight checks when there are uncommitted changes in the working tree. By default uncommitted changes are only reported as a warning, because a build run before the release usually leaves generated files behind.`,
            default: false,
        }),
        'skip-fetch': Flags.boolean({
            description: `Do not contact the remote during the preflight checks. Branches are then compared against the last known state of the remote and the remote tag check is skipped.`,
            default: false,
        }),
    };

    /**
     * Prints each preflight check with its status, and the remedy for anything that did not pass.
     */
    private reportPreflightChecks(checks: PreflightCheck[]): void {
        for (const check of checks) {
            switch (check.status) {
                case 'pass': {
                    this.log(`  ${chalk.green('✔')} ${check.name} ${chalk.dim(`- ${check.message}`)}`);
                    break;
                }
                case 'warn': {
                    this.log(`  ${chalk.yellow('⚠')} ${check.name} ${chalk.yellow(`- ${check.message}`)}`);
                    break;
                }
                case 'fail': {
                    this.log(`  ${chalk.red('✖')} ${check.name} ${chalk.red(`- ${check.message}`)}`);
                    break;
                }
                case 'skip': {
                    this.log(`  ${chalk.dim('○')} ${check.name} ${chalk.dim(`- ${check.message}`)}`);
                    break;
                }
            }

            if (check.remedy && check.status !== 'pass') {
                this.log(`    ${chalk.dim(check.remedy)}`);
            }
        }
    }

    /**
     * Stops the release if any preflight check failed. Warnings are informational and do not block.
     */
    private assertPreflightPassed(checks: PreflightCheck[]): void {
        if (!hasFailure(checks)) {
            return;
        }

        const failures = checks.filter((check) => check.status === 'fail');
        throw new Error(
            `Preflight found ${failures.length} problem(s) that would break this release. Fix them and try again, or re-run with --skip-preflight to bypass the checks.`,
        );
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(Release);

        try {
            const tagPrefix = flags['tag-prefix'];
            const releaseBranchPrefix = flags['release-branch-prefix'];
            const gitBinaryPath = flags['git-binary-path'];
            const sign = flags['sign'];

            const packageFiles = (flags['package-file'] ?? []).filter((f) => f !== '');
            const bumpFiles = (flags['bump-file'] ?? []).filter((f) => f !== '');
            const updaters = (flags['updater'] ?? []).filter((f) => f !== '');
            const firstRelease = flags['first-release'] ?? undefined;

            const changelogFilePath = flags['changelog-file-path'];

            const commitAndTagBody = {
                infile: changelogFilePath,
                bumpFiles: [...bumpFiles, ...packageFiles],
                packageFiles,
                updaters,
                sign,
                releaseAs: flags['release-as'] ?? undefined,
                firstRelease,
                prerelease: flags['prerelease'] ?? undefined,
            };

            const autoPush = flags['auto-push'];
            const mergeIntoBranch = flags['merge-into-branch'];
            const skipPreflight = flags['skip-preflight'];

            // 0. Preflight - make sure the repository is in a state where a release can succeed
            if (!(await gitIsInsideWorkTree(gitBinaryPath))) {
                throw new Error(
                    `This does not look like a git repository (or ${gitBinaryPath} is not a working git binary). Run the release from inside a repository.`,
                );
            }

            const { stdout: currentBranch } = await gitGetCurrentBranch(gitBinaryPath);

            const preflightOptions: PreflightOptions = {
                gitBinaryPath,
                failOnUncommitted: flags['fail-on-uncommitted'],
                skipFetch: flags['skip-fetch'],
                autoPush,
                currentBranch,
                mergeIntoBranch,
            };

            if (skipPreflight) {
                this.log(chalk.yellow('Skipping the preflight checks because --skip-preflight was passed'));
            } else {
                this.log(chalk.bold('Running preflight checks'));
                const repositoryChecks = await runRepositoryChecks(preflightOptions);
                this.reportPreflightChecks(repositoryChecks);
                this.assertPreflightPassed(repositoryChecks);
            }

            const dryRun = await commitAndTagVersion({ ...commitAndTagBody, dryRun: true });
            const newVersion = dryRun.newVersion!;
            const changelogOutput = dryRun.changelogOutput!;

            const newVersionWithPrefix = `${tagPrefix}${newVersion}`;
            const releaseBranchName = `${releaseBranchPrefix}${newVersionWithPrefix}`;

            if (!skipPreflight) {
                // The dry run above prints a lot of output, so re-anchor the remaining checks
                this.log(chalk.bold(`Running preflight checks for ${newVersionWithPrefix}`));
                const versionChecks = await runVersionChecks(preflightOptions, newVersionWithPrefix, releaseBranchName);
                this.reportPreflightChecks(versionChecks);
                this.assertPreflightPassed(versionChecks);
            }

            this.log(`The new release version will be ${chalk.green(newVersionWithPrefix)}`);

            // 1. Create the new release branch
            const newReleaseBranchSpinner = ora(`Creating a new release branch ${chalk.bgBlue(releaseBranchName)}`).start();
            await gitCreateBranch(gitBinaryPath, releaseBranchName);
            newReleaseBranchSpinner.succeed(`Creating a new release branch ${newVersionWithPrefix}`);

            // 2. Create the changelog
            const skipChangelog = flags['skip-changelog'];
            const changeLogSpinner = ora(`Creating the changelog ${changelogFilePath}`);
            if (skipChangelog) {
                changeLogSpinner.warn('You have elected to skip changelog creation');
            } else {
                await commitAndTagVersion({
                    ...commitAndTagBody,
                    skip: {
                        tag: true,
                        commit: true,
                    },
                });
                changeLogSpinner.succeed(`Creating the changelog ${changelogFilePath}`);
                await gitStageFile(gitBinaryPath, changelogFilePath);
                await gitCommitChanges(gitBinaryPath, flags['changelog-commit-message'], sign);
                changeLogSpinner.start(`Clearing additional files`);

                const additionalFiles = await gitCheckForChanges(gitBinaryPath);
                if (additionalFiles) {
                    await gitDiscardAllUnstagedChanges(gitBinaryPath);
                    changeLogSpinner.succeed(`Clearing additional files`);
                } else {
                    changeLogSpinner.info(`No additional files to clear`);
                }
            }

            // 3. Run the bump files
            const numFiles = packageFiles.length + bumpFiles.length + updaters.length;
            const bumpSpinner = ora(`Bumping version number to ${newVersionWithPrefix}`).start();
            if (numFiles > 0 && !firstRelease) {
                await commitAndTagVersion({
                    ...commitAndTagBody,
                    skip: {
                        tag: true,
                        changelog: true,
                        commit: true,
                    },
                });
                const additionalFiles = await gitCheckForChanges(gitBinaryPath);
                if (additionalFiles) {
                    await gitStageChanges(gitBinaryPath);
                    await gitCommitChanges(gitBinaryPath, flags['bump-files-commit-message'], sign);
                    bumpSpinner.succeed(`Bumping version number to ${newVersionWithPrefix}`);
                } else {
                    bumpSpinner.warn(`No files specified to bump to ${newVersionWithPrefix}`);
                }
            } else {
                bumpSpinner.warn(`No files specified to bump to ${newVersionWithPrefix}`);
            }

            // 4. Run the additional user scripts
            const additionalUserScripts = flags['run-script-during-release'] ?? [];
            const additionalUserScriptsSpinner = ora(`Running additional user scripts (${additionalUserScripts.length} scripts)`).start();
            if (additionalUserScripts.length === 0) {
                additionalUserScriptsSpinner.succeed('No additional user scripts specified');
            } else {
                for (const script of additionalUserScripts) {
                    const scriptSpinner = additionalUserScriptsSpinner.start(script);
                    const spawnResult = await spawnCommand('/bin/bash', ['-c', script]);
                    this.log(spawnResult.stdout);
                    scriptSpinner.succeed(script);
                }

                const checkForChanges = await gitCheckForChanges(gitBinaryPath);
                if (checkForChanges) {
                    await gitStageChanges(gitBinaryPath);
                    await gitCommitChanges(gitBinaryPath, flags['run-script-during-release-commit-message'], sign);
                    additionalUserScriptsSpinner.succeed(`Running additional user scripts (${additionalUserScripts.length} scripts)`);
                } else {
                    additionalUserScriptsSpinner.warn(
                        `Running additional user scripts (${additionalUserScripts.length} scripts) - no file changes found!`,
                    );
                }
            }

            // 5. Merge branch
            const isDifferentMergeBranch = !!mergeIntoBranch;
            const mergeBranchName = mergeIntoBranch ?? currentBranch;
            const mergeSpinner = ora(`Merging the release into branch ${mergeBranchName}`).start();
            if (isDifferentMergeBranch) {
                // We need to merge this into a DIFFERENT branch to what we started from
                await gitCheckoutBranch(gitBinaryPath, mergeBranchName);
                await gitMergeBranch(gitBinaryPath, releaseBranchName, sign);
                await gitCreateTag(gitBinaryPath, newVersionWithPrefix, changelogOutput, sign);
                if (autoPush) {
                    await gitPushBranch(gitBinaryPath);
                }
                mergeSpinner.succeed(`Merging the release into branch ${mergeBranchName}`);

                mergeSpinner.start(`Merging ${mergeBranchName} into ${currentBranch} to ensure changelog generates correctly`);
                await gitCheckoutBranch(gitBinaryPath, currentBranch);
                await gitMergeBranch(gitBinaryPath, mergeBranchName, sign);
                if (autoPush) {
                    await gitPushBranch(gitBinaryPath);
                }
                mergeSpinner.succeed(`Merging ${mergeBranchName} into ${currentBranch} to ensure changelog generates correctly`);
            } else {
                // We are merging into the current branch
                await gitCheckoutBranch(gitBinaryPath, currentBranch);
                await gitMergeBranch(gitBinaryPath, releaseBranchName, sign);
                await gitCreateTag(gitBinaryPath, newVersionWithPrefix, changelogOutput, sign);
                if (autoPush) {
                    await gitPushBranch(gitBinaryPath);
                }
                mergeSpinner.succeed(`Merging the release into branch ${mergeBranchName}`);
            }

            mergeSpinner.start(`Delete release branch ${releaseBranchName}`);
            await gitDeleteBranch(gitBinaryPath, releaseBranchName);
            mergeSpinner.succeed(`Delete release branch ${releaseBranchName}`);
        } catch (error) {
            this.log('\n');
            const stringErrorMessage = (error as any).stderr ?? (error as any).message;
            if (!stringErrorMessage) {
                console.error('An error has occurred with an unknown structure...');
                console.error(error);
            }
            this.error((error as any).stderr ?? (error as any).message ?? error);
        }
    }
}
