/* global __dirname */
const {withDangerousMod, withEntitlementsPlist} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
module.exports = config => {
  config = withEntitlementsPlist(config, config => {
    // expo-widgets adds this even when push updates are disabled.
    delete config.modResults['aps-environment'];
    return config;
  });
  return withDangerousMod(config, ['ios', async config => {
    const target = path.join(config.modRequest.platformProjectRoot, 'ExpoWidgetsTarget', 'TaskNoteWidget.swift');
    if (!fs.existsSync(target)) throw new Error('expo-widgets must generate TaskNoteWidget before the native renderer.');
    fs.copyFileSync(path.join(__dirname, 'TaskNoteWidget.swift'), target);
    return config;
  }]);
};
