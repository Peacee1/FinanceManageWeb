const fs=require('fs'),path=require('path');
const root=__dirname;
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="\/universe.css[^\"]*">/,()=>'<style>'+fs.readFileSync(path.join(root,'universe.css'),'utf8')+'</style>');
html=html.replace(/<script defer src="\/universe.js[^\"]*"><\/script>/,()=>'<script defer>'+fs.readFileSync(path.join(root,'universe.js'),'utf8').replace('(() => {','document.addEventListener("DOMContentLoaded", () => {').replace(/\}\)\(\);\s*$/, '});')+'</script>');
if(!process.argv[2])throw Error('Supply output file');fs.writeFileSync(process.argv[2],html);
