'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const generatorPath = path.join(DIST, 'native-systems.js');
const blueprintPath = path.join(DIST, 'native-systems-blueprint.js');
const pagePath = path.join(DIST, 'native-systems.html');
const pageScriptPath = path.join(DIST, 'native-systems-page.js');
for (const filePath of [generatorPath, blueprintPath, pagePath, pageScriptPath]) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing native entity classification input: ${path.relative(ROOT, filePath)}`);
}

function patchFile(filePath, edits) {
  let source = fs.readFileSync(filePath, 'utf8');
  for (const [search, replacement, label] of edits) {
    const count = source.split(search).length - 1;
    if (count === 0) {
      if (source.includes(replacement)) continue;
      throw new Error(`${path.basename(filePath)} could not find ${label}.`);
    }
    if (count !== 1) throw new Error(`${path.basename(filePath)} found ${count} copies of ${label}.`);
    source = source.replace(search, replacement);
  }
  fs.writeFileSync(filePath, source, 'utf8');
  if (filePath.endsWith('.js')) execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
  return source;
}

const generator = patchFile(generatorPath, [
  [
`  function entityDescriptor(component) {`,
`  function normalizeMobType(value) {
    const raw = String(value || 'undefined').trim().toLowerCase();
    if (['undead', '亡灵', '亡靈', '不死'].includes(raw)) return 'undead';
    if (['arthropod', '节肢', '節肢', 'spider'].includes(raw)) return 'arthropod';
    if (['illager', '灾厄村民', '災厄村民', 'raider'].includes(raw)) return 'illager';
    if (['water', 'aquatic', '水生', '海洋'].includes(raw)) return 'water';
    return 'undefined';
  }

  function inferMobType(text) {
    if (/(?:亡灵|亡靈|不死|undead)/i.test(text)) return 'undead';
    if (/(?:节肢|節肢|蜘蛛|arthropod|spider)/i.test(text)) return 'arthropod';
    if (/(?:灾厄|災厄|掠夺者|掠奪者|illager|raider)/i.test(text)) return 'illager';
    if (/(?:水生|海洋|水下|aquatic|water\s*mob)/i.test(text)) return 'water';
    return 'undefined';
  }

  function entityDescriptor(component) {`,
    'MobType normalizer'
  ],
  [
`      fireImmune: bool(config.fireImmune, false),
      goals: normalizeGoals(config.goals),`,
`      fireImmune: bool(config.fireImmune, false),
      mobType: normalizeMobType(config.mobType || config.classification),
      goals: normalizeGoals(config.goals),`,
    'entity descriptor MobType'
  ],
  [
`      fireImmune: bool(options.fireImmune, false),
      goals: normalizeGoals(options.goals),`,
`      fireImmune: bool(options.fireImmune, false),
      mobType: normalizeMobType(options.mobType || options.classification),
      goals: normalizeGoals(options.goals),`,
    'entity component MobType'
  ],
  [
String.raw`        armor: parseNumber(text, [/(?:护甲|護甲|armor)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i], 2),
        goals,`,
String.raw`        armor: parseNumber(text, [/(?:护甲|護甲|armor)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i], 2),
        mobType: inferMobType(text),
        goals,`,
    'prompt MobType inference'
  ],
  [
`public record EntityDefinition(String id, String name, double health, double attackDamage, double movementSpeed, double armor, double followRange, double knockbackResistance, int experience, String texture, Set<String> goals, boolean targetPlayers, boolean boss) {}`,
`public record EntityDefinition(String id, String name, double health, double attackDamage, double movementSpeed, double armor, double followRange, double knockbackResistance, int experience, String mobType, String texture, Set<String> goals, boolean targetPlayers, boolean boss) {}`,
    'EntityDefinition MobType field'
  ],
  [
'${entity.experience}, "${javaString(entity.texture)}", Set.of(${entity.goals.map((goal) => `"${goal}"`).join(\', \')}), ${entity.targetPlayers}, ${entity.boss}))',
'${entity.experience}, "${entity.mobType}", "${javaString(entity.texture)}", Set.of(${entity.goals.map((goal) => `"${goal}"`).join(\', \')}), ${entity.targetPlayers}, ${entity.boss}))',
    'EntityDefinitions MobType value'
  ],
  [
`import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;`,
`import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;`,
    'MobType Java import'
  ],
  [
`    public EntityDefinition definition() { return EntityDefinitions.get(definitionId()); }
    @Override protected void registerGoals() {`,
`    public EntityDefinition definition() { return EntityDefinitions.get(definitionId()); }
    @Override public MobType getMobType() {
        return switch (definition().mobType()) {
            case "undead" -> MobType.UNDEAD;
            case "arthropod" -> MobType.ARTHROPOD;
            case "illager" -> MobType.ILLAGER;
            case "water" -> MobType.WATER;
            default -> MobType.UNDEFINED;
        };
    }
    @Override protected void registerGoals() {`,
    'custom entity MobType override'
  ],
  [
`entities: entities.map((entity) => ({ id: entity.id, name: entity.name, health: entity.health, damage: entity.attackDamage, goals: entity.goals, targetPlayers: entity.targetPlayers })),`,
`entities: entities.map((entity) => ({ id: entity.id, name: entity.name, health: entity.health, damage: entity.attackDamage, mobType: entity.mobType, goals: entity.goals, targetPlayers: entity.targetPlayers })),`,
    'native systems report MobType'
  ],
  [
`    entityDescriptor,
    validate: validateSystems,`,
`    entityDescriptor,
    normalizeMobType,
    inferMobType,
    validate: validateSystems,`,
    'export MobType helpers'
  ]
]);

const blueprint = patchFile(blueprintPath, [
  [
`        { id: 'armor', type: 'number', label: '护甲', default: 2, min: 0, max: 100, step: 0.5 }
      ]`,
`        { id: 'armor', type: 'number', label: '护甲', default: 2, min: 0, max: 100, step: 0.5 },
        { id: 'mobType', type: 'select', label: '生物分类', default: 'undefined', options: [['undefined', '普通／未分类'], ['undead', '亡灵'], ['arthropod', '节肢'], ['illager', '灾厄村民'], ['water', '水生']] }
      ]`,
    'Blueprint entity MobType field'
  ],
  [
`if (node.type === 'action.entity_attributes') Object.assign(config, { health: Number(p.health || 30), damage: Number(p.damage || 6), speed: Number(p.speed || 0.28), armor: Number(p.armor || 2) });`,
`if (node.type === 'action.entity_attributes') Object.assign(config, { health: Number(p.health || 30), damage: Number(p.damage || 6), speed: Number(p.speed || 0.28), armor: Number(p.armor || 2), mobType: Systems.normalizeMobType(p.mobType) });`,
    'Blueprint MobType compilation'
  ],
  [
`['action.entity_attributes', { health: config.health, damage: config.damage, speed: config.speed, armor: config.armor }],`,
`['action.entity_attributes', { health: config.health, damage: config.damage, speed: config.speed, armor: config.armor, mobType: Systems.normalizeMobType(config.mobType) }],`,
    'Blueprint MobType round trip'
  ]
]);

const page = patchFile(pagePath, [
  [
`            <div class="ns-row"><label class="ns-field"><span>纹理资源</span><input id="entityTexture" value="minecraft:textures/entity/zombie/zombie.png" spellcheck="false"></label><label class="ns-field"><span>经验值</span><input id="entityExperience" type="number" value="10" min="0"></label></div>`,
`            <div class="ns-row"><label class="ns-field"><span>纹理资源</span><input id="entityTexture" value="minecraft:textures/entity/zombie/zombie.png" spellcheck="false"></label><label class="ns-field"><span>经验值</span><input id="entityExperience" type="number" value="10" min="0"></label></div>
            <div class="ns-row"><label class="ns-field"><span>生物分类</span><select id="entityMobType"><option value="undefined">普通／未分类</option><option value="undead">亡灵</option><option value="arthropod">节肢</option><option value="illager">灾厄村民</option><option value="water">水生</option></select></label><div class="ns-status">分类会写入 <code>MobType</code>，影响亡灵杀手、节肢杀手、治疗／伤害药水和 GameForge 目标条件。</div></div>`,
    'entity MobType form selector'
  ]
]);

const pageScript = patchFile(pageScriptPath, [
  [
`        : \`HP \${component.spec.health || 30} · ATK \${component.spec.damage || 6} · \${(component.spec.goals || []).length} Goals\`;`,
`        : \`HP \${component.spec.health || 30} · ATK \${component.spec.damage || 6} · \${Systems.normalizeMobType(component.spec.mobType)} · \${(component.spec.goals || []).length} Goals\`;`,
    'component list MobType summary'
  ],
  [
`    $('entityExperience').value = spec.experience || 10;
    $('entityTargetPlayers').checked = spec.targetPlayers !== false;`,
`    $('entityExperience').value = spec.experience || 10;
    $('entityMobType').value = Systems.normalizeMobType(spec.mobType);
    $('entityTargetPlayers').checked = spec.targetPlayers !== false;`,
    'fill entity MobType'
  ],
  [
`      speed: number('entitySpeed', 0.28), armor: number('entityArmor', 2), texture: value('entityTexture'), experience: number('entityExperience', 10),
      goals, targetPlayers: $('entityTargetPlayers').checked, fireImmune: $('entityFireImmune').checked, boss: $('entityBoss').checked`,
`      speed: number('entitySpeed', 0.28), armor: number('entityArmor', 2), texture: value('entityTexture'), experience: number('entityExperience', 10),
      mobType: $('entityMobType').value, goals, targetPlayers: $('entityTargetPlayers').checked, fireImmune: $('entityFireImmune').checked, boss: $('entityBoss').checked`,
    'save entity MobType'
  ]
]);

for (const [label, source, markers] of [
  ['generator', generator, ['normalizeMobType', 'MobType.UNDEAD', 'MobType.ARTHROPOD', 'MobType.ILLAGER', 'MobType.WATER', 'mobType: entity.mobType']],
  ['blueprint', blueprint, ['生物分类', 'Systems.normalizeMobType(p.mobType)', 'mobType: Systems.normalizeMobType(config.mobType)']],
  ['page', page, ['id="entityMobType"', '影响亡灵杀手']],
  ['page script', pageScript, ["$('entityMobType').value", "mobType: $('entityMobType').value"]]
]) {
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`Native entity ${label} is missing classification marker: ${marker}`);
}

console.log('Added Minecraft MobType classification to custom EntityType generation, Blueprint and the native systems studio.');
