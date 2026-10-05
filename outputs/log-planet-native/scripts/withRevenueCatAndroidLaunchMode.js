const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withRevenueCatAndroidLaunchMode(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    const mainActivity = application?.activity?.find((activity) => activity.$?.["android:name"] === ".MainActivity");
    if (mainActivity?.$) mainActivity.$["android:launchMode"] = "singleTop";
    return mod;
  });
};
