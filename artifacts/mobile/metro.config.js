const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Firebase + pnpm: Metro's FallbackWatcher chokes on pnpm _tmp_ dirs
// that are created and removed during install. Block them explicitly.
const existing = config.resolver.blockList;
const tmpPattern = /_tmp_\d+/;
config.resolver.blockList = existing
  ? [].concat(existing, tmpPattern)
  : tmpPattern;

module.exports = config;
