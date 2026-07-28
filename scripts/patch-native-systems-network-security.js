'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'dist', 'native-systems.js');
if (!fs.existsSync(sourcePath)) throw new Error('Missing dist/native-systems.js.');
let source = fs.readFileSync(sourcePath, 'utf8');

const oldBlock = `            BlockEntity blockEntity = sender.level().getBlockEntity(packet.pos);
            if (blockEntity instanceof GameForgeMachineBlockEntity machine && machine.stillValid(sender)) machine.handleAction(packet.action, sender);`;
const newBlock = `            BlockEntity blockEntity = sender.level().getBlockEntity(packet.pos);
            if (!(blockEntity instanceof GameForgeMachineBlockEntity machine) || !machine.stillValid(sender)) return;
            long now = sender.level().getGameTime();
            var persistent = sender.getPersistentData();
            String throttleKey = "gameforgeMachineActionTick";
            if (persistent.contains(throttleKey) && now - persistent.getLong(throttleKey) < 3L) return;
            persistent.putLong(throttleKey, now);
            machine.handleAction(packet.action, sender);`;

if (source.includes(oldBlock)) source = source.replace(oldBlock, newBlock);
else if (!source.includes(newBlock)) throw new Error('Could not locate MachineActionPacket action block for rate limiting.');

for (const marker of [
  'sender.containerMenu instanceof GameForgeMachineMenu',
  'menu.position().equals(packet.pos)',
  'distanceToSqr',
  'gameforgeMachineActionTick',
  'now - persistent.getLong(throttleKey) < 3L',
  'machine.handleAction(packet.action, sender)'
]) {
  if (!source.includes(marker)) throw new Error(`Machine network security patch is missing marker: ${marker}`);
}

fs.writeFileSync(sourcePath, source, 'utf8');
execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });
console.log('Patched native machine C2S actions with menu, distance, BlockEntity and per-player rate-limit validation.');
