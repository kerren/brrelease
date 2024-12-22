import { spawnCommand } from '../spawn-command.js';

export async function gitGetCurrentBranch(gitBinary: string) {
    // See https://stackoverflow.com/a/1418022
    return spawnCommand(gitBinary, ['rev-parse', '--abbrev-ref', 'HEAD']);
}
