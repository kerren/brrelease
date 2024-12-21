import { Args, Command, Flags } from '@oclif/core';

export default class Release extends Command {
    static override args = {};

    static override description = `Run a release on the branch that you're on`;

    static override examples = ['<%= config.bin %> <%= command.id %>'];

    static override flags = {};

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Release);
    }
}
