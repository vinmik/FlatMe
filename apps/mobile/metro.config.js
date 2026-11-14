const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Workspace packages are symlinked into node_modules. When the repo is accessed via
// a substituted drive or junction (used on Windows to dodge MAX_PATH in native builds)
// the symlink targets live under the real path, so Metro must watch that too.
const workspaceRoot = path.resolve(__dirname, "../..");
const realWorkspaceRoot = fs.realpathSync.native(workspaceRoot);
if (realWorkspaceRoot !== workspaceRoot) {
  config.watchFolders = [...(config.watchFolders ?? []), realWorkspaceRoot];
}

module.exports = config;
