'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'dist', 'native-systems.js');
if (!fs.existsSync(sourcePath)) throw new Error('Missing dist/native-systems.js.');
let source = fs.readFileSync(sourcePath, 'utf8');
const unsafe = "${machines.length ? 'event.enqueueWork(() -> MenuScreens.register(SystemMenus.MACHINE.get(), GameForgeMachineScreen::new));' : '// No generated machine screens.'}";
const safe = "${machines.length ? 'event.enqueueWork(() -> MenuScreens.register(SystemMenus.MACHINE.get(), GameForgeMachineScreen::new));' : '/* No generated machine screens. */'}";
const count = source.split(unsafe).length - 1;
if (count === 1) source = source.replace(unsafe, safe);
else if (!source.includes(safe)) throw new Error(`Could not patch entity-only client setup; found ${count} unsafe templates.`);
if (source.includes(unsafe) || !source.includes(safe)) throw new Error('Entity-only client setup patch did not apply cleanly.');
fs.writeFileSync(sourcePath, source, 'utf8');
execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });
console.log('Patched NativeSystemsClient generation for projects with entities but no machines.');
