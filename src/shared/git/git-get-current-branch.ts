import { spawnCommand } from '../spawn-command.js';

export async function gitGetCurrentBranch(gitBinary: string) {
    // See https://stackoverflow.com/a/1418022
    const result = await spawnCommand(gitBinary, ['rev-parse', '--abbrev-ref', 'HEAD']);
    result.stdout = result.stdout.split('\n')[0].trim();
    return result;
}
