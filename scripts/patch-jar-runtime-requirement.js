'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const targetPath = path.join(ROOT, 'dist', 'jar-builder.js');
if (!fs.existsSync(targetPath)) throw new Error('Missing dist/jar-builder.js.');
let source = fs.readFileSync(targetPath, 'utf8');

function replaceOnce(search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`ZIP → JAR Runtime patch could not find ${label}.`);
  if (source.indexOf(search, first + search.length) >= 0) throw new Error(`ZIP → JAR Runtime patch found duplicate ${label}.`);
  source = source.replace(search, replacement);
}

if (!source.includes('GameForge Runtime 0.3.0 required')) {
  replaceOnce(
`    const project = projectPath
      ? await readOptionalJson(zip, projectPath, 'project.json')
      : null;
    const datapackMetaPath =`,
`    const project = projectPath
      ? await readOptionalJson(zip, projectPath, 'project.json')
      : null;
    const runtimeRequiredComponents = Array.isArray(project?.components)
      ? project.components
        .filter((component) => component?.type === 'weapon' && component?.spec?.runtimeRequired === true)
        .map((component) => component?.spec?.name || component?.name || component?.spec?.id || component?.id || '高级武器')
      : [];
    const datapackMetaPath =`,
    'project runtime requirement extraction'
  );

  replaceOnce(
`      projectName,
      defaultModId
    };`,
`      projectName,
      defaultModId,
      runtimeRequired: runtimeRequiredComponents.length > 0,
      runtimeRequiredComponents
    };`,
    'analysis return fields'
  );

  replaceOnce(
`    if (!result.assetFiles.length) warnings.push('没有资源包内容，JAR 只会包含数据包。');

    ui.analysis.hidden = false;`,
`    if (!result.assetFiles.length) warnings.push('没有资源包内容，JAR 只会包含数据包。');
    if (result.runtimeRequired) {
      warnings.push(\`检测到 \${result.runtimeRequiredComponents.length} 个精确命中技能（\${result.runtimeRequiredComponents.join('、')}）；必须安装 GameForge Runtime 0.3.0 或更高版本，多人游戏时客户端与服务端版本必须一致。\`);
    }

    ui.analysis.hidden = false;`,
    'analysis runtime warning'
  );

  const buildModsStart = source.indexOf('  function buildModsToml(');
  const buildModsEnd = source.indexOf('  function buildPackMeta(', buildModsStart);
  if (buildModsStart < 0 || buildModsEnd < 0) throw new Error('ZIP → JAR Runtime patch could not locate buildModsToml.');
  const buildModsToml = `  function buildModsToml({ modId, projectName, modVersion, runtimeRequired = false }) {
    const safeId = makeModId(modId, projectName);
    const safeName = escapeToml(projectName);
    const safeVersion = escapeToml(sanitizeVersion(modVersion));
    const runtimeDependency = runtimeRequired ? \`

[[dependencies.\${safeId}]]
modId="gameforge_runtime"
mandatory=true
versionRange="[1.20.1-0.3.0,)"
ordering="AFTER"
side="BOTH"\` : '';
    return \`modLoader="lowcodefml"
loaderVersion="[47,)"
license="MIT"
showAsResourcePack=false

[[mods]]
modId="\${safeId}"
version="\${safeVersion}"
displayName="\${safeName}"
features={java_version="[17,)"}
description='''
Generated locally by GameForge Lite ZIP → JAR.
Contains the project's datapack and resource-pack files as a Forge low-code mod.
'''

[[dependencies.\${safeId}]]
modId="forge"
mandatory=true
versionRange="[47,)"
ordering="NONE"
side="BOTH"

[[dependencies.\${safeId}]]
modId="minecraft"
mandatory=true
versionRange="[1.20.1,1.20.2)"
ordering="NONE"
side="BOTH"\${runtimeDependency}
\`;
  }

`;
  source = source.slice(0, buildModsStart) + buildModsToml + source.slice(buildModsEnd);

  replaceOnce(
`  async function validateGeneratedJar(bytes, expectedModId) {`,
`  async function validateGeneratedJar(bytes, expectedModId, expectedRuntimeRequired = false) {`,
    'JAR validation signature'
  );
  replaceOnce(
`    if (!modsToml.includes('versionRange="[1.20.1,1.20.2)"')) {
      throw new Error('mods.toml 缺少 Minecraft 1.20.1 版本约束。');
    }

    const packMetaText =`,
`    if (!modsToml.includes('versionRange="[1.20.1,1.20.2)"')) {
      throw new Error('mods.toml 缺少 Minecraft 1.20.1 版本约束。');
    }
    const hasRuntimeDependency = /modId\\s*=\\s*"gameforge_runtime"/.test(modsToml)
      && /versionRange\\s*=\\s*"\\[1\\.20\\.1-0\\.3\\.0,\\)"/.test(modsToml);
    if (expectedRuntimeRequired && !hasRuntimeDependency) {
      throw new Error('高级命中技能缺少 GameForge Runtime 0.3.0 依赖声明。');
    }
    if (!expectedRuntimeRequired && hasRuntimeDependency) {
      throw new Error('普通作品不应被错误标记为必须安装 GameForge Runtime。');
    }

    const packMetaText =`,
    'Runtime dependency validation'
  );

  replaceOnce(
`      addText('META-INF/mods.toml', buildModsToml({ modId, projectName, modVersion }));`,
`      addText('META-INF/mods.toml', buildModsToml({ modId, projectName, modVersion, runtimeRequired: state.analysis.runtimeRequired }));`,
    'mods.toml build call'
  );

  replaceOnce(
`        'This packages the original datapack/resource-pack behavior; it does not compile arbitrary Java source.'
      ].join('\\r\\n'));`,
`        'This packages the original datapack/resource-pack behavior; it does not compile arbitrary Java source.',
        state.analysis.runtimeRequired
          ? 'GameForge Runtime 0.3.0 required on both client and server for precise advanced weapon hit mechanics.'
          : 'GameForge Runtime is optional for this project, but recommended for the in-game content browser.'
      ].join('\\r\\n'));`,
    'generated JAR README requirement'
  );

  replaceOnce(
`      const report = await validateGeneratedJar(bytes, modId);`,
`      const report = await validateGeneratedJar(bytes, modId, state.analysis.runtimeRequired);`,
    'JAR validation call'
  );

  source += `\n// GameForge Runtime 0.3.0 required dependency patch installed.\n`;
}

for (const marker of [
  'runtimeRequiredComponents',
  'GameForge Runtime 0.3.0 required',
  'modId="gameforge_runtime"',
  'expectedRuntimeRequired',
  '普通作品不应被错误标记为必须安装 GameForge Runtime',
]) {
  if (!source.includes(marker)) throw new Error(`Patched jar-builder.js is missing marker: ${marker}`);
}

fs.writeFileSync(targetPath, source, 'utf8');
execFileSync(process.execPath, ['--check', targetPath], { stdio: 'inherit' });
console.log('Patched ZIP → JAR with conditional Runtime 0.3.0 dependency and validation.');
