import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {getDefaultConfig}=require('expo/metro-config');
const {resolve}=require(require.resolve('metro-resolver',{paths:[require.resolve('expo/metro-config')]}));
test('Metro loads the widget updater on iOS instead of the no-op fallback',()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const config=getDefaultConfig(root);
 const context={originModulePath:path.join(root,'App.tsx'),sourceExts:config.resolver.sourceExts,mainFields:config.resolver.resolverMainFields,getPackageForModule:()=>null,preferNativePlatform:true,doesFileExist:fs.existsSync,isAssetFile:()=>false,resolveAsset:()=>null,fileSystemLookup:(file:string)=>{
  try{const stat=fs.statSync(file);return {exists:true,type:stat.isDirectory()?'d':'f',realPath:fs.realpathSync(file)};}catch{return {exists:false};}
 }};
 assert.equal(path.basename(resolve(context,'./src/widgets/QuickWidget','ios').filePath),'QuickWidget.ios.tsx');
 assert.equal(path.basename(resolve(context,'./src/widgets/QuickWidget','android').filePath),'QuickWidget.tsx');
});
