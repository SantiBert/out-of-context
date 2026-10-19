const { withAppBuildGradle } = require('@expo/config-plugins');

const propertiesLoader = `def keystorePropertiesFile = rootProject.file("../keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

`;

const releaseSigningConfig = `
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }`;

function applyReleaseSigning(contents) {
  let next = contents;
  if (!next.includes('keystorePropertiesFile')) {
    next = next.replace(
      /signingConfigs\s*\{/,
      `${propertiesLoader}signingConfigs {`,
    );
  }
  if (!next.includes("keystoreProperties['storeFile']")) {
    next = next.replace(
      /(signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n        \})/,
      `$1${releaseSigningConfig}`,
    );
  }
  const buildTypesAt = next.indexOf('buildTypes {');
  if (buildTypesAt === -1) {
    return next;
  }
  const head = next.slice(0, buildTypesAt);
  const tail = next
    .slice(buildTypesAt)
    .replace(
      /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );
  return head + tail;
}

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      return mod;
    }
    mod.modResults.contents = applyReleaseSigning(mod.modResults.contents);
    return mod;
  });
}

module.exports = withReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;
