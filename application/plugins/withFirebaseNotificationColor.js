const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withFirebaseNotificationColor(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];

    if (!application['meta-data']) application['meta-data'] = [];

    const metaData = application['meta-data'];
    const entry = metaData.find(
      (m) => m.$?.['android:name'] === 'com.google.firebase.messaging.default_notification_color'
    );

    if (entry) {
      entry.$['tools:replace'] = 'android:resource';
    }

    // Ensure tools namespace is declared
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    return config;
  });
};