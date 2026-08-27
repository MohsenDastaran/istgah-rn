const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'istgah-release-config';

const KEYSTORE_BLOCK = `
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
`;

const SPLITS_BLOCK = `    // ${MARKER}: arm64 split + universal APKs for GitHub Releases
    splits {
        abi {
            enable gradle.startParameter.taskNames.any { it.toLowerCase().contains("release") }
            reset()
            include "arm64-v8a"
            universalApk true
        }
    }
`;

const RELEASE_SIGNING_CONFIG = `        release {
            if (System.getenv("ISTGAH_STORE_FILE")) {
                storeFile new File(System.getenv("ISTGAH_STORE_FILE"))
                keyAlias System.getenv("ISTGAH_KEY_ALIAS")
                keyPassword System.getenv("ISTGAH_KEY_PASSWORD")
                storePassword System.getenv("ISTGAH_STORE_PASSWORD")
                if (System.getenv("ISTGAH_STORE_TYPE")) {
                    storeType System.getenv("ISTGAH_STORE_TYPE")
                }
            } else if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties["keyAlias"]
                keyPassword keystoreProperties["keyPassword"] ?: keystoreProperties["password"]
                storePassword keystoreProperties["storePassword"] ?: keystoreProperties["password"]
                def storePath = keystoreProperties["storeFile"]
                storeFile storePath.startsWith("/") ? new File(storePath) : file(storePath)
                if (keystoreProperties["storeType"]) {
                    storeType keystoreProperties["storeType"]
                }
            }
        }
`;

const VARIANT_CODES = `    applicationVariants.all { variant ->
        variant.outputs.each { output ->
            def abi = output.getFilter(com.android.build.OutputFile.ABI)
            if (abi != null) {
                def abiCodes = ["arm64-v8a": 2]
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
      'versionCode istgahVersionCode'
    );
    contents = contents.replace(
      /versionName\s+"[^"]+"/,
      'versionName istgahVersionName'
    );

    if (!contents.includes('istgahVersionCode =')) {
      contents = contents.replace(
        /def jscFlavor = '[^']+'\n/,
        `$&\ndef istgahVersionCode = (project.findProperty("istgahVersionCode") ?: "1").toString().toInteger()\ndef istgahVersionName = (project.findProperty("istgahVersionName") ?: "1.0.1").toString()\n`
      );
    }

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
      `release {
            if (System.getenv("ISTGAH_STORE_FILE") || keystorePropertiesFile.exists()) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }`
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
