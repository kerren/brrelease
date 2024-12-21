import { Args, Command, Flags } from '@oclif/core';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import commitAndTagVersion from 'commit-and-tag-version';

export default class Release extends Command {
    static override args = {};

    static override description = `Run a release on the branch that you're on`;

    static override examples = ['<%= config.bin %> <%= command.id %>'];

    static override flags = {};

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Release);

        try {
            const newVersion: string = await commitAndTagVersion({ dryRun: true, silent: true });
            console.log({ newVersion });
        } catch (error) {
            this.error(error);
        }
    }
}
