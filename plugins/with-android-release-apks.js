const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'istgah-release-config';

const KEYSTORE_BLOCK = `
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
`;

const SPLITS_BLOCK = `    // ${MARKER}: per-ABI + universal APKs for GitHub Releases
    splits {
        abi {
            enable gradle.startParameter.taskNames.any { it.toLowerCase().contains("release") }
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk true
        }
    }
`;

const RELEASE_SIGNING_CONFIG = `        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties["keyAlias"]
                keyPassword keystoreProperties["keyPassword"] ?: keystoreProperties["password"]
                storePassword keystoreProperties["storePassword"] ?: keystoreProperties["password"]
                storeFile file(keystoreProperties["storeFile"])
            }
        }
`;

const VARIANT_CODES = `    applicationVariants.all { variant ->
        variant.outputs.each { output ->
            def abi = output.getFilter(com.android.build.OutputFile.ABI)
            if (abi != null) {
                def abiCodes = ["armeabi-v7a": 1, "arm64-v8a": 2, "x86": 3, "x86_64": 4]
                output.versionCodeOverride = defaultConfig.versionCode * 10 + abiCodes.get(abi, 0)
            }
        }
    }
`;

/** Keep ABI-split release APKs and keystore.properties signing after `expo prebuild`. */
function withAndroidReleaseApks(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes(MARKER)) {
      return config;
    }

    if (!contents.includes('keystorePropertiesFile')) {
      contents = contents.replace(
        /\/\*\*\s*\n \* Set this to true in release builds to optimize the app using \[R8\]/,
        `${KEYSTORE_BLOCK}\n/**\n * Set this to true in release builds to optimize the app using [R8]`
      );
    }

    contents = contents.replace(
      /versionCode\s+\d+/,
      'versionCode (findProperty("versionCode") ?: "1") as int'
    );
    contents = contents.replace(
      /versionName\s+"[^"]+"/,
      'versionName findProperty("versionName") ?: "1.0.1"'
    );

    if (!contents.includes('universalApk true')) {
      contents = contents.replace(/(\n    signingConfigs \{)/, `\n${SPLITS_BLOCK}$1`);
    }

    if (!contents.includes('keystoreProperties["keyAlias"]')) {
      contents = contents.replace(
        /(signingConfigs \{\n        debug \{[\s\S]*?keyPassword 'android'\n        \}\n)(    \})/,
        `$1${RELEASE_SIGNING_CONFIG}$2`
      );
    }

    contents = contents.replace(
      /release \{\n            \/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/,
      'release {\n            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug'
    );

    if (!contents.includes('versionCodeOverride')) {
      contents = contents.replace(
        /(androidResources \{[\s\S]*?ignoreAssetsPattern '[^']+'\n    \}\n)(\})/,
        `$1${VARIANT_CODES}$2`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseApks;
