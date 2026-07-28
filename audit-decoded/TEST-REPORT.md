# GameForge Lite 2.1.1 — Test Report

Validated before release:

- JavaScript syntax checks passed for the original app, ZIP → JAR converter, local vocabulary engine, and core runtime extension.
- `manifest.webmanifest` parsed successfully.
- Browser self-tests passed for project generation, JSON, namespace handling, textures, ZIP, Forge source, game menu, trigger actions, passive weapons, and component discovery.
- The local vocabulary engine contains 386 semantic concepts and more than 4,500 direct aliases across items, entities, worlds, dimensions, biomes, terrain, weather, structures, rules, events, quests, magic, technology, effects, styles, and Minecraft terminology.
- The core runtime generates first-join initialization, non-operator `/trigger` menus, recipe unlocking, obtain/spawn/cleanup/doctor functions, and component action wrappers.
- ZIP → JAR validates GameForge bundle structure and emits a Forge 1.20.1 `lowcodefml` JAR locally in the browser.

Real Minecraft gameplay behavior is still verified in a local Forge 1.20.1 test instance.
