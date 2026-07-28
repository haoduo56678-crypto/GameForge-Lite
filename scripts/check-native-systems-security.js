'use strict';

const path = require('node:path');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const context = loadGameForge(DIST);
for (const relative of ['native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js']) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;

const machine = GF.nativeSystems.createMachineComponent({
  name: '安全测试机器', id: 'secure_machine',
  inputItem: 'minecraft:iron_ingot', fuelItem: 'minecraft:coal',
  outputItem: 'minecraft:gold_ingot', processTicks: 20
});
const project = GF.project.create({ name: 'Security Fixture', namespace: 'security_fixture', components: [machine] });
const output = GF.nativeForge.generate(project, {
  modId: 'security_fixture', modName: 'Security Fixture',
  packageName: 'com.gameforge.securityfixture', version: '1.0.0', author: 'GameForge CI'
});
const packet = output.files.find((entry) => entry.name.endsWith('/MachineActionPacket.java'));
if (!packet || packet.encoding === 'base64') throw new Error('MachineActionPacket.java was not generated.');
const source = String(packet.data || '');
for (const marker of [
  'sender.containerMenu instanceof GameForgeMachineMenu',
  'menu.position().equals(packet.pos)',
  'distanceToSqr',
  'blockEntity instanceof GameForgeMachineBlockEntity machine',
  'gameforgeMachineActionTick',
  'persistent.contains(throttleKey)',
  'now - persistent.getLong(throttleKey) < 3L',
  'persistent.putLong(throttleKey, now)',
  'machine.handleAction(packet.action, sender)'
]) {
  if (!source.includes(marker)) throw new Error(`Generated C2S packet security is missing marker: ${marker}`);
}
if (!(source.indexOf('blockEntity instanceof GameForgeMachineBlockEntity machine') < source.indexOf('persistent.putLong(throttleKey, now)')
  && source.indexOf('persistent.putLong(throttleKey, now)') < source.indexOf('machine.handleAction(packet.action, sender)'))) {
  throw new Error('C2S packet validation/rate-limit/action order is unsafe.');
}
console.log('Native machine C2S menu, position, distance, BlockEntity and per-player rate-limit checks passed.');
