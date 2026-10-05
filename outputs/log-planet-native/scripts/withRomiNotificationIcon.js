const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
module.exports = function withRomiNotificationIcon(config) {
  config = withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application[0];
    const name = 'expo.modules.notifications.large_notification_icon';
    app['meta-data'] = (app['meta-data'] || []).filter(item => item.$['android:name'] !== name);
    app['meta-data'].push({ $: { 'android:name': name, 'android:resource': '@drawable/romi_notification_large' } });
    for (const key of ['expo.modules.notifications.default_notification_icon', 'com.google.firebase.messaging.default_notification_icon']) {
      app['meta-data'] = app['meta-data'].filter(item => item.$['android:name'] !== key);
      app['meta-data'].push({ $: { 'android:name': key, 'android:resource': '@drawable/romi_notification_small' } });
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const dest = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/drawable-nodpi');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'romi_notification_small.xml'), `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="M12,1 A10,10 0,0 1,22 11 L22,16 L19,19 L19,22 L5,22 L5,19 L2,16 L2,11 A10,10 0,0 1,12 1 Z M12,4 A7,7 0,1 0,12 18 A7,7 0,1 0,12 4 Z"/><path android:fillColor="#FFFFFFFF" android:pathData="M0,10 L3,10 L3,16 L0,16 Z M21,10 L24,10 L24,16 L21,16 Z M8,20 L16,20 L16,23 L8,23 Z"/></vector>`);
    fs.copyFileSync(path.resolve(mod.modRequest.projectRoot, '../../../character/assets/characters/romi-profile-standard.png'), path.join(dest, 'romi_notification_large.png'));
    return mod;
  }]);
};
