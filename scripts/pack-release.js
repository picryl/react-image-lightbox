'use strict';

// Run without registry credentials. Publishing is a separate, trusted owner
// operation; this public fork must never receive private package permissions.
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const manifest = Object.assign({}, require('../package.json'));
const root = path.resolve(__dirname, '..');
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'lightbox-release-'));
const env = { PATH: process.env.PATH, HOME: stage, npm_config_cache: path.join(stage, 'cache') };
try {
  // GitHub must not inherit access from this public repository on publication.
  delete manifest.repository;
  fs.mkdirSync(path.join(stage, 'dist'));
  fs.copyFileSync(path.join(root, 'dist/main.js'), path.join(stage, 'dist/main.js'));
  ['README.md', 'CHANGELOG.md', 'LICENSE'].forEach(file => fs.copyFileSync(path.join(root, file), path.join(stage, file)));
  fs.writeFileSync(path.join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const result = JSON.parse(childProcess.execFileSync('npm', ['pack', '--ignore-scripts', '--json'], { cwd: stage, env, encoding: 'utf8' }))[0];
  fs.copyFileSync(path.join(stage, result.filename), path.join(root, result.filename));
  console.log(JSON.stringify(result, null, 2));
} finally {
  childProcess.execFileSync('rm', ['-rf', stage]);
}
