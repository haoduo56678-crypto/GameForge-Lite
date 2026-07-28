'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'dist', 'native-systems.js');
if (!fs.existsSync(sourcePath)) throw new Error('Missing dist/native-systems.js.');
let source = fs.readFileSync(sourcePath, 'utf8');

function replaceOnce(search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count === 0) {
    if (source.includes(replacement)) return;
    throw new Error(`Native systems API patch could not find ${label}.`);
  }
  if (count !== 1) throw new Error(`Native systems API patch found ${count} copies of ${label}.`);
  source = source.replace(search, replacement);
}

replaceOnce(
  'import net.minecraft.resources.ResourceLocation;\nimport net.minecraft.world.entity.EntityType;',
  'import net.minecraft.world.entity.EntityType;',
  'deprecated EntityType registry ResourceLocation import'
);
replaceOnce(
  'return `    public static final RegistryObject<EntityType<GameForgeCustomMob>> ${entity.id.toUpperCase()} = ENTITIES.register("${entity.id}", () -> EntityType.Builder.of(GameForgeCustomMob::new, MobCategory.MONSTER).sized(${javaFloat(entity.width, 0.6)}, ${javaFloat(entity.height, 1.95)})${fire}.clientTrackingRange(8).updateInterval(3).build(new ResourceLocation(${className}Mod.MOD_ID, "${entity.id}").toString()));`;',
  'return `    public static final RegistryObject<EntityType<GameForgeCustomMob>> ${entity.id.toUpperCase()} = ENTITIES.register("${entity.id}", () -> EntityType.Builder.of(GameForgeCustomMob::new, MobCategory.MONSTER).sized(${javaFloat(entity.width, 0.6)}, ${javaFloat(entity.height, 1.95)})${fire}.clientTrackingRange(8).updateInterval(3).build(${className}Mod.MOD_ID + ":${entity.id}"));`;',
  'EntityType registry ID construction'
);
replaceOnce(
  '  function machineDefinitionJava(packageName) {\n    return `package ${packageName}.systems.machine;\n\nimport net.minecraft.resources.ResourceLocation;\n\npublic record MachineDefinition(',
  '  function machineDefinitionJava(packageName) {\n    return `package ${packageName}.systems.machine;\n\npublic record MachineDefinition(',
  'unused MachineDefinition ResourceLocation import'
);
replaceOnce(
  ') {\n    public ResourceLocation inputId() { return new ResourceLocation(inputItem); }\n    public ResourceLocation fuelId() { return new ResourceLocation(fuelItem); }\n    public ResourceLocation outputId() { return new ResourceLocation(outputItem); }\n    public boolean needsFuel() { return fuelCount > 0 && !fuelItem.equals("minecraft:air"); }\n}',
  ') {\n    public boolean needsFuel() { return fuelCount > 0 && !fuelItem.equals("minecraft:air"); }\n}',
  'unused deprecated MachineDefinition helpers'
);
replaceOnce(
`    public static void serverTick(Level level, BlockPos pos, BlockState state, GameForgeMachineBlockEntity machine) {
        if (level.isClientSide) return;
        boolean changed = false;
        if (machine.active && machine.canProcess()) {
            machine.progress++;
            changed = true;
            if (machine.progress >= machine.definition().processTicks()) {
                machine.completeOperation();
                machine.progress = 0;
            }
        } else if (!machine.canProcess() && machine.progress != 0) {
            machine.progress = 0;
            changed = true;
        }
        if (state.hasProperty(GameForgeMachineBlock.LIT) && state.getValue(GameForgeMachineBlock.LIT) != machine.active) {
            level.setBlock(pos, state.setValue(GameForgeMachineBlock.LIT, machine.active), 3);
            changed = true;
        }
        if (changed || level.getGameTime() % 20L == 0L) machine.sync();
    }`,
`    public static void serverTick(Level level, BlockPos pos, BlockState state, GameForgeMachineBlockEntity machine) {
        if (level.isClientSide) return;
        boolean processing = machine.active && machine.canProcess();
        boolean dirty = false;
        boolean syncNow = false;
        if (processing) {
            machine.progress++;
            dirty = true;
            if (machine.progress >= machine.definition().processTicks()) {
                machine.completeOperation();
                machine.progress = 0;
                syncNow = true;
            }
        } else if (machine.progress != 0) {
            machine.progress = 0;
            dirty = true;
            syncNow = true;
        }
        boolean lit = machine.active && machine.canProcess();
        if (state.hasProperty(GameForgeMachineBlock.LIT) && state.getValue(GameForgeMachineBlock.LIT) != lit) {
            level.setBlock(pos, state.setValue(GameForgeMachineBlock.LIT, lit), 3);
            syncNow = true;
        }
        if (dirty) machine.setChanged();
        if (syncNow || (dirty && level.getGameTime() % 5L == 0L)) machine.sync();
    }`,
  'machine tick synchronization loop'
);
replaceOnce(
`    private Item resolve(String id) {
        return BuiltInRegistries.ITEM.getOptional(new net.minecraft.resources.ResourceLocation(id)).orElse(Items.AIR);
    }`,
`    private Item resolve(String id) {
        net.minecraft.resources.ResourceLocation location = net.minecraft.resources.ResourceLocation.tryParse(id);
        return location == null ? Items.AIR : BuiltInRegistries.ITEM.getOptional(location).orElse(Items.AIR);
    }`,
  'machine item ResourceLocation parsing'
);
replaceOnce(
  '    public boolean isFuel(ItemStack stack) { return !definition().needsFuel() || matches(stack, definition().fuelItem()); }',
  '    public boolean isFuel(ItemStack stack) { return definition().needsFuel() && matches(stack, definition().fuelItem()); }',
  'no-fuel slot validation'
);
replaceOnce(
`        } else if (machine.isFuel(stack)) {
            if (!moveItemStackTo(stack, 1, 2, false)) return ItemStack.EMPTY;
        } else if (machine.isInput(stack)) {
            if (!moveItemStackTo(stack, 0, 1, false)) return ItemStack.EMPTY;`,
`        } else if (machine.isInput(stack)) {
            if (!moveItemStackTo(stack, 0, 1, false)) return ItemStack.EMPTY;
        } else if (machine.isFuel(stack)) {
            if (!moveItemStackTo(stack, 1, 2, false)) return ItemStack.EMPTY;`,
  'shift-click input/fuel priority'
);
replaceOnce(
  'import java.util.Optional;\n\npublic final class MachineNetwork {',
  'import java.util.Objects;\nimport java.util.Optional;\n\npublic final class MachineNetwork {',
  'MachineNetwork Objects import'
);
replaceOnce(
  '    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(new ResourceLocation(${className}Mod.MOD_ID, "machine"), () -> PROTOCOL, PROTOCOL::equals, PROTOCOL::equals);',
  '    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(Objects.requireNonNull(ResourceLocation.tryParse(${className}Mod.MOD_ID + ":machine")), () -> PROTOCOL, PROTOCOL::equals, PROTOCOL::equals);',
  'MachineNetwork channel ResourceLocation'
);
replaceOnce(
`        EntityDefinition definition = definition();
        xpReward = definition.experience();
        setCustomName(Component.literal(definition.name()));
        setCustomNameVisible(definition.boss());`,
`        EntityDefinition definition = definition();
        xpReward = definition.experience();
        if (definition.boss()) {
            setCustomName(Component.literal(definition.name()));
            setCustomNameVisible(true);
            setPersistenceRequired();
        }`,
  'normal custom mob persistence behavior'
);
replaceOnce(
`        ResourceLocation configured = ResourceLocation.tryParse(entity.definition().texture());
        return configured != null ? configured : new ResourceLocation("minecraft", "textures/entity/zombie/zombie.png");`,
`        ResourceLocation configured = ResourceLocation.tryParse(entity.definition().texture());
        return configured != null ? configured : java.util.Objects.requireNonNull(ResourceLocation.tryParse("minecraft:textures/entity/zombie/zombie.png"));`,
  'renderer fallback ResourceLocation'
);

for (const required of [
  'boolean processing = machine.active && machine.canProcess();',
  'dirty && level.getGameTime() % 5L == 0L',
  'definition().needsFuel() && matches(stack, definition().fuelItem())',
  'ResourceLocation.tryParse(${className}Mod.MOD_ID + ":machine")',
  'setPersistenceRequired();',
  '.build(${className}Mod.MOD_ID + ":${entity.id}")',
]) {
  if (!source.includes(required)) throw new Error(`Native systems API patch missing marker: ${required}`);
}
for (const forbidden of [
  'return !definition().needsFuel() || matches(stack, definition().fuelItem())',
  'if (changed || level.getGameTime() % 20L == 0L) machine.sync()',
  'new ResourceLocation(${className}Mod.MOD_ID, "machine")',
  'setCustomNameVisible(definition.boss())',
]) {
  if (source.includes(forbidden)) throw new Error(`Native systems API patch left forbidden source: ${forbidden}`);
}

fs.writeFileSync(sourcePath, source, 'utf8');
execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });
console.log('Patched native systems generator for efficient sync, no-fuel safety, normal mob despawning and non-deprecated resource IDs.');
