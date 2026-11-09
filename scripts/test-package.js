'use strict';

// Keep the installed package outside the checkout so build-time Babel cannot
// accidentally satisfy an undeclared dependency in the published entry point.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const JSDOM = require('jsdom').JSDOM;
const manifest = require('../package.json');
const archive = path.resolve(process.argv[2] || `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'lightbox-package-'));
const env = { PATH: process.env.PATH, HOME: fixture, npm_config_cache: path.join(fixture, 'cache') };
fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ private: true }));
let dom;
try {
  childProcess.execFileSync('npm', ['install', '--production', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', archive, 'react@16.14.0', 'react-dom@16.14.0'], { cwd: fixture, env, stdio: 'inherit' });
  dom = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  ['Image', 'HTMLCollection', 'NodeList', 'HTMLElement'].forEach(name => {
    global[name] = dom.window[name];
  });
  global.requestAnimationFrame = callback => setTimeout(callback, 0);
  global.cancelAnimationFrame = clearTimeout;
  const modules = path.join(fixture, 'node_modules');
  const React = require(path.join(modules, 'react'));
  const ReactDOM = require(path.join(modules, 'react-dom'));
  const Lightbox = require(path.join(modules, manifest.name));
  const app = document.getElementById('app');
  let closed = false;
  ReactDOM.render(React.createElement(Lightbox, {
    mainSrc: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
    imageTitle: 'Installed image',
    imageCaption: 'Installed caption',
    animationDisabled: true,
    reactModalProps: { appElement: app },
    onCloseRequest: () => { closed = true; ReactDOM.unmountComponentAtNode(app); },
  }), app);
  assert.strictEqual(document.querySelector('.ril-toolbar-left').textContent, 'Installed image');
  assert.strictEqual(document.querySelector('.ril-caption').textContent, 'Installed caption');
  assert(document.head.querySelector('style'), 'Bundled style insertion must work');
  document.querySelector('.ril-close').click();
  assert.strictEqual(closed, true, 'Close button must invoke the consumer callback');
  assert.strictEqual(document.querySelector('.ril-outer'), null, 'Consumer unmount must remove the lightbox');
  console.log('PASS: isolated production package import, CSS insertion, title/caption and close/unmount');
} finally {
  if (dom) dom.window.close();
  childProcess.execFileSync('rm', ['-rf', fixture]);
}
