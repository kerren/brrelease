import { Args, Command, Flags } from '@oclif/core';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import commitAndTagVersion from 'commit-and-tag-version';
import chalk from 'chalk';
import { gitCreateBranch } from '../shared/git/git-create-branch.js';
import ora from 'ora';
import { gitStageChanges } from '../shared/git/git-stage-changes.js';
import { gitCommitChanges } from '../shared/git/git-commit-changes.js';

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
            default: 'generate the changelog',
        }),
    };

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Release);

        const tagPrefix = flags['tag-prefix'];
        const releaseBranchPrefix = flags['release-branch-prefix'];
        const gitBinaryPath = flags['git-binary-path'];

        const skipChangelog = flags['skip-changelog'];
        const changelogFilePath = flags['changelog-file-path'];

        try {
            const newVersion: string = await commitAndTagVersion({ dryRun: true, silent: true });
            const newVersionWithPrefix = `${tagPrefix}${newVersion}`;
            this.log(`The new release version will be ${chalk.green(newVersionWithPrefix)}`);

            // 1. Create the new release branch
            const releaseBranchName = `${releaseBranchPrefix}${newVersionWithPrefix}`;
            const newReleaseBranchSpinner = ora(`Creating a new release branch ${chalk.bgBlue(releaseBranchName)}`).start();
            await gitCreateBranch(gitBinaryPath, releaseBranchName);
            newReleaseBranchSpinner.succeed(`Creating a new release branch ${newVersionWithPrefix}`);

            // 2. Create the changelog
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
        } catch (error) {
            this.log('\n');
            this.error((error as any).stderr ?? (error as any).message ?? error);
        }
    }
}
