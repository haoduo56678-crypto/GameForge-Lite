const $ = (id) => document.getElementById(id);
const clean = (value, fallback='gameforge') => (value || fallback).toLowerCase().replace(/[^a-z0-9_\-./]/g, '_');
const pretty = (obj) => JSON.stringify(obj, null, 2);

for (const btn of document.querySelectorAll('.nav')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    $(`page-${btn.dataset.page}`).classList.add('active');
  });
}

function generateCommand() {
  const type = $('commandType').value;
  const target = $('commandTarget').value.trim() || '@p';
  const id = $('commandId').value.trim() || 'minecraft:stone';
  const amount = Math.max(1, Number($('commandAmount').value) || 1);
  const name = $('commandName').value.trim() || '自定义物品';
  const extra = $('commandExtra').value.trim() || '10';
  let command = '';
  if (type === 'give') command = `/give ${target} ${id}{display:{Name:'${JSON.stringify({text:name,italic:false})}'}} ${amount}`;
  if (type === 'summon') command = `/summon ${id} ~ ~ ~ {CustomName:'${JSON.stringify({text:name})}',CustomNameVisible:1b}`;
  if (type === 'effect') command = `/effect give ${target} ${id} ${amount} ${Number(extra)||0} true`;
  if (type === 'title') command = `/title ${target} title ${JSON.stringify({text:name,color:'aqua'})}`;
  if (type === 'lightning') command = `/execute at ${target} run summon minecraft:lightning_bolt ~ ~ ~`;
  $('commandOutput').textContent = command;
  return command;
}
$('generateCommand').addEventListener('click', generateCommand);
$('copyCommand').addEventListener('click', async () => {
  const text = generateCommand();
  try { await navigator.clipboard.writeText(text); $('copyCommand').textContent='已复制'; setTimeout(()=>$('copyCommand').textContent='复制',1200); }
  catch { alert('浏览器未允许复制，请手动复制。'); }
});

function recipeData() {
  const type = $('recipeType').value;
  const ingredients = $('recipeIngredients').value.split(',').map(x=>x.trim()).filter(Boolean);
  const result = { item: $('recipeResult').value.trim() || 'minecraft:stone', count: Math.max(1, Number($('recipeCount').value)||1) };
  if (type === 'shapeless') return { type:'minecraft:crafting_shapeless', ingredients: ingredients.map(item=>({item})), result };
  const pattern = $('recipePattern').value.split('/').map(x=>x.trim()).filter(Boolean);
  const keys = ['A','B','C','D','E','F','G','H','I'];
  const key = {};
  ingredients.forEach((item,i)=>{ if(keys[i]) key[keys[i]]={item}; });
  return { type:'minecraft:crafting_shaped', pattern: pattern.length?pattern:['A','A','B'], key, result };
}
function generateRecipe(){ const data=recipeData(); $('recipeOutput').textContent=pretty(data); return data; }
$('generateRecipe').addEventListener('click', generateRecipe);

function lootData() {
  const chance = Math.max(0, Math.min(100, Number($('lootChance').value)||0))/100;
  const min = Math.max(1, Number($('lootMin').value)||1);
  const max = Math.max(min, Number($('lootMax').value)||min);
  return { type:'minecraft:entity', pools:[{ rolls:1, entries:[{ type:'minecraft:item', name:$('lootItem').value.trim()||'minecraft:diamond', conditions:[{condition:'minecraft:random_chance',chance}], functions:[{function:'minecraft:set_count',count:{type:'minecraft:uniform',min,max}}] }] }] };
}
function generateLoot(){ const data=lootData(); $('lootOutput').textContent=pretty(data); return data; }
$('generateLoot').addEventListener('click', generateLoot);

