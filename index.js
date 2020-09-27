'use strict';

const execa = require('execa');
const { EOL } = require('os');
const semver = require('semver');

async function getTagMessage(tag, cwd) {
  let message = (await execa('git', ['for-each-ref', `refs/tags/${tag}`, '--format=%(contents)'], {
    cwd
  })).stdout.trim();

  return message;
}

async function index({
  cwd: tmpPath,
  copyAnnotation
}) {
  let { stdout: tags } = await execa('git', ['tag'], {
    cwd: tmpPath
  });

  tags = tags.split(EOL);

  let majors = new Set();
  let minors = new Set();

  for (let tag of tags) {
    if (semver.valid(tag) === null) {
      continue;
    }

    let parsed = semver.parse(tag);

    let {
      major,
      minor
    } = parsed;

    let majorMinor = `${major}.${minor}`;

    majors.add(major);
    minors.add(majorMinor);
  }

  for (let major of majors) {
    let maxSatisfying = semver.maxSatisfying(tags, major.toString());

    let { stdout: commit } = await execa('git', ['rev-list', '-n', '1', maxSatisfying], {
      cwd: tmpPath
    });

    let originalMessage = await getTagMessage(maxSatisfying, tmpPath);

    let majorTag = `v${semver.major(maxSatisfying)}`;

    let newTags = [majorTag];

    for (let tag of newTags) {
      let message;

      if (copyAnnotation) {
        message = originalMessage;
      } else {
        message = await getTagMessage(tag, tmpPath);
      }

      try {
        await execa('git', ['tag', '-d', tag], {
          cwd: tmpPath
        });
      } catch (err) {}

      await execa('git', ['tag', '-a', tag, commit, '-m', message], {
        cwd: tmpPath
      });
    }

    await execa('git', ['push', 'origin', 'tag', ...newTags, '--force'], {
      cwd: tmpPath
    });
  }

  for (let minor of minors) {
    let maxSatisfying = semver.maxSatisfying(tags, `~${minor}`);

    let { stdout: commit } = await execa('git', ['rev-list', '-n', '1', maxSatisfying], {
      cwd: tmpPath
    });

    let originalMessage = await getTagMessage(maxSatisfying, tmpPath);

    let minorTag = `v${semver.major(maxSatisfying)}.${semver.minor(maxSatisfying)}`;

    let newTags = [minorTag];

    for (let tag of newTags) {
      let message;

      if (copyAnnotation) {
        message = originalMessage;
      } else {
        message = await getTagMessage(tag, tmpPath);
      }

      try {
        await execa('git', ['tag', '-d', tag], {
          cwd: tmpPath
        });
      } catch (err) {}

      await execa('git', ['tag', '-a', tag, commit, '-m', message], {
        cwd: tmpPath
      });
    }

    await execa('git', ['push', 'origin', 'tag', ...newTags, '--force'], {
      cwd: tmpPath
    });
  }
}

module.exports = index;
