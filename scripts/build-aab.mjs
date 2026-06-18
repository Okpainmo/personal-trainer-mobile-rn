// One-shot "request an AAB": bump the Android version, then build the release
// bundle. Cross-platform (picks gradlew.bat on Windows). Run via `pnpm aab`.
//
// Assumes `expo prebuild` has already generated android/. Because build.gradle
// reads version.properties at build time, no prebuild is needed between bumps.
import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = platform() === 'win32';

function run(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// 1. Bump version.properties (versionName patch + versionCode).
run(process.execPath, [join(root, 'scripts', 'bump-android-version.mjs')]);

// 2. Build the release AAB.
const gradlew = isWindows ? 'gradlew.bat' : './gradlew';
run(gradlew, ['bundleRelease'], { cwd: join(root, 'android'), shell: isWindows });

console.log('\nAAB ready: android/app/build/outputs/bundle/release/app-release.aab');
