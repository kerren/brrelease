import { expect } from 'chai';

import { hasFailure, PreflightCheck } from '../../../src/shared/preflight/preflight-check.js';

function check(status: PreflightCheck['status']): PreflightCheck {
    return { message: `a ${status} check`, name: status, status };
}

describe('hasFailure', () => {
    it('is false for an empty list of checks', () => {
        expect(hasFailure([])).to.equal(false);
    });

    it('is false when every check passed', () => {
        expect(hasFailure([check('pass'), check('pass')])).to.equal(false);
    });

    it('is false for warnings and skips, which are informational and must not block a release', () => {
        expect(hasFailure([check('pass'), check('warn'), check('skip')])).to.equal(false);
    });

    it('is true as soon as one check failed', () => {
        expect(hasFailure([check('pass'), check('warn'), check('fail'), check('skip')])).to.equal(true);
    });
});
