'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const scripts = [
  'native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js',
  'native-systems-entry.js','native-systems-page.js'
];
for (const relative of scripts) {
  const filePath = path.join(DIST, relative);
  if (!fs.existsSync(filePath)) throw new Error(`Missing native systems build file: dist/${relative}`);
  execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
}

const context = loadGameForge(DIST);
for (const relative of ['native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js']) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;
if (!GF.nativeSystems?.__installed) throw new Error('Native systems generator did not install.');
if (!GF.nativeSystems?.__legacyBridgeInstalled) throw new Error('Native systems legacy bridge did not install.');
if (!GF.blueprint?.__nativeSystemsInstalled) throw new Error('Native systems Blueprint extension did not install.');

const machine = GF.nativeSystems.createMachineComponent({
  name: '星核熔炼机', id: 'star_forge', inputItem: 'minecraft:iron_ingot', inputCount: 1,
  fuelItem: 'minecraft:coal', fuelCount: 1, outputItem: 'minecraft:gold_ingot', outputCount: 2,
  processTicks: 80, color: '#668cff', autoStart: false,
  recipeGrid: ['minecraft:iron_ingot','minecraft:redstone','minecraft:iron_ingot','minecraft:stone','minecraft:furnace','minecraft:stone','minecraft:iron_ingot','minecraft:redstone','minecraft:iron_ingot']
});
const noFuelMachine = GF.nativeSystems.createMachineComponent({
  name: '免燃料压缩机', id: 'fuel_free_press', inputItem: 'minecraft:coal', inputCount: 9,
  fuelItem: 'minecraft:air', fuelCount: 0, outputItem: 'minecraft:coal_block', outputCount: 1,
  processTicks: 40, color: '#4f5969', autoStart: true
});
const entity = GF.nativeSystems.createEntityComponent({
  name: '亡灵守卫', id: 'undead_guard', health: 40, damage: 7, speed: 0.28, armor: 3,
  goals: ['float','melee_attack','random_stroll','look_at_player','random_look','hurt_by_target','nearest_player'],
  targetPlayers: true, texture: 'minecraft:textures/entity/zombie/zombie.png'
});
if (!GF.nativeSystems.isMachine(machine) || !GF.nativeSystems.isMachine(noFuelMachine) || !GF.nativeSystems.isCustomEntity(entity)) throw new Error('Legacy machine/entity component detection failed.');

const machineGraph = GF.blueprint.graphFromComponent(machine);
const entityGraph = GF.blueprint.graphFromComponent(entity);
for (const [label, graph] of [['machine', machineGraph], ['entity', entityGraph]]) {
  const issues = GF.blueprint.validateGraph(graph);
  if (issues.some((issue) => issue.severity === 'error')) throw new Error(`${label} Blueprint validation failed: ${JSON.stringify(issues)}`);
  const compiled = GF.blueprint.compileGraph(graph);
  if (!compiled.system || compiled.system.type !== label) throw new Error(`${label} Blueprint did not compile into native system config.`);
}
const editedMachineGraph = GF.blueprint.normalizeGraph(machineGraph);
const timeNode = editedMachineGraph.nodes.find((node) => node.type === 'action.machine_timing');
timeNode.properties.seconds = 3;
const appliedMachine = GF.blueprint.applyGraphToComponent(machine, editedMachineGraph);
if (appliedMachine.component.spec.processTicks !== 60) throw new Error('Machine Blueprint timing did not compile back into component spec.');
const editedEntityGraph = GF.blueprint.normalizeGraph(entityGraph);
const goalNodes = editedEntityGraph.nodes.filter((node) => node.type === 'action.entity_goal');
if (!goalNodes.length) throw new Error('Entity Blueprint did not expose Goal AI nodes.');
const appliedEntity = GF.blueprint.applyGraphToComponent(entity, editedEntityGraph);
if (!appliedEntity.component.spec.goals.includes('melee_attack')) throw new Error('Entity Blueprint goals did not compile back into component spec.');

const parsedMachine = GF.nativeSystems.parsePrompt('做一个叫量子加工机的机器，用 minecraft:iron_ingot 和 minecraft:coal，输出 minecraft:diamond，3秒完成');
const parsedEntity = GF.nativeSystems.parsePrompt('做一个叫荒原猎手的自定义怪物，生命60，攻击9，速度0.3，近战攻击玩家并且会反击');
if (!GF.nativeSystems.isMachine(parsedMachine) || !GF.nativeSystems.isCustomEntity(parsedEntity)) throw new Error('Native system prompt parser did not create the expected component kinds.');
if (parsedEntity.spec.health !== 60 || parsedEntity.spec.damage !== 9 || !parsedEntity.spec.goals.includes('hurt_by_target')) throw new Error('Custom entity prompt parameters were not preserved.');

