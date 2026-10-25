/* global __dirname */
const {withDangerousMod} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
module.exports = config => withDangerousMod(config, ['ios', async config => {
  const target = path.join(config.modRequest.platformProjectRoot, 'ExpoWidgetsTarget', 'TaskNoteWidget.swift');
  if (!fs.existsSync(target)) throw new Error('expo-widgets must generate TaskNoteWidget before the native renderer.');
  fs.copyFileSync(path.join(__dirname, 'TaskNoteWidget.swift'), target);
  return config;
}]);
