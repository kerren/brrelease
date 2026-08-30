import { expect } from 'chai';

import { SpawnResult, spawnCommand } from '../../src/shared/spawn-command.js';

describe('spawnCommand', () => {
    it('resolves with the captured stdout when the command succeeds', async () => {
        const result = await spawnCommand('node', ['-e', 'process.stdout.write("hello")']);

        expect(result.code).to.equal(0);
        expect(result.stdout).to.equal('hello');
        expect(result.stderr).to.equal('');
    });

    it('captures stderr separately from stdout', async () => {
        const result = await spawnCommand('node', ['-e', 'process.stdout.write("out"); process.stderr.write("err")']);

        expect(result.stdout).to.equal('out');
        expect(result.stderr).to.equal('err');
    });

    it('accumulates output that arrives across several chunks', async () => {
        const script = 'for (let i = 0; i < 500; i++) { process.stdout.write("line " + i + "\\n"); }';
        const result = await spawnCommand('node', ['-e', script]);

        const lines = result.stdout.trim().split('\n');
        expect(lines).to.have.lengthOf(500);
        expect(lines[0]).to.equal('line 0');
        expect(lines[499]).to.equal('line 499');
    });

    it('passes arguments through without going via a shell', async () => {
        // If the arguments were interpolated into a shell string, the `$(...)` would be executed
        // and the semicolon would split the argument in two.
        const result = await spawnCommand('node', ['-e', 'process.stdout.write(process.argv[1])', '$(echo injected); echo also']);

        expect(result.stdout).to.equal('$(echo injected); echo also');
    });

    it('rejects when the command exits with a non-zero code', async () => {
        const error = await rejectionOf(spawnCommand('node', ['-e', 'process.exit(3)']));

        expect(error).to.have.property('code', 3);
    });

    it('rejects with the stderr of a failing command, which is what the CLI reports to the user', async () => {
        const error = (await rejectionOf(
            spawnCommand('node', ['-e', 'process.stderr.write("something broke"); process.exit(1)']),
        )) as SpawnResult;

        expect(error.code).to.equal(1);
        expect(error.stderr).to.equal('something broke');
    });

    it('rejects when the command is killed by a signal, reporting a null exit code', async () => {
        const error = (await rejectionOf(spawnCommand('node', ['-e', 'process.kill(process.pid, "SIGKILL")']))) as SpawnResult;

        expect(error.code).to.equal(null);
    });
});

/**
 * Captures the rejection value of a promise. `expect(...).to.be.rejected` needs chai-as-promised,
 * and `spawnCommand` rejects with a plain object rather than an `Error`, so the value itself is
 * what the tests need to inspect.
 *
 * @param promise - The promise that is expected to reject
 * @returns The value the promise rejected with
 */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        return error;
    }

    throw new Error('The promise was expected to reject but it resolved');
}