const weaponProject = GF.project.create({ name: 'Native Systems Fixture', namespace: 'native_systems_fixture' });
const weapon = GF.generators.parsePrompt('做一把叫守卫之刃的剑，命中亡灵时造成三倍伤害', weaponProject).components[0];
const project = GF.project.create({ name: 'Native Systems Fixture', namespace: 'native_systems_fixture', components: [weapon, appliedMachine.component, noFuelMachine, appliedEntity.component] });
const ir = GF.pipeline.fromLegacyProject(project);
const validation = GF.pipeline.validate(ir);
if (validation.some((issue) => issue.severity === 'error')) throw new Error(`Native system IR validation failed: ${JSON.stringify(validation)}`);
const output = GF.nativeForge.generateFromIR(ir, {
  modId: 'native_systems_fixture', modName: 'Native Systems Fixture',
  packageName: 'com.gameforge.nativesystemsfixture', version: '1.0.0', author: 'GameForge CI'
});
if (!output.report.nativeSystems?.capabilities?.customGui || !output.report.nativeSystems.capabilities.simpleChannel
  || !output.report.nativeSystems.capabilities.blockEntity || !output.report.nativeSystems.capabilities.customEntityType
  || !output.report.nativeSystems.capabilities.basicGoalAi) throw new Error('Native systems capability report is incomplete.');
if (output.report.nativeSystems.machines.length !== 2 || output.report.nativeSystems.entities.length !== 1) throw new Error('Native systems report counts are incorrect.');

const systemOnlyProject = GF.project.create({ name: 'Systems Only', namespace: 'systems_only', components: [machine, entity] });
const systemOnlyOutput = GF.nativeForge.generate(systemOnlyProject, {
  modId: 'systems_only', modName: 'Systems Only', packageName: 'com.gameforge.systemsonly', version: '1.0.0', author: 'GameForge CI'
});
if (!systemOnlyOutput.files.some((entry) => entry.name.endsWith('/SystemEntities.java'))
  || !systemOnlyOutput.files.some((entry) => entry.name.endsWith('/GameForgeMachineBlockEntity.java'))
  || !systemOnlyOutput.files.some((entry) => entry.name.endsWith('/SystemsOnlyMod.java'))) {
  throw new Error('A project containing only native systems did not generate a complete Forge source project.');
}

const byName = new Map(output.files.map((entry) => [entry.name, entry]));
if (byName.size !== output.files.length) throw new Error('Native system generator emitted duplicate file paths.');
const requiredFiles = [
  'systems/machine/GameForgeMachineBlockEntity.java',
  'systems/machine/GameForgeMachineMenu.java',
  'systems/machine/client/GameForgeMachineScreen.java',
  'systems/network/MachineNetwork.java',
  'systems/network/MachineActionPacket.java',
  'systems/network/MachineStatePacket.java',
  'systems/entity/GameForgeCustomMob.java',
  'systems/entity/client/GameForgeCustomMobRenderer.java',
  'systems/registry/SystemEntities.java',
  'gameforge-native-systems-report.json'
];
for (const suffix of requiredFiles) if (![...byName.keys()].some((name) => name.endsWith(suffix))) throw new Error(`Generated native system file missing: ${suffix}`);

