const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const backendRoot = path.resolve(__dirname, '..', 'backend');

config.watchFolders = [...config.watchFolders, backendRoot];

const backendNoise =
  /[/\\]backend[/\\](\.venv|__pycache__|\.ruff_cache)[/\\].*/;
const current = config.resolver.blockList;
config.resolver.blockList = Array.isArray(current)
  ? [...current, backendNoise]
  : current
    ? [current, backendNoise]
    : [backendNoise];

module.exports = config;
