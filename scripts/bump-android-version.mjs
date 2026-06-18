// Bump the Android version in version.properties: versionCode +1 and the
// versionName patch +1 (e.g. 1.0.0 -> 1.0.1). build.gradle reads this file at
// build time (see plugins/withAndroidVersion.js), so the next AAB picks it up.
//
// Usage:
//   node scripts/bump-android-version.mjs            # bump name (patch) + code
//   node scripts/bump-android-version.mjs --code     # bump only versionCode
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'version.properties');
const codeOnly = process.argv.includes('--code');

function parse(text) {
  const props = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (match) props[match[1]] = match[2];
  }
  return props;
}

const props = parse(existsSync(file) ? readFileSync(file, 'utf8') : '');

// Fall back to defaults only when a key is absent; reject malformed values
// outright so a typo can't silently emit bogus version metadata downstream.
const currentName = props.VERSION_NAME ?? '1.0.0';
if (!/^\d+(\.\d+)*$/.test(currentName)) {
  throw new Error(
    `version.properties: VERSION_NAME "${currentName}" is not a valid dotted version.`,
  );
}

const rawCode = props.VERSION_CODE ?? '0';
if (!/^\d+$/.test(rawCode)) {
  throw new Error(`version.properties: VERSION_CODE "${rawCode}" is not a non-negative integer.`);
}
const currentCode = Number.parseInt(rawCode, 10);

let nextName = currentName;
if (!codeOnly) {
  const parts = currentName.split('.').map((n) => Number.parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[parts.length - 1] += 1; // bump patch
  nextName = parts.join('.');
}
const nextCode = currentCode + 1;

writeFileSync(file, `VERSION_NAME=${nextName}\nVERSION_CODE=${nextCode}\n`);
console.log(`Android version bumped: ${currentName} (${currentCode}) -> ${nextName} (${nextCode})`);
