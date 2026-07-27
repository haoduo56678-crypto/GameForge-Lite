'use strict';

(() => {
  const MAX_ZIP_SIZE = 100 * 1024 * 1024;
  const TARGET_PACK_FORMAT = 15;
  const REQUIRED_JAR_FILES = [
    'META-INF/MANIFEST.MF',
    'META-INF/mods.toml',
    'pack.mcmeta'
  ];

  const state = {
    file: null,
    zip: null,
    root: '',
    project: null,
    analysis: null
  };

  const ui = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    fileName: document.getElementById('fileName'),
    status: document.getElementById('status'),
    analysis: document.getElementById('analysis'),
    projectName: document.getElementById('projectName'),
    modId: document.getElementById('modId'),
    modVersion: document.getElementById('modVersion'),
    convertButton: document.getElementById('convertButton'),
    progress: document.getElementById('progress'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText')
  };

  function normalizePath(value) {
    const normalized = String(value || '')
      .replaceAll('\\', '/')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.some((part) => part === '..' || part.includes('\0'))) {
      throw new Error(`ZIP 中含有不安全路径：${value}`);
    }
    return parts.join('/');
  }

  function escapeToml(value) {
    return String(value || '')
      .replaceAll('\\', '\\\\')
      .replaceAll('"', '\\"')
      .replaceAll('\r', ' ')
      .replaceAll('\n', ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
  }

  function slugifyFileName(value) {
    const slug = String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || `gameforge-${fnv1a(String(value || Date.now()))}`;
  }

  function sanitizeVersion(value) {
    const version = String(value || '')
      .trim()
      .replace(/[^0-9A-Za-z._+-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    return version || '1.0.0';
  }

  function makeModId(value, seed) {
    let id = String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!id || !/^[a-z]/.test(id)) id = `gf_${id}`;
    if (id.length < 2) id = `gf_${fnv1a(seed)}`;
    if (id.length > 63) id = id.slice(0, 63).replace(/_+$/g, '');
    return id;
  }

  function getProjectName(project, fallback) {
    const candidates = [
      project?.name,
      project?.projectName,
      project?.title,
      project?.meta?.name,
      project?.project?.name
    ];
    return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || fallback;
  }

  function setStatus(message, type = 'info') {
    ui.status.textContent = message;
    ui.status.dataset.type = type;
  }

  function setProgress(percent, message) {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    ui.progress.hidden = false;
    ui.progressBar.style.width = `${safePercent}%`;
    ui.progressText.textContent = message || `${safePercent}%`;
  }

  function resetProgress() {
    ui.progress.hidden = true;
    ui.progressBar.style.width = '0%';
    ui.progressText.textContent = '';
  }

  function getFileEntries(zip) {
    return Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map((entry) => ({ entry, path: normalizePath(entry.name) }))
      .filter(({ path }) => path);
  }

  function prefixBeforeMarker(path, marker) {
    if (path === marker) return '';
    if (path.endsWith(`/${marker}`)) return path.slice(0, -(marker.length));
    return null;
  }

  function findRoot(entries) {
    const exactMarkers = [
      'datapack/pack.mcmeta',
      'resourcepack/pack.mcmeta',
      'project.json'
    ];
    const candidates = [];

    for (const { path } of entries) {
      for (const marker of exactMarkers) {
        const prefix = prefixBeforeMarker(path, marker);
        if (prefix !== null) candidates.push(prefix);
      }
    }

    if (!candidates.length) {
      for (const { path } of entries) {
        for (const marker of ['datapack/data/', 'resourcepack/assets/']) {
          const index = path.indexOf(marker);
          if (index >= 0) candidates.push(path.slice(0, index));
        }
      }
    }

    return candidates.sort((a, b) => a.length - b.length)[0] || '';
  }

  async function readOptionalJson(zip, path, label) {
    const entry = zip.file(path);
    if (!entry) return null;
    const text = await entry.async('string');
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`${label} 不是合法 JSON：${path}`);
    }
  }

  async function analyzeZip(file) {
    if (!window.JSZip) throw new Error('ZIP 组件没有加载，请刷新页面后重试。');
    if (!file) throw new Error('请先选择 ZIP 文件。');
    if (!/\.zip$/i.test(file.name)) throw new Error('请选择 GameForge 生成的 .zip 文件。');
    if (file.size > MAX_ZIP_SIZE) throw new Error('ZIP 超过 100 MB，浏览器本地转换可能会占用过多内存。');

    setStatus('正在读取 ZIP…');
    setProgress(8, '读取 ZIP');

    const zip = await window.JSZip.loadAsync(file, { createFolders: false });
    const entries = getFileEntries(zip);
    const root = findRoot(entries);
    const dataPrefix = `${root}datapack/data/`;
    const assetsPrefix = `${root}resourcepack/assets/`;
    const dataFiles = entries.filter(({ path }) => path.startsWith(dataPrefix));
    const assetFiles = entries.filter(({ path }) => path.startsWith(assetsPrefix));

    if (!dataFiles.length && !assetFiles.length) {
      throw new Error('没有找到 datapack/data 或 resourcepack/assets。请上传“下载作品”得到的完整 ZIP。');
    }

    const projectPath = entries.find(({ path }) => path === `${root}project.json`)?.path
      || entries.find(({ path }) => path.endsWith('/project.json'))?.path
      || '';
    const project = projectPath
      ? await readOptionalJson(zip, projectPath, 'project.json')
      : null;
    const datapackMetaPath = `${root}datapack/pack.mcmeta`;
    const resourcepackMetaPath = `${root}resourcepack/pack.mcmeta`;
    const datapackMeta = await readOptionalJson(zip, datapackMetaPath, '数据包 pack.mcmeta');
    const resourcepackMeta = await readOptionalJson(zip, resourcepackMetaPath, '资源包 pack.mcmeta');
    const packFormats = [datapackMeta?.pack?.pack_format, resourcepackMeta?.pack?.pack_format]
      .filter((value) => Number.isFinite(Number(value)))
      .map(Number);

    const fallbackName = file.name.replace(/\.zip$/i, '').replace(/[-_]+/g, ' ').trim() || 'GameForge Project';
    const projectName = getProjectName(project, fallbackName);
    const defaultModId = makeModId(
      slugifyFileName(projectName).replaceAll('-', '_'),
      `${projectName}:${file.size}`
    );

    return {
      zip,
      entries,
      root,
      project,
      projectPath,
      dataFiles,
      assetFiles,
      packFormats,
      hasDatapackMeta: Boolean(datapackMeta),
      hasResourcepackMeta: Boolean(resourcepackMeta),
      projectName,
      defaultModId
    };
  }

  function renderAnalysis(result) {
    const warnings = [];
    if (!result.hasDatapackMeta) warnings.push('源 ZIP 缺少数据包 pack.mcmeta；转换时会自动补全 JAR 根目录元数据。');
    if (!result.hasResourcepackMeta) warnings.push('源 ZIP 缺少资源包 pack.mcmeta；转换时会自动补全 JAR 根目录元数据。');
    if (result.packFormats.some((value) => value !== TARGET_PACK_FORMAT)) {
      warnings.push(`检测到 pack_format：${[...new Set(result.packFormats)].join(', ')}；输出会固定为 Minecraft 1.20.1 所需的 ${TARGET_PACK_FORMAT}。`);
    }
    if (!result.dataFiles.length) warnings.push('没有数据包内容，JAR 只会包含资源包。');
    if (!result.assetFiles.length) warnings.push('没有资源包内容，JAR 只会包含数据包。');

    ui.analysis.hidden = false;
    ui.analysis.innerHTML = `
      <div class="analysis-grid">
        <div><span>项目</span><strong>${escapeHtml(result.projectName)}</strong></div>
        <div><span>数据文件</span><strong>${result.dataFiles.length}</strong></div>
        <div><span>资源文件</span><strong>${result.assetFiles.length}</strong></div>
        <div><span>目标</span><strong>Forge 1.20.1 · 自动校验</strong></div>
      </div>
      ${warnings.length ? `<div class="warning-list">${warnings.map((warning) => `<p>⚠ ${escapeHtml(warning)}</p>`).join('')}</div>` : ''}
    `;
  }

  function buildModsToml({ modId, projectName, modVersion }) {
    const safeId = makeModId(modId, projectName);
    const safeName = escapeToml(projectName);
    const safeVersion = escapeToml(sanitizeVersion(modVersion));
    return `modLoader="lowcodefml"
loaderVersion="[47,)"
license="MIT"
showAsResourcePack=false

[[mods]]
modId="${safeId}"
version="${safeVersion}"
displayName="${safeName}"
features={java_version="[17,)"}
description='''
Generated locally by GameForge Lite ZIP → JAR.
Contains the project's datapack and resource-pack files as a Forge low-code mod.
'''

[[dependencies.${safeId}]]
modId="forge"
mandatory=true
versionRange="[47,)"
ordering="NONE"
side="BOTH"

[[dependencies.${safeId}]]
modId="minecraft"
mandatory=true
versionRange="[1.20.1,1.20.2)"
ordering="NONE"
side="BOTH"
`;
  }

  function buildPackMeta(projectName) {
    return `${JSON.stringify({
      pack: {
        pack_format: TARGET_PACK_FORMAT,
        description: `${projectName} · GameForge Lite Forge 1.20.1`
      }
    }, null, 2)}\n`;
  }

  function buildManifest() {
    return [
      'Manifest-Version: 1.0',
      'Created-By: GameForge Lite',
      'Implementation-Title: GameForge Generated Low-Code Mod',
      '',
      ''
    ].join('\r\n');
  }

  async function addFiles(output, files, sourcePrefix, outputPrefix, outputPaths, onProgress) {
    for (const { entry, path } of files) {
      const relative = normalizePath(path.slice(sourcePrefix.length));
      if (!relative) continue;
      const target = normalizePath(`${outputPrefix}${relative}`);

      if (target !== target.toLowerCase()) {
        throw new Error(`Minecraft 资源路径必须使用小写：${target}`);
      }
      if (outputPaths.has(target)) throw new Error(`输出路径重复：${target}`);
      outputPaths.add(target);

      if (/\.(json|mcmeta)$/i.test(target)) {
        const text = await entry.async('string');
        try {
          JSON.parse(text);
        } catch (error) {
          throw new Error(`生成内容中存在无效 JSON：${target}`);
        }
        output.file(target, text);
      } else {
        output.file(target, await entry.async('uint8array'));
      }
      onProgress();
    }
  }

  function isPng(bytes) {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }

  async function validateGeneratedJar(bytes, expectedModId) {
    const jar = await window.JSZip.loadAsync(bytes, { createFolders: false });
    const entries = getFileEntries(jar);
    const paths = new Set(entries.map(({ path }) => path));

    for (const required of REQUIRED_JAR_FILES) {
      if (!paths.has(required)) throw new Error(`JAR 缺少必要文件：${required}`);
    }
    if ([...paths].some((path) => path.startsWith('datapack/') || path.startsWith('resourcepack/'))) {
      throw new Error('JAR 内仍有 datapack/ 或 resourcepack/ 外层目录，结构没有正确扁平化。');
    }

    const dataPaths = [...paths].filter((path) => path.startsWith('data/'));
    const assetPaths = [...paths].filter((path) => path.startsWith('assets/'));
    if (!dataPaths.length && !assetPaths.length) throw new Error('JAR 内没有 data/ 或 assets/ 内容。');

    const manifest = await jar.file('META-INF/MANIFEST.MF').async('string');
    if (!/^Manifest-Version: 1\.0\r?$/m.test(manifest)) {
      throw new Error('META-INF/MANIFEST.MF 缺少有效的 Manifest-Version。');
    }

    const modsToml = await jar.file('META-INF/mods.toml').async('string');
    if (!/modLoader\s*=\s*"lowcodefml"/.test(modsToml)) {
      throw new Error('mods.toml 未使用 lowcodefml。');
    }
    if (!modsToml.includes(`modId="${expectedModId}"`)) {
      throw new Error('mods.toml 中的 Mod ID 与输出信息不一致。');
    }
    if (!modsToml.includes('versionRange="[1.20.1,1.20.2)"')) {
      throw new Error('mods.toml 缺少 Minecraft 1.20.1 版本约束。');
    }

    const packMetaText = await jar.file('pack.mcmeta').async('string');
    let packMeta;
    try {
      packMeta = JSON.parse(packMetaText);
    } catch (error) {
      throw new Error('JAR 根目录 pack.mcmeta 不是合法 JSON。');
    }
    if (Number(packMeta?.pack?.pack_format) !== TARGET_PACK_FORMAT) {
      throw new Error(`JAR 根目录 pack.mcmeta 的 pack_format 必须为 ${TARGET_PACK_FORMAT}。`);
    }
    if (!packMeta?.pack?.description) {
      throw new Error('JAR 根目录 pack.mcmeta 缺少 description。');
    }

    let jsonCount = 1;
    let pngCount = 0;
    for (const { entry, path } of entries) {
      if (path === 'pack.mcmeta') continue;
      if (/\.json$/i.test(path)) {
        const text = await entry.async('string');
        try {
          JSON.parse(text);
        } catch (error) {
          throw new Error(`JAR 内存在无效 JSON：${path}`);
        }
        jsonCount += 1;
      } else if (/\.png$/i.test(path)) {
        const image = await entry.async('uint8array');
        if (!isPng(image)) throw new Error(`JAR 内 PNG 文件损坏或格式不符：${path}`);
        pngCount += 1;
      }
    }

    return {
      fileCount: entries.length,
      dataCount: dataPaths.length,
      assetCount: assetPaths.length,
      jsonCount,
      pngCount
    };
  }

  async function convertToJar() {
    if (!state.analysis) {
      setStatus('请先选择并读取 ZIP。', 'error');
      return;
    }

    const projectName = ui.projectName.value.trim() || state.analysis.projectName;
    const modId = makeModId(ui.modId.value, `${projectName}:${state.file?.size || 0}`);
    const modVersion = sanitizeVersion(ui.modVersion.value);
    ui.modId.value = modId;
    ui.modVersion.value = modVersion;
    ui.convertButton.disabled = true;
    setStatus('正在组装并检查 Forge JAR…');
    setProgress(16, '补全 JAR 元数据');

    try {
      const output = new window.JSZip();
      const outputPaths = new Set();
      const addText = (path, content) => {
        if (outputPaths.has(path)) throw new Error(`输出路径重复：${path}`);
        outputPaths.add(path);
        output.file(path, content);
      };

      addText('META-INF/MANIFEST.MF', buildManifest());
      addText('META-INF/mods.toml', buildModsToml({ modId, projectName, modVersion }));
      addText('pack.mcmeta', buildPackMeta(projectName));

      const totalFiles = state.analysis.dataFiles.length + state.analysis.assetFiles.length;
      let copied = 0;
      const onCopy = () => {
        copied += 1;
        const percent = totalFiles ? 20 + (copied / totalFiles) * 45 : 65;
        setProgress(percent, `检查并复制内容 ${copied}/${totalFiles}`);
      };

      await addFiles(
        output,
        state.analysis.dataFiles,
        `${state.analysis.root}datapack/data/`,
        'data/',
        outputPaths,
        onCopy
      );
      await addFiles(
        output,
        state.analysis.assetFiles,
        `${state.analysis.root}resourcepack/assets/`,
        'assets/',
        outputPaths,
        onCopy
      );

      if (state.analysis.projectPath) {
        const projectEntry = state.analysis.zip.file(state.analysis.projectPath);
        if (projectEntry) {
          addText('META-INF/gameforge/project.json', await projectEntry.async('string'));
        }
      }

      addText('META-INF/gameforge/README.txt', [
        'GameForge Lite generated low-code Forge mod',
        '',
        'Minecraft: 1.20.1',
        'Forge: 47.x',
        `Mod ID: ${modId}`,
        `Project: ${projectName}`,
        '',
        'Install this JAR in the instance mods folder.',
        'For multiplayer, install it on the server and on clients that need its assets.',
        'This packages the original datapack/resource-pack behavior; it does not compile arbitrary Java source.'
      ].join('\r\n'));

      setProgress(70, '压缩 JAR');
      const bytes = await output.generateAsync(
        {
          type: 'uint8array',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
          platform: 'DOS'
        },
        (metadata) => {
          setProgress(70 + metadata.percent * 0.2, `压缩 ${Math.round(metadata.percent)}%`);
        }
      );

      setProgress(92, '重新打开并验证 JAR');
      const report = await validateGeneratedJar(bytes, modId);
      const blob = new Blob([bytes], { type: 'application/java-archive' });
      const fileName = `${slugifyFileName(projectName)}-${modVersion}-forge-1.20.1.jar`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);

      setProgress(100, '结构验证通过');
      setStatus(
        `已生成并验证 ${fileName}：${report.fileCount} 个文件，data ${report.dataCount}，assets ${report.assetCount}，JSON ${report.jsonCount}，PNG ${report.pngCount}。`,
        'success'
      );
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : '转换失败。', 'error');
      resetProgress();
    } finally {
      ui.convertButton.disabled = false;
    }
  }

  async function acceptFile(file) {
    state.file = null;
    state.zip = null;
    state.analysis = null;
    ui.analysis.hidden = true;
    ui.convertButton.disabled = true;
    resetProgress();

    try {
      const result = await analyzeZip(file);
      state.file = file;
      state.zip = result.zip;
      state.root = result.root;
      state.project = result.project;
      state.analysis = result;
      ui.fileName.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      ui.projectName.value = result.projectName;
      ui.modId.value = result.defaultModId;
      renderAnalysis(result);
      ui.convertButton.disabled = false;
      setProgress(100, '读取完成');
      window.setTimeout(resetProgress, 700);
      setStatus('识别成功。转换时会补全 pack.mcmeta，并在下载前重新验证 JAR。', 'success');
    } catch (error) {
      console.error(error);
      ui.fileName.textContent = '尚未选择有效文件';
      setStatus(error instanceof Error ? error.message : '读取 ZIP 失败。', 'error');
      resetProgress();
    }
  }

  ui.fileInput.addEventListener('change', () => {
    const [file] = ui.fileInput.files || [];
    if (file) acceptFile(file);
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    ui.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      ui.dropZone.classList.add('dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    ui.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      ui.dropZone.classList.remove('dragging');
    });
  });

  ui.dropZone.addEventListener('drop', (event) => {
    const [file] = event.dataTransfer?.files || [];
    if (file) acceptFile(file);
  });

  ui.dropZone.addEventListener('click', (event) => {
    if (event.target !== ui.fileInput) ui.fileInput.click();
  });

  ui.dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      ui.fileInput.click();
    }
  });

  ui.modId.addEventListener('blur', () => {
    ui.modId.value = makeModId(ui.modId.value, ui.projectName.value || 'gameforge');
  });
  ui.modVersion.addEventListener('blur', () => {
    ui.modVersion.value = sanitizeVersion(ui.modVersion.value);
  });
  ui.convertButton.addEventListener('click', convertToJar);
})();
