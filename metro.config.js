const { withNativeWind } = require('nativewind/metro');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname)

// @trigger.dev/react-hooks (via @trigger.dev/core) imports server-side code the app never runs:
// - jose signs and verifies JWTs; it needs `node:buffer` or a global `crypto`.
// - @s2-dev/streamstore writes realtime streams; it has dynamic `import()`s Hermes can't compile.
// Neither is touched while subscribing to a run, so leave them out of native bundles.
const NATIVE_EMPTY_MODULES = new Set(['jose', '@s2-dev/streamstore']);

const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (NATIVE_EMPTY_MODULES.has(moduleName) && (platform === 'ios' || platform === 'android')) {
    return { type: 'empty' };
  }
  return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/global.css' })