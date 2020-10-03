'use strict';

const { describe } = require('./helpers/mocha');
const { expect } = require('./helpers/chai');
const index = require('../src');
const { createTmpDir } = require('./helpers/tmp');
const { gitInit } = require('git-fixtures');
const execa = require('execa');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const sinon = require('sinon');
const {
  getTags
} = require('../src/git');

async function writeRandomFile(tmpPath) {
  await writeFile(path.join(tmpPath, Math.random().toString()), Math.random().toString());
}

async function addAndCommit(tmpPath) {
  await execa('git', ['add', '.'], {
    cwd: tmpPath
  });

  let result = (await execa('git', ['commit', '-m', 'foo'], {
    cwd: tmpPath
  })).stdout;

  let commit = result.match(/^\[master (.+)\] /)[1];

  return commit;
}

async function tag(tmpPath, tag, message = '') {
  await execa('git', ['tag', tag, '-m', message], {
    cwd: tmpPath
  });
}

async function writeAndCommit(tmpPath) {
  await writeRandomFile(tmpPath);

  return await addAndCommit(tmpPath);
}

async function cloneRemote(localPath, remotePath) {
  await execa('git', ['clone', '--bare', localPath, remotePath]);

  await execa('git', ['remote', 'add', 'origin', remotePath], {
    cwd: localPath
  });
}

async function pushTags(tmpPath) {
  await execa('git', ['push', '--set-upstream', 'origin', 'master', '--follow-tags'], {
    cwd: tmpPath
  });
}

describe(function() {
  this.timeout(5e3);

  let tmpPathLocal;
  let tmpPathRemote;

  beforeEach(async function() {
    tmpPathLocal = await createTmpDir();
    tmpPathRemote = await createTmpDir();

    await gitInit({ cwd: tmpPathLocal });

    await cloneRemote(tmpPathLocal, tmpPathRemote);
  });

  it('works without floating tags', async function() {
    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.0.0');

    let v10Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.0.1');

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.1.0');

    let v1Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.1.1');

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.0.0');

    let v20Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.0.1');

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.1.0');

    let v2Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.1.1');

    await pushTags(tmpPathLocal);

    await index({ cwd: tmpPathLocal });

    let tags = await getTags(tmpPathRemote);

    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v10Commit),
      tag: 'v1.0'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v10Commit),
      tag: 'v1.0.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1.1.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v20Commit),
      tag: 'v2.0'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v20Commit),
      tag: 'v2.0.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2.1.1'
    })));
  });

  it('works with floating tags', async function() {
    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.0.0');
    await tag(tmpPathLocal, 'v1.0', 'version one dot zero');
    await tag(tmpPathLocal, 'v1', 'version one');

    let v10Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.0.1');

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.1.0');
    await tag(tmpPathLocal, 'v1.1', 'version one dot one');

    let v1Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.1.1');

    await pushTags(tmpPathLocal);

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.0.0');
    await tag(tmpPathLocal, 'v2.0', 'version two dot zero');
    await tag(tmpPathLocal, 'v2', 'version two');

    let v20Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.0.1');

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.1.0');
    await tag(tmpPathLocal, 'v2.1', 'version two dot one');

    let v2Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.1.1');

    await pushTags(tmpPathLocal);

    await index({ cwd: tmpPathLocal });

    let tags = await getTags(tmpPathRemote);

    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v10Commit),
      tag: 'v1.0',
      message: 'version one dot zero'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v10Commit),
      tag: 'v1.0.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1',
      message: 'version one'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1.1',
      message: 'version one dot one'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1.1.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v20Commit),
      tag: 'v2.0',
      message: 'version two dot zero'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v20Commit),
      tag: 'v2.0.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2',
      message: 'version two'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2.1',
      message: 'version two dot one'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2.1.1'
    })));
  });

  it('can copy the annotation', async function() {
    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.0.0', 'chore(release): 1.0.0');

    let v10Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.0.1', 'chore(release): 1.0.1');

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.1.0', 'chore(release): 1.1.0');

    let v1Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v1.1.1', 'chore(release): 1.1.1');

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.0.0', 'chore(release): 2.0.0');

    let v20Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.0.1', 'chore(release): 2.0.1');

    await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.1.0', 'chore(release): 2.1.0');

    let v2Commit = await writeAndCommit(tmpPathLocal);

    await tag(tmpPathLocal, 'v2.1.1', 'chore(release): 2.1.1');

    await pushTags(tmpPathLocal);

    await index({
      cwd: tmpPathLocal,
      copyAnnotations: true
    });

    let tags = await getTags(tmpPathRemote);

    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v10Commit),
      tag: 'v1.0',
      message: 'chore(release): 1.0.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v10Commit),
      tag: 'v1.0.1',
      message: 'chore(release): 1.0.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1',
      message: 'chore(release): 1.1.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1.1',
      message: 'chore(release): 1.1.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v1Commit),
      tag: 'v1.1.1',
      message: 'chore(release): 1.1.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v20Commit),
      tag: 'v2.0',
      message: 'chore(release): 2.0.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v20Commit),
      tag: 'v2.0.1',
      message: 'chore(release): 2.0.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2',
      message: 'chore(release): 2.1.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2.1',
      message: 'chore(release): 2.1.1'
    })));
    expect(tags).to.match(sinon.match.some(sinon.match({
      commit: sinon.match(v2Commit),
      tag: 'v2.1.1',
      message: 'chore(release): 2.1.1'
    })));
  });
});