function textEnding(suffix) {
  const entry = output.files.find((item) => item.name.endsWith(suffix));
  if (!entry || entry.encoding === 'base64') throw new Error(`Text file missing: ${suffix}`);
  return String(entry.data || '');
}
const blockEntity = textEnding('GameForgeMachineBlockEntity.java');
for (const marker of [
  'ItemStackHandler(3)','saveAdditional','deserializeNBT','ForgeCapabilities.ITEM_HANDLER','serverTick','handleAction',
  'definition().needsFuel() && matches(stack, definition().fuelItem())',
  'boolean processing = machine.active && machine.canProcess()',
  'dirty && level.getGameTime() % 5L == 0L',
  'ResourceLocation.tryParse(id)'
]) if (!blockEntity.includes(marker)) throw new Error(`BlockEntity source missing marker: ${marker}`);
for (const forbidden of [
  'return !definition().needsFuel() || matches(stack, definition().fuelItem())',
  'if (changed || level.getGameTime() % 20L == 0L) machine.sync()'
]) if (blockEntity.includes(forbidden)) throw new Error(`BlockEntity source still contains unsafe/expensive logic: ${forbidden}`);
const menu = textEnding('GameForgeMachineMenu.java');
for (const marker of ['AbstractContainerMenu','SlotItemHandler','addDataSlots','quickMoveStack']) if (!menu.includes(marker)) throw new Error(`Menu source missing marker: ${marker}`);
if (!(menu.indexOf('machine.isInput(stack)') < menu.indexOf('machine.isFuel(stack)'))) throw new Error('Shift-click should prefer a valid input slot before a fuel slot.');
const screen = textEnding('GameForgeMachineScreen.java');
for (const marker of ['AbstractContainerScreen','Button.builder','MachineNetwork.sendAction','scaledProgress']) if (!screen.includes(marker)) throw new Error(`Screen source missing marker: ${marker}`);
const network = textEnding('MachineNetwork.java');
for (const marker of ['SimpleChannel','PLAY_TO_SERVER','PLAY_TO_CLIENT','PacketDistributor.PLAYER','ResourceLocation.tryParse']) if (!network.includes(marker)) throw new Error(`Network source missing marker: ${marker}`);
if (network.includes('new ResourceLocation(')) throw new Error('MachineNetwork still uses a deprecated ResourceLocation constructor.');
const actionPacket = textEnding('MachineActionPacket.java');
for (const marker of ['sender.containerMenu instanceof GameForgeMachineMenu','distanceToSqr','menu.position().equals','packet.action < 0']) if (!actionPacket.includes(marker)) throw new Error(`C2S packet validation missing marker: ${marker}`);
const entitySource = textEnding('GameForgeCustomMob.java');
for (const marker of ['extends Monster','registerGoals','MeleeAttackGoal','HurtByTargetGoal','NearestAttackableTargetGoal','createAttributes','if (definition.boss())','setPersistenceRequired()']) if (!entitySource.includes(marker)) throw new Error(`Entity/Goal AI source missing marker: ${marker}`);
if (entitySource.includes('setCustomNameVisible(definition.boss())')) throw new Error('Normal generated mobs are still permanently named and would not despawn naturally.');
const entitiesRegistry = textEnding('SystemEntities.java');
for (const marker of ['DeferredRegister<EntityType<?>>','EntityType.Builder.of','undead_guard']) if (!entitiesRegistry.includes(marker)) throw new Error(`EntityType registry missing marker: ${marker}`);
if (entitiesRegistry.includes('new ResourceLocation(')) throw new Error('EntityType registry still uses a deprecated ResourceLocation constructor.');
const renderer = textEnding('GameForgeCustomMobRenderer.java');
if (!renderer.includes('ResourceLocation.tryParse')) throw new Error('Entity renderer does not safely parse configured texture IDs.');

const mainPage = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const blueprintPage = fs.readFileSync(path.join(DIST, 'blueprint.html'), 'utf8');
const forgePage = fs.readFileSync(path.join(DIST, 'native-forge.html'), 'utf8');
const systemsPage = fs.readFileSync(path.join(DIST, 'native-systems.html'), 'utf8');
const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
for (const marker of ['native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js','native-systems-entry.js']) if (!mainPage.includes(marker)) throw new Error(`Main page is missing native systems script: ${marker}`);
for (const marker of ['native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js','blueprint-editor.js']) if (!blueprintPage.includes(marker)) throw new Error(`Blueprint page is missing native system integration: ${marker}`);
if (!(blueprintPage.indexOf('native-systems-blueprint.js') < blueprintPage.indexOf('blueprint-editor.js'))) throw new Error('Blueprint native systems extension loads after the editor.');
for (const marker of ['native-systems.js','native-forge-page.js','真正的新 EntityType']) if (!forgePage.includes(marker)) throw new Error(`Native Forge page is missing updated native system support: ${marker}`);
for (const marker of ['BlockEntity','SimpleChannel','EntityType','Goal AI','native-systems-page.js']) if (!systemsPage.includes(marker)) throw new Error(`Native systems studio page missing marker: ${marker}`);
for (const marker of ['native-systems.html','native-systems.js','native-systems-blueprint.js']) if (!sw.includes(marker)) throw new Error(`Service worker missing native systems asset: ${marker}`);
if (!/const CACHE_NAME = 'gameforge-lite-v2\.1\.1-[^']+';/.test(sw)) throw new Error('Service worker cache version is missing or malformed.');

console.log(`Native systems checks passed: ${output.files.length} generated files, machine GUI/network/BlockEntity and custom EntityType/Goal AI verified.`);
