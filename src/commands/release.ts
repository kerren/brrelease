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

export default class Release extends Command {
    static override args = {};

    static override description = `Run a release on the branch that you're on`;

    static override examples = ['<%= config.bin %> <%= command.id %>'];

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
            description: `If you would like the release to merge into a different branch, specify it here. The default is the current branch you're on`,
        }),
        'skip-merge-back-into-current-branch': Flags.boolean({
            char: 's',
            description: `If you are merging into a different branch, you can elect to skip merging it back into the current branch you're on`,
            dependsOn: ['merge-into-branch'],
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
            description: `Sign the git commits`,
            default: true,
            allowNo: true,
        }),
    };

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

            const dryRun = await commitAndTagVersion({ ...commitAndTagBody, dryRun: true });
            const newVersion = dryRun.newVersion!;
            const changelogOutput = dryRun.changelogOutput!;

            const newVersionWithPrefix = `${tagPrefix}${newVersion}`;
            this.log(`The new release version will be ${chalk.green(newVersionWithPrefix)}`);

            const { stdout: currentBranch } = await gitGetCurrentBranch(gitBinaryPath);

            // 1. Create the new release branch
            const releaseBranchName = `${releaseBranchPrefix}${newVersionWithPrefix}`;
            const newReleaseBranchSpinner = ora(`Creating a new release branch ${chalk.bgBlue(releaseBranchName)}`).start();
            await gitCreateBranch(gitBinaryPath, releaseBranchName);
            newReleaseBranchSpinner.succeed(`Creating a new release branch ${newVersionWithPrefix}`);

            // 2. Run the additional user scripts
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

            // 3. Create the changelog
            const skipChangelog = flags['skip-changelog'];
            const changeLogSpinner = ora(`Creating the changelog ${changelogFilePath}`);
            if (skipChangelog) {
                changeLogSpinner.warn('You have elected to skip changelog creation');
            } else {
                await commitAndTagVersion({
                    ...commitAndTagBody,
                    skip: {
                        tag: true,
                        bump: true,
                        commit: true,
                    },
                });
                changeLogSpinner.succeed(`Creating the changelog ${changelogFilePath}`);
                await gitStageChanges(gitBinaryPath);
                await gitCommitChanges(gitBinaryPath, flags['changelog-commit-message'], sign);
            }

            // 4. Run the bump files
            const numFiles = packageFiles.length + bumpFiles.length + updaters.length;
            const bumpSpinner = ora(`Bumping version number to ${newVersionWithPrefix}`);
            if (numFiles > 0 && !firstRelease) {
                await commitAndTagVersion({
                    ...commitAndTagBody,
                    skip: {
                        tag: true,
                        changelog: true,
                        commit: true,
                    },
                });
                await gitStageChanges(gitBinaryPath);
                await gitCommitChanges(gitBinaryPath, flags['bump-files-commit-message'], sign);
                bumpSpinner.succeed(`Bumping version number to ${newVersionWithPrefix}`);
            } else {
                bumpSpinner.warn(`No files specified to bump to ${newVersionWithPrefix}`);
            }

            // 5. Merge branch
            const isDifferentMergeBranch = !!flags['merge-into-branch'];
            const mergeBranchName = flags['merge-into-branch'] ?? currentBranch;
            const mergeSpinner = ora(`Merging the release into branch ${mergeBranchName}`).start();
            if (isDifferentMergeBranch) {
                // We need to merge this into a DIFFERENT branch to what we started from
                await gitCheckoutBranch(gitBinaryPath, mergeBranchName);
                await gitMergeBranch(gitBinaryPath, releaseBranchName, sign);
                await gitCreateTag(gitBinaryPath, newVersionWithPrefix);
                mergeSpinner.succeed(`Merging the release into branch ${mergeBranchName}`);

                if (!flags['skip-merge-back-into-current-branch']) {
                    mergeSpinner.start(`Merging the release into branch ${currentBranch}`);
                    await gitCheckoutBranch(gitBinaryPath, currentBranch);
                    await gitMergeBranch(gitBinaryPath, releaseBranchName, sign);
                    mergeSpinner.succeed(`Merging the release into branch ${currentBranch}`);
                }
            } else {
                // We are merging into the current branch
                await gitCheckoutBranch(gitBinaryPath, currentBranch);
                await gitMergeBranch(gitBinaryPath, releaseBranchName, sign);
                await gitCreateTag(gitBinaryPath, newVersionWithPrefix);
                mergeSpinner.succeed(`Merging the release into branch ${mergeBranchName}`);
            }

            mergeSpinner.start(`Delete release branch ${releaseBranchName}`);
            await gitDeleteBranch(gitBinaryPath, releaseBranchName);
            mergeSpinner.succeed(`Delete release branch ${releaseBranchName}`);
        } catch (error) {
            this.log('\n');
            this.error((error as any).stderr ?? (error as any).message ?? error);
        }
    }
}
