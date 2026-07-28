(function () {
  'use strict';

  const GF = window.GameForge = window.GameForge || {};
  GF.VERSION = '2.1.1';
  GF.MINECRAFT_VERSION = '1.20.1';
  GF.PACK_FORMAT = 15;
  GF.FORGE_VERSION = '47.4.10';
  GF.SCHEMA_VERSION = 2;

  const memoryStorage = new Map();

  const hasLocalStorage = (() => {
    try {
      const key = '__gf_test__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  })();

  function storageGet(key) {
    if (hasLocalStorage) return localStorage.getItem(key);
    return memoryStorage.has(key) ? memoryStorage.get(key) : null;
  }
  function storageSet(key, value) {
    if (hasLocalStorage) localStorage.setItem(key, value);
    else memoryStorage.set(key, value);
  }
  function storageRemove(key) {
    if (hasLocalStorage) localStorage.removeItem(key);
    else memoryStorage.delete(key);
  }

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const nowIso = () => new Date().toISOString();
  const pretty = (value) => JSON.stringify(value, null, 2);
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function uid(prefix = 'id') {
    const random = (crypto && crypto.getRandomValues)
      ? Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('')
      : Math.random().toString(16).slice(2, 14);
    return `${prefix}_${Date.now().toString(36)}_${random}`;
  }

  function cleanId(value, fallback = 'custom_content') {
    const result = String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_\-.]+|[_\-.]+$/g, '');
    return result || fallback;
  }

  function cleanPath(value, fallback = 'main') {
    const result = String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/\\/g, '/')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_./-]/g, '_')
      .replace(/\/{2,}/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .map((part) => cleanId(part, 'part'))
      .join('/');
    return result || fallback;
  }

  function cleanNamespace(value, fallback = 'gameforge') {
    return cleanId(value, fallback).replace(/\./g, '_');
  }

  function ensureMinecraftId(value, fallback = 'minecraft:stone') {
    const raw = String(value || fallback).trim().toLowerCase();
    const parts = raw.includes(':') ? raw.split(':', 2) : ['minecraft', raw];
    return `${cleanNamespace(parts[0], 'minecraft')}:${cleanPath(parts[1], 'stone')}`;
  }

  function sanitizePackage(value, fallback = 'com.gameforge.generated') {
    const parts = String(value || fallback)
      .trim()
      .toLowerCase()
      .split('.')
      .map((part) => part.replace(/[^a-z0-9_]/g, '_').replace(/^[0-9]+/, ''))
      .filter(Boolean);
    return parts.length >= 2 ? parts.join('.') : fallback;
  }

  function toClassName(value, fallback = 'GeneratedMod') {
    const cleaned = String(value || fallback).replace(/[^a-zA-Z0-9]+/g, ' ').trim();
    const joined = cleaned.split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const safe = joined.replace(/^[0-9]+/, '');
    return safe || fallback;
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function objectiveName(seed, prefix = 'gf') {
    const safePrefix = cleanId(prefix, 'gf').replace(/[^a-z0-9_]/g, '').slice(0, 5);
    return `${safePrefix}_${hashString(seed)}`.slice(0, 16);
  }

  function uuidInts(seed) {
    const values = [];
    for (let i = 0; i < 4; i += 1) {
      const fragment = parseInt(hashString(`${seed}:${i}`).slice(0, 7), 36) || (i + 1);
      values.push((fragment | 0));
    }
    return values;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function snbtSingle(value) {
    return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }

  function stripLeadingSlash(command) {
    return String(command || '').trim().replace(/^\/+/, '');
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  function debounce(fn, wait = 200) {
    let timer;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch (_) {
      return iso || '';
    }
  }

  function humanBytes(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  function parseNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function safeJsonParse(text, fallback = null) {
    try { return JSON.parse(text); } catch (_) { return fallback; }
  }

  function getNested(object, path, fallback) {
    const parts = String(path).split('.');
    let cursor = object;
    for (const part of parts) {
      if (cursor == null || !(part in cursor)) return fallback;
      cursor = cursor[part];
    }
    return cursor;
  }

  GF.utils = {
    $, $$, clamp, nowIso, pretty, deepClone, sleep, uid, cleanId, cleanPath, cleanNamespace,
    ensureMinecraftId, sanitizePackage, toClassName, hashString, objectiveName, uuidInts,
    escapeHtml, snbtSingle, stripLeadingSlash, unique, debounce, formatDate, humanBytes,
    parseNumber, safeJsonParse, getNested
  };

  // ---------- Base64 / file helpers ----------
  function bytesToBase64(bytes) {
    const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < array.length; i += chunk) {
      binary += String.fromCharCode.apply(null, array.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64ToBytes(base64) {
    const binary = atob(String(base64 || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function dataUrlBase64(dataUrl) {
    const match = String(dataUrl || '').match(/^data:[^;]+;base64,(.*)$/);
    return match ? match[1] : '';
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(dataUrlBase64(reader.result));
      reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });
  }

  GF.binary = { bytesToBase64, base64ToBytes, dataUrlBase64, readFileAsBase64 };

  // ---------- Tiny ZIP writer (store method, no dependency) ----------
  let crcTable;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  const u16 = (n) => [n & 255, (n >>> 8) & 255];
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
  }

  function normalizeZipData(file, encoder) {
    if (file.encoding === 'base64') return base64ToBytes(file.data);
    if (file.data instanceof Uint8Array) return file.data;
    if (file.data instanceof ArrayBuffer) return new Uint8Array(file.data);
    return encoder.encode(String(file.data ?? ''));
  }

  function makeZip(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    const { time, day } = dosDateTime();
    const normalizedFiles = files
      .filter((file) => file && file.name && !String(file.name).endsWith('/'))
      .map((file) => ({ ...file, name: String(file.name).replace(/^\/+/, '').replace(/\\/g, '/') }));

    for (const file of normalizedFiles) {
      if (file.name.includes('../')) throw new Error(`不安全的 ZIP 路径：${file.name}`);
      const name = encoder.encode(file.name);
      const data = normalizeZipData(file, encoder);
      const crc = crc32(data);
      const flags = 0x0800; // UTF-8 names
      const localHeader = new Uint8Array([
        0x50, 0x4B, 0x03, 0x04,
        ...u16(20), ...u16(flags), ...u16(0), ...u16(time), ...u16(day),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name
      ]);
      chunks.push(localHeader, data);

      const centralHeader = new Uint8Array([
        0x50, 0x4B, 0x01, 0x02,
        ...u16(20), ...u16(20), ...u16(flags), ...u16(0), ...u16(time), ...u16(day),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
        ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name
      ]);
      central.push(centralHeader);
      offset += localHeader.length + data.length;
    }

    const centralSize = central.reduce((total, item) => total + item.length, 0);
    const end = new Uint8Array([
      0x50, 0x4B, 0x05, 0x06,
      ...u16(0), ...u16(0), ...u16(normalizedFiles.length), ...u16(normalizedFiles.length),
      ...u32(centralSize), ...u32(offset), ...u16(0)
    ]);
    return new Blob([...chunks, ...central, end], { type: 'application/zip' });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function blobToBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
  }

  GF.zip = { makeZip, downloadBlob, blobToBytes, crc32 };

  // ---------- Pixel texture generator ----------
  function hexToRgb(hex) {
    const clean = String(hex || '#62d990').replace('#', '').trim();
    const normalized = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
    const value = parseInt(normalized, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }
  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
  }
  function mixColor(hex, amount) {
    const rgb = hexToRgb(hex);
    const target = amount >= 0 ? 255 : 0;
    const weight = Math.abs(amount);
    return rgbToHex({
      r: rgb.r + (target - rgb.r) * weight,
      g: rgb.g + (target - rgb.g) * weight,
      b: rgb.b + (target - rgb.b) * weight
    });
  }

  function pixel(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function drawTexture16(ctx, options = {}) {
    const kind = options.kind || 'item';
    const color = options.color || '#62d990';
    const light = mixColor(color, .33);
    const bright = mixColor(color, .6);
    const dark = mixColor(color, -.4);
    const veryDark = mixColor(color, -.65);
    ctx.clearRect(0, 0, 16, 16);
    ctx.imageSmoothingEnabled = false;

    if (kind === 'block' || kind === 'cube') {
      pixel(ctx, 1, 1, 14, 14, veryDark);
      pixel(ctx, 2, 2, 12, 12, color);
      pixel(ctx, 2, 2, 12, 3, light);
      pixel(ctx, 2, 5, 3, 9, mixColor(color, .18));
      pixel(ctx, 5, 5, 9, 9, dark);
      pixel(ctx, 6, 6, 7, 7, color);
      pixel(ctx, 7, 7, 3, 3, bright);
      pixel(ctx, 11, 11, 2, 2, veryDark);
    } else if (kind === 'sword' || kind === 'dagger') {
      const bladeLength = kind === 'dagger' ? 7 : 10;
      for (let i = 0; i < bladeLength; i += 1) {
        pixel(ctx, 12 - i, 1 + i, 2, 2, i % 2 ? light : color);
        pixel(ctx, 13 - i, 1 + i, 1, 1, bright);
      }
      pixel(ctx, 4, 10, 5, 2, '#d9b56f');
      pixel(ctx, 6, 9, 2, 4, '#8f6339');
      pixel(ctx, 4, 13, 2, 2, '#69462f');
      pixel(ctx, 3, 14, 2, 1, '#3f2c24');
    } else if (kind === 'axe') {
      pixel(ctx, 7, 2, 6, 5, veryDark); pixel(ctx, 6, 3, 6, 4, color); pixel(ctx, 8, 3, 4, 2, light);
      for (let i = 0; i < 10; i += 1) pixel(ctx, 8 - Math.floor(i / 2), 6 + i, 2, 2, i % 3 ? '#8c5e35' : '#b47b43');
    } else if (kind === 'hammer') {
      pixel(ctx, 4, 2, 9, 5, veryDark); pixel(ctx, 3, 3, 10, 3, color); pixel(ctx, 5, 3, 6, 1, light);
      pixel(ctx, 7, 6, 2, 8, '#9a6739'); pixel(ctx, 6, 13, 3, 2, '#5f402d');
    } else if (kind === 'staff' || kind === 'wand') {
      const orbX = kind === 'wand' ? 11 : 10;
      const orbY = kind === 'wand' ? 2 : 3;
      pixel(ctx, orbX - 1, orbY - 1, 4, 4, veryDark); pixel(ctx, orbX, orbY, 2, 2, bright); pixel(ctx, orbX + 1, orbY + 1, 1, 1, '#ffffff');
      for (let i = 0; i < (kind === 'wand' ? 9 : 12); i += 1) {
        const x = orbX - 1 - Math.floor(i * .65); const y = orbY + 2 + i;
        pixel(ctx, x, y, 2, 2, i % 3 ? '#8a603a' : '#b27a45');
      }
    } else if (kind === 'food') {
      pixel(ctx, 4, 4, 8, 9, veryDark); pixel(ctx, 3, 5, 9, 7, color); pixel(ctx, 5, 4, 6, 8, light); pixel(ctx, 7, 2, 2, 3, '#6f9d4e'); pixel(ctx, 8, 6, 2, 2, bright);
    } else {
      pixel(ctx, 6, 1, 4, 2, veryDark); pixel(ctx, 4, 3, 8, 2, dark); pixel(ctx, 3, 5, 10, 6, color); pixel(ctx, 4, 11, 8, 2, dark); pixel(ctx, 6, 13, 4, 2, veryDark);
      pixel(ctx, 5, 6, 3, 3, light); pixel(ctx, 6, 6, 1, 1, '#ffffff'); pixel(ctx, 9, 8, 2, 2, bright);
    }

    if (options.effect === 'lightning') {
      pixel(ctx, 2, 1, 2, 4, '#e5fbff'); pixel(ctx, 1, 4, 3, 2, '#84eaff'); pixel(ctx, 2, 6, 2, 4, '#d9fbff');
    } else if (options.effect === 'fire') {
      pixel(ctx, 1, 11, 2, 3, '#ff5b2d'); pixel(ctx, 2, 9, 2, 4, '#ffb52d'); pixel(ctx, 13, 2, 2, 3, '#ff6f32');
    } else if (options.effect === 'poison') {
      pixel(ctx, 1, 2, 2, 2, '#75ff6b'); pixel(ctx, 13, 10, 2, 2, '#5cab4f');
    } else if (options.effect === 'freeze') {
      pixel(ctx, 1, 2, 2, 2, '#ddffff'); pixel(ctx, 13, 11, 2, 2, '#a8f5ff'); pixel(ctx, 2, 13, 1, 1, '#ffffff');
    }
  }

  function drawTexturePreview(canvas, options) {
    if (!canvas) return '';
    const source = document.createElement('canvas');
    source.width = 16; source.height = 16;
    drawTexture16(source.getContext('2d'), options);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return source.toDataURL('image/png');
  }

  function generateTextureBase64(options) {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    drawTexture16(canvas.getContext('2d'), options);
    return dataUrlBase64(canvas.toDataURL('image/png'));
  }

  function drawBase64OnCanvas(canvas, base64) {
    return new Promise((resolve, reject) => {
      if (!canvas || !base64) return resolve(false);
      const image = new Image();
      image.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(true);
      };
      image.onerror = reject;
      image.src = `data:image/png;base64,${base64}`;
    });
  }

  GF.texture = { drawTexturePreview, generateTextureBase64, drawBase64OnCanvas, hexToRgb, mixColor };

  // ---------- Project model and persistence ----------
  const STORAGE_KEY = 'gameforge-lite.projects.v2';
  const ACTIVE_KEY = 'gameforge-lite.active-project.v2';
  const SETTINGS_KEY = 'gameforge-lite.settings.v2';

  function createProject(options = {}) {
    const timestamp = nowIso();
    return {
      schemaVersion: GF.SCHEMA_VERSION,
      id: options.id || uid('project'),
      name: String(options.name || '我的第一个作品'),
      namespace: cleanNamespace(options.namespace || 'gameforge'),
      minecraftVersion: GF.MINECRAFT_VERSION,
      description: String(options.description || '使用 GameForge Lite 创建的 Minecraft 作品'),
      components: Array.isArray(options.components) ? deepClone(options.components) : [],
      createdAt: options.createdAt || timestamp,
      updatedAt: timestamp
    };
  }

  function normalizeComponent(component) {
    const next = component && typeof component === 'object' ? deepClone(component) : {};
    next.id = next.id || uid('component');
    next.type = next.type || 'function';
    next.name = next.name || next.spec?.name || next.spec?.id || '未命名组件';
    next.createdAt = next.createdAt || nowIso();
    next.spec = next.spec && typeof next.spec === 'object' ? next.spec : {};
    return next;
  }

  function normalizeProject(project) {
    const source = project && typeof project === 'object' ? project : {};
    const next = createProject({
      id: source.id,
      name: source.name,
      namespace: source.namespace,
      description: source.description,
      createdAt: source.createdAt,
      components: (source.components || []).map(normalizeComponent)
    });
    next.updatedAt = source.updatedAt || next.updatedAt;
    next.minecraftVersion = GF.MINECRAFT_VERSION;
    return next;
  }

  function loadProjectMap() {
    const parsed = safeJsonParse(storageGet(STORAGE_KEY), {});
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const normalized = {};
    for (const [id, project] of Object.entries(parsed)) normalized[id] = normalizeProject({ ...project, id });
    return normalized;
  }

  function saveProjectMap(projects) {
    storageSet(STORAGE_KEY, JSON.stringify(projects));
  }

  function listProjects() {
    return Object.values(loadProjectMap()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function getProject(id) {
    const projects = loadProjectMap();
    return projects[id] ? normalizeProject(projects[id]) : null;
  }

  function saveProject(project) {
    const projects = loadProjectMap();
    const normalized = normalizeProject(project);
    normalized.updatedAt = nowIso();
    projects[normalized.id] = normalized;
    saveProjectMap(projects);
    storageSet(ACTIVE_KEY, normalized.id);
    return deepClone(normalized);
  }

  function deleteProject(id) {
    const projects = loadProjectMap();
    delete projects[id];
    saveProjectMap(projects);
    if (storageGet(ACTIVE_KEY) === id) storageRemove(ACTIVE_KEY);
  }

  function activeProjectId() {
    return storageGet(ACTIVE_KEY);
  }

  function setActiveProject(id) {
    storageSet(ACTIVE_KEY, id);
  }

  function loadOrCreateActiveProject() {
    const projects = loadProjectMap();
    const active = activeProjectId();
    if (active && projects[active]) return normalizeProject(projects[active]);
    const first = Object.values(projects).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    if (first) {
      setActiveProject(first.id);
      return normalizeProject(first);
    }
    return saveProject(createProject());
  }

  function duplicateProject(project) {
    const clone = normalizeProject(project);
    clone.id = uid('project');
    clone.name = `${clone.name} 副本`;
    clone.createdAt = nowIso();
    clone.updatedAt = clone.createdAt;
    clone.components = clone.components.map((component) => ({ ...component, id: uid('component'), createdAt: nowIso() }));
    return saveProject(clone);
  }

  function getSettings() {
    return safeJsonParse(storageGet(SETTINGS_KEY), {}) || {};
  }
  function saveSettings(settings) {
    storageSet(SETTINGS_KEY, JSON.stringify(settings || {}));
  }

  GF.project = {
    create: createProject,
    normalize: normalizeProject,
    normalizeComponent,
    loadOrCreateActive: loadOrCreateActiveProject,
    get: getProject,
    list: listProjects,
    save: saveProject,
    delete: deleteProject,
    duplicate: duplicateProject,
    setActive: setActiveProject,
    activeId: activeProjectId,
    getSettings,
    saveSettings,
    storageAvailable: hasLocalStorage
  };
})();
