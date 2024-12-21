import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('release', () => {
  it('runs release cmd', async () => {
    const {stdout} = await runCommand('release')
    expect(stdout).to.contain('hello world')
  })

  it('runs release --name oclif', async () => {
    const {stdout} = await runCommand('release --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
