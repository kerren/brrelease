import { spawnCommand } from '../spawn-command.js';

export async function gitCreateBranch(branchName: string) {
    return await spawnCommand('git', ['checkout', '-b', branchName]);
}
