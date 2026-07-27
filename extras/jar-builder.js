'use strict';

(() => {
  const MAX_ZIP_SIZE = 100 * 1024 * 1024;
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

  function findRoot(entries) {
    const packFiles = entries
      .map(({ path }) => path)
      .filter((path) => path === 'datapack/pack.mcmeta' || path.endsWith('/datapack/pack.mcmeta'));
    if (!packFiles.length) return '';
    const selected = packFiles.sort((a, b) => a.length - b.length)[0];
    return selected.slice(0, -'datapack/pack.mcmeta'.length);
  }

  async function readJson(zip, path) {
    const entry = zip.file(path);
    if (!entry) return null;
    try {
      return JSON.parse(await entry.async('string'));
    } catch {
      return null;
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
    const prefix = root;

    const dataPrefix = `${prefix}datapack/data/`;
    const assetsPrefix = `${prefix}resourcepack/assets/`;
    const dataFiles = entries.filter(({ path }) => path.startsWith(dataPrefix));
    const assetFiles = entries.filter(({ path }) => path.startsWith(assetsPrefix));
    const datapackMetaPath = `${prefix}datapack/pack.mcmeta`;
    const resourcepackMetaPath = `${prefix}resourcepack/pack.mcmeta`;

    if (!dataFiles.length && !assetFiles.length) {
      throw new Error('没有找到 datapack/data 或 resourcepack/assets。请上传“下载作品”得到的完整 ZIP。');
    }

    const projectPath = entries.find(({ path }) => path === `${prefix}project.json`)?.path
      || entries.find(({ path }) => path.endsWith('/project.json'))?.path
      || '';
    const project = projectPath ? await readJson(zip, projectPath) : null;
    const datapackMeta = await readJson(zip, datapackMetaPath);
    const resourcepackMeta = await readJson(zip, resourcepackMetaPath);
    const packFormats = [datapackMeta?.pack?.pack_format, resourcepackMeta?.pack?.pack_format]
      .filter((value) => Number.isFinite(Number(value)))
      .map(Number);

    const fallbackName = file.name.replace(/\.zip$/i, '').replace(/[-_]+/g, ' ').trim() || 'GameForge Project';
    const projectName = getProjectName(project, fallbackName);
    const defaultModId = makeModId(slugifyFileName(projectName).replaceAll('-', '_'), `${projectName}:${file.size}`);

    return {
      zip,
      entries,
      root,
      project,
      projectPath,
      dataFiles,
      assetFiles,
      packFormats,
      projectName,
      defaultModId
    };
  }

  function renderAnalysis(result) {
    const warnings = [];
    if (result.packFormats.some((value) => value !== 15)) {
      warnings.push(`检测到 pack_format：${[...new Set(result.packFormats)].join(', ')}；本工具输出目标是 Minecraft 1.20.1。`);
    }
    if (!result.dataFiles.length) warnings.push('没有数据包内容，JAR 只会包含资源包。');
    if (!result.assetFiles.length) warnings.push('没有资源包内容，JAR 只会包含数据包。');

    ui.analysis.hidden = false;
    ui.analysis.innerHTML = `
      <div class="analysis-grid">
        <div><span>项目</span><strong>${escapeHtml(result.projectName)}</strong></div>
        <div><span>数据文件</span><strong>${result.dataFiles.length}</strong></div>
        <div><span>资源文件</span><strong>${result.assetFiles.length}</strong></div>
        <div><span>目标</span><strong>Forge 1.20.1</strong></div>
      </div>
      ${warnings.length ? `<div class="warning-list">${warnings.map((warning) => `<p>⚠ ${escapeHtml(warning)}</p>`).join('')}</div>` : ''}
    `;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function buildModsToml({ modId, projectName, modVersion }) {
    const safeId = makeModId(modId, projectName);
    const safeName = escapeToml(projectName);
    const safeVersion = escapeToml(modVersion || '1.0.0');
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

  async function addFiles(output, files, sourcePrefix, outputPrefix, progress) {
    const seen = new Set();
    for (let index = 0; index < files.length; index += 1) {
      const { entry, path } = files[index];
      const relative = normalizePath(path.slice(sourcePrefix.length));
      if (!relative) continue;
      const target = normalizePath(`${outputPrefix}${relative}`);
      if (seen.has(target)) throw new Error(`输出路径重复：${target}`);
      seen.add(target);
      output.file(target, await entry.async('uint8array'));
      progress(index + 1, files.length);
    }
  }

  async function convertToJar() {
    if (!state.analysis) {
      setStatus('请先选择并读取 ZIP。', 'error');
      return;
    }

    const projectName = ui.projectName.value.trim() || state.analysis.projectName;
    const modId = makeModId(ui.modId.value, `${projectName}:${state.file?.size || 0}`);
    const modVersion = ui.modVersion.value.trim() || '1.0.0';
    ui.modId.value = modId;

    ui.convertButton.disabled = true;
    setStatus('正在组装 Forge JAR…');
    setProgress(20, '准备 JAR');

    try {
      const output = new window.JSZip();
      output.file('META-INF/MANIFEST.MF', 'Manifest-Version: 1.0\r\nCreated-By: GameForge Lite\r\n\r\n');
      output.file('META-INF/mods.toml', buildModsToml({ modId, projectName, modVersion }));

      const totalFiles = state.analysis.dataFiles.length + state.analysis.assetFiles.length;
      let copied = 0;
      const onCopy = () => {
        copied += 1;
        const percent = totalFiles ? 20 + (copied / totalFiles) * 48 : 68;
        setProgress(percent, `复制内容 ${copied}/${totalFiles}`);
      };

      await addFiles(
        output,
        state.analysis.dataFiles,
        `${state.analysis.root}datapack/data/`,
        'data/',
        onCopy
      );
      await addFiles(
        output,
        state.analysis.assetFiles,
        `${state.analysis.root}resourcepack/assets/`,
        'assets/',
        onCopy
      );

      if (state.analysis.projectPath) {
        const projectEntry = state.analysis.zip.file(state.analysis.projectPath);
        if (projectEntry) {
          output.file('META-INF/gameforge/project.json', await projectEntry.async('uint8array'));
        }
      }

      output.file('META-INF/gameforge/README.txt', [
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

      setProgress(72, '压缩 JAR');
      const blob = await output.generateAsync(
        {
          type: 'blob',
          mimeType: 'application/java-archive',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
          platform: 'DOS'
        },
        (metadata) => {
          setProgress(72 + metadata.percent * 0.27, `压缩 ${Math.round(metadata.percent)}%`);
        }
      );

      const fileName = `${slugifyFileName(projectName)}-${modVersion}-forge-1.20.1.jar`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);

      setProgress(100, '完成');
      setStatus(`已生成 ${fileName}。把它放进 PCL 对应实例的 mods 文件夹即可测试。`, 'success');
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
      setStatus('识别成功。点击“转换并下载 JAR”。', 'success');
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

  ui.convertButton.addEventListener('click', convertToJar);
})();
