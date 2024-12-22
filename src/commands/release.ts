import { Args, Command, Flags } from '@oclif/core';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import commitAndTagVersion from 'commit-and-tag-version';
import chalk from 'chalk';
import { gitCreateBranch } from '../shared/git/git-create-branch.js';
import ora from 'ora';
import { gitStageChanges } from '../shared/git/git-stage-changes.js';
import { gitCommitChanges } from '../shared/git/git-commit-changes.js';
import { spawnCommand } from '../shared/spawn-command.js';
import { gitCheckForChanges } from '../shared/git/git-check-for-changes.js';
import { gitGetCurrentBranch } from '../shared/git/git-get-current-branch.js';
import Flag = Command.Flag;
import { gitCheckoutBranch } from '../shared/git/git-checkout-branch.js';
import { gitMergeBranch } from '../shared/git/git-merge-branch.js';
import { gitDeleteBranch } from '../shared/git/git-delete-branch.js';

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
    };

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Release);

        try {
            const tagPrefix = flags['tag-prefix'];
            const releaseBranchPrefix = flags['release-branch-prefix'];
            const gitBinaryPath = flags['git-binary-path'];

            const newVersion: string = await commitAndTagVersion({ dryRun: true, silent: true });
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
                    await gitCommitChanges(gitBinaryPath, flags['run-script-during-release-commit-message']);
                    additionalUserScriptsSpinner.succeed(`Running additional user scripts (${additionalUserScripts.length} scripts)`);
                } else {
                    additionalUserScriptsSpinner.warn(
                        `Running additional user scripts (${additionalUserScripts.length} scripts) - no file changes found!`,
                    );
                }
            }

            // 3. Create the changelog
            const skipChangelog = flags['skip-changelog'];
            const changelogFilePath = flags['changelog-file-path'];
            const changeLogSpinner = ora(`Creating the changelog ${changelogFilePath}`);
            if (skipChangelog) {
                changeLogSpinner.warn('You have elected to skip changelog creation');
            } else {
                await commitAndTagVersion({
                    silent: true,
                    skip: {
                        tag: true,
                        bump: true,
                        commit: true,
                    },
                    infile: changelogFilePath,
                });
                changeLogSpinner.succeed(`Creating the changelog ${changelogFilePath}`);
                await gitStageChanges(gitBinaryPath);
                await gitCommitChanges(gitBinaryPath, flags['changelog-commit-message']);
            }

            // 4. Run the bump files?
            const bumpSpinner = ora(`Bumping version number to ${newVersionWithPrefix}`);
            await commitAndTagVersion({
                silent: true,
                skip: {
                    tag: true,
                    changelog: true,
                    commit: true,
                },
                infile: changelogFilePath,
            });
            await gitStageChanges(gitBinaryPath);
            await gitCommitChanges(gitBinaryPath, flags['bump-files-commit-message']);
            bumpSpinner.succeed(`Bumping version number to ${newVersionWithPrefix}`);

            // 5. Merge branch
            const isDifferentMergeBranch = !!flags['merge-into-branch'];
            const mergeBranchName = flags['merge-into-branch'] ?? currentBranch;
            const mergeSpinner = ora(`Merging the release into branch ${mergeBranchName}`).start();
            if (isDifferentMergeBranch) {
                // We need to merge this into a DIFFERENT branch to what we started from
                await gitCheckoutBranch(gitBinaryPath, mergeBranchName);
                await gitMergeBranch(gitBinaryPath, releaseBranchName);
                mergeSpinner.succeed(`Merging the release into branch ${mergeBranchName}`);

                if (!flags['skip-merge-back-into-current-branch']) {
                    mergeSpinner.start(`Merging the release into branch ${currentBranch}`);
                    await gitCheckoutBranch(gitBinaryPath, currentBranch);
                    await gitMergeBranch(gitBinaryPath, releaseBranchName);
                    mergeSpinner.succeed(`Merging the release into branch ${currentBranch}`);
                }
            } else {
                // We are merging into the current branch
                await gitCheckoutBranch(gitBinaryPath, currentBranch);
                await gitMergeBranch(gitBinaryPath, releaseBranchName);
                mergeSpinner.succeed(`Merging the release into branch ${mergeBranchName}`);
            }

            // mergeSpinner.start(`Delete release branch ${releaseBranchName}`);
            // await gitDeleteBranch(gitBinaryPath, releaseBranchName);
            // mergeSpinner.succeed(`Delete release branch ${releaseBranchName}`);

            // 6. Merge base branch if necessary
            // TODO: implement this
        } catch (error) {
            this.log('\n');
            this.error((error as any).stderr ?? (error as any).message ?? error);
        }
    }
}
