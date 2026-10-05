const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../../../character')];
// Release exports use cached encoded copies. Dev/editor artwork remains original.
const optimized = process.env.NODE_ENV === 'production'
  && ['production', 'preview'].includes(process.env.APP_VARIANT)
  && process.env.LOGPLANET_ORIGINAL_ASSETS !== '1';
if (optimized) {
  config.transformer.assetPlugins = [...(config.transformer.assetPlugins || []), require.resolve('./scripts/optimize-bundled-assets.cjs')];
}
config.cacheVersion = `${config.cacheVersion || '1'}:logplanet-assets-v1:${optimized ? 'optimized' : 'original'}`;
module.exports = config;
