import { spawn } from 'node:child_process';

export interface SpawnResult {
    stdout: string;
    stderr: string;
    code: number | null;
}

export async function spawnCommand(binary: string, args: string[]) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        const cmd = spawn(binary, args);
        cmd.stdout.on('data', (data) => (stdout += data));
        cmd.stderr.on('data', (data) => (stderr += data));

        cmd.on('close', (code) => {
            const response: SpawnResult = {
                stdout,
                stderr,
                code,
            };
            if (code === 0) {
                resolve(response);
            } else {
                reject(response);
            }
        });
    });
}
