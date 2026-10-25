const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {resolve} = require('metro-resolver');
const {getDefaultConfig} = require('expo/metro-config');
const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(root);
const context = {
  originModulePath: path.join(root, 'src/app/index.tsx'),
  sourceExts: config.resolver.sourceExts,
  assetExts: new Set(config.resolver.assetExts),
  preferNativePlatform: true,
  mainFields: config.resolver.resolverMainFields,
  getPackageForModule: () => null,
  redirectModulePath: value => value,
  fileSystemLookup: file => {
    try {const stat = fs.statSync(file); return {exists:true,type:stat.isDirectory()?'d':'f',realPath:fs.realpathSync(file)};}
    catch {return {exists:false};}
  },
};
test('Metro selects the real widget writer on iOS rather than the no-op fallback', () => {
  assert.equal(resolve(context, '../TaskNoteWidget', 'ios').filePath, path.join(root,'src/TaskNoteWidget.ios.tsx'));
  assert.equal(resolve(context, '../TaskNoteWidget', 'android').filePath, path.join(root,'src/TaskNoteWidget.tsx'));
});
