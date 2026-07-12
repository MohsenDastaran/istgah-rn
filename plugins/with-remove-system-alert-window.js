const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSION = 'android.permission.SYSTEM_ALERT_WINDOW';

/** Strip overlay permission from release manifests; debug source sets keep it for dev tooling. */
function withRemoveSystemAlertWindow(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = manifest.manifest['uses-permission'];

    if (!Array.isArray(permissions)) {
      return config;
    }

    manifest.manifest['uses-permission'] = permissions.filter((entry) => {
      const name = entry.$?.['android:name'];
      return name !== PERMISSION;
    });

    return config;
  });
}

module.exports = withRemoveSystemAlertWindow;
