const {withDangerousMod}=require('expo/config-plugins');
const fs=require('fs');
const path=require('path');

module.exports=config=>withDangerousMod(config,['ios',async config=>{
 const target=path.join(config.modRequest.platformProjectRoot,'ExpoWidgetsTarget','Peacee1QuickWidget.swift');
 if(!fs.existsSync(target))throw new Error('expo-widgets must generate Peacee1QuickWidget before the native renderer plugin.');
 fs.copyFileSync(path.join(__dirname,'Peacee1QuickWidget.swift'),target);
 return config;
}]);
