const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin: drive the Android `versionName` / `versionCode` from the
 * repo-root `version.properties` file, read natively in app/build.gradle at
 * build time. Because Gradle reads the file on every build, a bumped version
 * applies to the next `bundleRelease` WITHOUT re-running `expo prebuild`.
 *
 * Resolution order (highest first):
 *   1. env ANDROID_VERSION_NAME / ANDROID_VERSION_CODE   (CI injects these)
 *   2. version.properties VERSION_NAME / VERSION_CODE     (local; bump script)
 *   3. hardcoded fallback (1.0.0 / 1)
 *
 * The `android/` folder is generated (not committed), so this re-applies on
 * every prebuild.
 */
const VERSION_RESOLVER = `
// FitCall version source — see plugins/withAndroidVersion.js. Read from
// version.properties (repo root) so a bumped version applies without a
// re-prebuild; env vars override for CI.
def fitcallVersionProps = new Properties()
def fitcallVersionFile = rootProject.file("../version.properties")
if (fitcallVersionFile.exists()) {
    fitcallVersionFile.withInputStream { fitcallVersionProps.load(it) }
}
def fitcallVersionName = System.getenv("ANDROID_VERSION_NAME") ?: fitcallVersionProps.getProperty("VERSION_NAME", "1.0.0")
def fitcallVersionCode = (System.getenv("ANDROID_VERSION_CODE") ?: fitcallVersionProps.getProperty("VERSION_CODE", "1")).toString().toInteger()
`;

function applyVersion(contents) {
  let next = contents;

  // 1. Inject the resolver once, just before the top-level `android {` block.
  // Fail loudly rather than silently shipping unresolved versions if Expo ever
  // changes the generated build.gradle shape.
  if (!next.includes('fitcallVersionProps')) {
    const injected = next.replace(/^android\s*\{/m, (match) => `${VERSION_RESOLVER}\n${match}`);
    if (injected === next) {
      throw new Error(
        'withAndroidVersion: could not find a top-level `android {` block to inject the version resolver.',
      );
    }
    next = injected;
  }

  // 2. Point defaultConfig's versionCode/versionName at the resolved values.
  const codeRe = /versionCode\s+\d+/;
  const nameRe = /versionName\s+"[^"]*"/;
  if (!codeRe.test(next) || !nameRe.test(next)) {
    throw new Error(
      'withAndroidVersion: could not find versionCode/versionName in app/build.gradle — ' +
        'the generated Gradle format may have changed.',
    );
  }
  next = next.replace(codeRe, 'versionCode fitcallVersionCode');
  next = next.replace(nameRe, 'versionName fitcallVersionName');

  return next;
}

module.exports = function withAndroidVersion(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withAndroidVersion: expected app/build.gradle to be Groovy.');
    }
    cfg.modResults.contents = applyVersion(cfg.modResults.contents);
    return cfg;
  });
};