function functionText(){ return $('fnCommands').value.split('\n').map(x=>x.trim().replace(/^\//,'')).filter(Boolean).join('\n')+'\n'; }
$('previewFunction').addEventListener('click',()=> $('functionOutput').textContent=functionText());

function resourceModelData(){
  const ns=clean($('resNamespace').value); const model=clean($('resModelName').value,'custom_item');
  return { parent:'item/handheld', textures:{ layer0:`${ns}:item/${model}` } };
}
$('previewResource').addEventListener('click',()=> $('resourceOutput').textContent=pretty(resourceModelData()));

function crc32(bytes){
  let table=crc32.table;
  if(!table){table=crc32.table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}}
  let crc=0xffffffff; for(const b of bytes) crc=table[(crc^b)&255]^(crc>>>8); return (crc^0xffffffff)>>>0;
}
function u16(n){return [n&255,(n>>>8)&255]} function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function makeZip(files){
  const enc=new TextEncoder(); const chunks=[]; const central=[]; let offset=0;
  for(const file of files){
    const name=enc.encode(file.name); const data=typeof file.data==='string'?enc.encode(file.data):file.data; const crc=crc32(data);
    const local=new Uint8Array([0x50,0x4b,0x03,0x04,...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name]);
    chunks.push(local,data);
    const cen=new Uint8Array([0x50,0x4b,0x01,0x02,...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);
    central.push(cen); offset+=local.length+data.length;
  }
  const centralSize=central.reduce((n,x)=>n+x.length,0);
  const end=new Uint8Array([0x50,0x4b,0x05,0x06,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),...u16(0)]);
  return new Blob([...chunks,...central,end],{type:'application/zip'});
}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function packMeta(description,format=15){return pretty({pack:{pack_format:format,description}})+'\n'}
function safePackFiles(extra, description){return [{name:'pack.mcmeta',data:packMeta(description,15)},{name:'README.txt',data:'由 GameForge Lite 生成，适用于 Minecraft Java 1.20.1。\n把此 ZIP 放入对应世界的 datapacks 文件夹，然后执行 /reload。\n'},...extra]}

$('downloadRecipePack').addEventListener('click',()=>{
  const ns=clean($('recipeNamespace').value), file=clean($('recipeFile').value,'recipe'); const data=generateRecipe();
  downloadBlob(makeZip(safePackFiles([{name:`data/${ns}/recipes/${file}.json`,data:pretty(data)+'\n'}],`GameForge 配方：${file}`)),`${file}-datapack.zip`);
});
$('downloadLootPack').addEventListener('click',()=>{
  const ns=clean($('lootNamespace').value), file=clean($('lootFile').value,'loot'); const data=generateLoot();
  downloadBlob(makeZip(safePackFiles([{name:`data/${ns}/loot_tables/entities/${file}.json`,data:pretty(data)+'\n'}],`GameForge 掉落表：${file}`)),`${file}-loot-datapack.zip`);
});
$('downloadFunctionPack').addEventListener('click',()=>{
  const ns=clean($('fnNamespace').value), file=clean($('fnFile').value,'main'), text=functionText(); $('functionOutput').textContent=text;
  const files=safePackFiles([
    {name:`data/${ns}/functions/${file}.mcfunction`,data:text},
    {name:`data/minecraft/tags/functions/load.json`,data:pretty({values:[`${ns}:${file}`]})+'\n'}
  ],`GameForge 函数：${file}`);
  downloadBlob(makeZip(files),`${file}-function-datapack.zip`);
});
$('downloadResourcePack').addEventListener('click',()=>{
  const ns=clean($('resNamespace').value), base=clean($('resBaseItem').value,'diamond_sword'), model=clean($('resModelName').value,'custom_item');
  const cmd=Math.max(1,Number($('resModelData').value)||1001); const desc=$('resDescription').value||'由 GameForge Lite 生成';
  const baseModel={parent:'item/handheld',textures:{layer0:`minecraft:item/${base}`},overrides:[{predicate:{custom_model_data:cmd},model:`${ns}:item/${model}`} ]};
  const custom=resourceModelData(); $('resourceOutput').textContent=pretty(custom);
  const files=[
    {name:'pack.mcmeta',data:packMeta(desc,15)},
    {name:`assets/minecraft/models/item/${base}.json`,data:pretty(baseModel)+'\n'},
    {name:`assets/${ns}/models/item/${model}.json`,data:pretty(custom)+'\n'},
    {name:`assets/${ns}/textures/item/PUT_${model}_PNG_HERE.txt`,data:`把 ${model}.png 放进这个文件夹。建议尺寸 16x16、32x32 或 64x64。\n`},
    {name:'README.txt',data:`资源包：${$('resName').value}\n版本：Minecraft Java 1.20.1\n使用指令示例：\n/give @p minecraft:${base}{CustomModelData:${cmd}} 1\n`}
  ];
  downloadBlob(makeZip(files),`${model}-resource-pack.zip`);
});

generateCommand(); generateRecipe(); generateLoot(); $('functionOutput').textContent=functionText(); $('resourceOutput').textContent=pretty(resourceModelData());
