'use strict';

(() => {
  const GF = window.GameForge;
  const Systems = GF?.nativeSystems;
  const Pipeline = GF?.pipeline;
  if (!Systems || !Pipeline || Systems.__legacyBridgeInstalled) return;

  const originalMachine = Systems.machineDescriptor.bind(Systems);
  const originalEntity = Systems.entityDescriptor.bind(Systems);
  const toIR = (component) => component?.schema === Pipeline.IR_SCHEMA || component?.kind
    ? component
    : Pipeline.fromLegacyComponent(component);
  const kind = (component) => String(component?.kind || component?.type || '').toLowerCase();
  const config = (component) => component?.config || component?.spec || {};

  Systems.isMachine = (component) => kind(component) === 'forge' && String(config(component).contentType || '').toLowerCase() === 'machine';
  Systems.isCustomEntity = (component) => {
    const contentType = String(config(component).contentType || '').toLowerCase();
    return kind(component) === 'forge' && (contentType === 'entity' || contentType === 'custom_entity');
  };
  Systems.machineDescriptor = (component, modId) => originalMachine(toIR(component), modId);
  Systems.entityDescriptor = (component) => originalEntity(toIR(component));
  Systems.__legacyBridgeInstalled = true;
})();
