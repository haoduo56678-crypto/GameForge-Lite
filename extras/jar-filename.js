'use strict';

(() => {
  const fileInput = document.getElementById('fileInput');
  const jarFileName = document.getElementById('jarFileName');
  const modVersion = document.getElementById('modVersion');
  const status = document.getElementById('status');
  let preferredBaseName = '';
  let preferredFullName = '';

  if (!fileInput || !jarFileName || !modVersion) return;

  function firstText(...values) {
    return values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
  }

  function sanitizeWindowsFileName(value) {
    let name = String(value || '')
      .normalize('NFKC')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, 80);

    if (!name) name = 'GameForge作品';
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) name = `GameForge-${name}`;
    return name;
  }

  function sanitizeVersion(value) {
    return String(value || '')
      .trim()
      .replace(/[^0-9A-Za-z._+-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || '1.0.0';
  }

  function isGenericProjectName(value) {
    const normalized = String(value || '').replace(/\s+/g, '').toLowerCase();
    return !normalized
      || /^(我的第一个作品|未命名作品|新作品|gameforgeproject|myfirstproject|untitledproject)$/.test(normalized);
  }

  function componentName(component) {
    return firstText(
      component?.spec?.name,
      component?.name,
      component?.displayName,
      component?.title,
      component?.spec?.displayName,
      component?.spec?.id,
      component?.id
    );
  }

  function chooseJarBaseName(project, fallback) {
    const components = Array.isArray(project?.components)
      ? project.components.filter((component) => component && typeof component === 'object')
      : [];
    const projectName = firstText(
      project?.name,
      project?.projectName,
      project?.title,
      project?.meta?.name,
      project?.project?.name
    );

    if (components.length === 1) {
      return sanitizeWindowsFileName(componentName(components[0]) || projectName || fallback);
    }

    if (components.length > 1) {
      if (projectName && !isGenericProjectName(projectName)) {
        return sanitizeWindowsFileName(projectName);
      }
      const names = components.map(componentName).filter(Boolean);
      if (names.length === 1) return sanitizeWindowsFileName(names[0]);
      if (names.length > 1) {
        return sanitizeWindowsFileName(`${names.slice(0, 2).join('、')}等${components.length}项`);
      }
    }

    return sanitizeWindowsFileName(projectName || fallback || 'GameForge作品');
  }

  function findProjectJsonPath(zip) {
    const paths = Object.keys(zip.files).filter((path) => !zip.files[path].dir);
    return paths.find((path) => /(^|\/)project\.json$/i.test(path)) || '';
  }

  async function readPreferredName(file) {
    if (!file || !window.JSZip) return;
    try {
      const zip = await window.JSZip.loadAsync(file, { createFolders: false });
      const projectPath = findProjectJsonPath(zip);
      const fallback = file.name.replace(/\.zip$/i, '').replace(/[-_]+/g, ' ').trim();
      let project = null;
      if (projectPath) {
        project = JSON.parse(await zip.file(projectPath).async('string'));
      }
      preferredBaseName = chooseJarBaseName(project, fallback);
      jarFileName.value = preferredBaseName;
      jarFileName.dataset.autoValue = preferredBaseName;
    } catch (error) {
      console.warn('GameForge 无法从 project.json 推导 JAR 文件名。', error);
    }
  }

  function currentBaseName() {
    return sanitizeWindowsFileName(jarFileName.value || preferredBaseName || 'GameForge作品');
  }

  function currentFullName() {
    return `${currentBaseName()}-${sanitizeVersion(modVersion.value)}-forge-1.20.1.jar`;
  }

  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files || [];
    if (file) readPreferredName(file);
  });

  jarFileName.addEventListener('input', () => {
    jarFileName.dataset.autoValue = '';
  });

  document.addEventListener('click', (event) => {
    const anchor = event.target instanceof Element ? event.target.closest('a[download]') : null;
    if (!anchor || !/\.jar$/i.test(anchor.download || '')) return;
    preferredFullName = currentFullName();
    anchor.download = preferredFullName;
  }, true);

  if (status && window.MutationObserver) {
    const observer = new MutationObserver(() => {
      if (!preferredFullName || !/^已生成并验证\s/.test(status.textContent || '')) return;
      status.textContent = status.textContent.replace(/^已生成并验证\s+[^：]+：/, `已生成并验证 ${preferredFullName}：`);
      preferredFullName = '';
    });
    observer.observe(status, { childList: true, characterData: true, subtree: true });
  }
})();
