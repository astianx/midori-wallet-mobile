import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function patchAxiosAdapterName() {
  const adaptersPath = join(projectRoot, 'node_modules', 'axios', 'lib', 'adapters', 'adapters.js');

  if (!existsSync(adaptersPath)) {
    console.warn('[patch-node-modules] Axios adapters file not found; skipping.');
    return;
  }

  const source = readFileSync(adaptersPath, 'utf8');

  if (source.includes('Cannot redefine adapterName in Expo web')) {
    console.log('[patch-node-modules] Axios adapterName patch already applied.');
    return;
  }

  const target = "    Object.defineProperty(fn, 'adapterName', {value});";
  const replacement = `    try {
      Object.defineProperty(fn, 'adapterName', { __proto__: null, value, configurable: true });
    } catch (e) {
      // Cannot redefine adapterName in Expo web when Metro evaluates this module again.
    }`;

  if (!source.includes(target)) {
    console.warn('[patch-node-modules] Expected Axios adapterName assignment not found; skipping.');
    return;
  }

  writeFileSync(adaptersPath, source.replace(target, replacement));
  console.log('[patch-node-modules] Patched Axios adapterName assignment for Expo web.');
}

function patchFreeportAsync() {
  const freeportPath = join(projectRoot, 'node_modules', 'freeport-async', 'index.js');

  if (!existsSync(freeportPath)) {
    console.warn('[patch-node-modules] freeport-async file not found; skipping.');
    return;
  }

  const source = readFileSync(freeportPath, 'utf8');

  if (source.includes('Node 22 rejects port 65536')) {
    console.log('[patch-node-modules] freeport-async port limit patch already applied.');
    return;
  }

  const target = `    for (var i = 0; i < rangeSize; i++) {
      awaitables.push(availableAsync(lowPort + i, options));
    }`;
  const replacement = `    for (var i = 0; i < rangeSize; i++) {
      const candidatePort = lowPort + i;
      if (candidatePort > 65535) {
        // Node 22 rejects port 65536 before freeport-async can recover.
        reject(new Error("No available ports found below 65536"));
        return;
      }
      awaitables.push(availableAsync(candidatePort, options));
    }`;

  if (!source.includes(target)) {
    console.warn('[patch-node-modules] Expected freeport-async port loop not found; skipping.');
    return;
  }

  writeFileSync(freeportPath, source.replace(target, replacement));
  console.log('[patch-node-modules] Patched freeport-async port limit for Node 22.');
}

patchAxiosAdapterName();
patchFreeportAsync();
