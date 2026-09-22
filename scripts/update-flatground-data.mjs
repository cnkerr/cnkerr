import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const sourcePath = path.join(repo, "notes/projects/flatground-tricks-source.csv");
const dataPath = path.join(repo, "notes/projects/flatground-tricks-data.js");
const rawPath = path.join(repo, "notes/projects/flatground-tricks-data.csv");
const htmlPath = path.join(repo, "notes/projects/flatground-tricks.html");

const SOURCE_COLUMNS = ["trick_number","trick_name","stance","part","caption_seconds","family","subfamily","modifiers","sibling_key","youtube_url"];

function parseCsv(text){
  const rows=[]; let row=[], field="", quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"' && text[i+1]==='"'){ field+='"'; i++; }
      else if(ch==='"') quoted=false;
      else field+=ch;
    }else{
      if(ch==='"') quoted=true;
      else if(ch===","){ row.push(field); field=""; }
      else if(ch==="\n"){ row.push(field); rows.push(row); row=[]; field=""; }
      else if(ch!=="\r") field+=ch;
    }
  }
  if(field.length||row.length){ row.push(field); rows.push(row); }
  return rows.filter(r=>r.some(v=>v!==""));
}
function csvEscape(v){
  const s=String(v??"");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}
function toCsv(rows){ return rows.map(r=>r.map(csvEscape).join(",")).join("\n")+"\n"; }
function readSource(file=sourcePath){
  const rows=parseCsv(fs.readFileSync(file,"utf8"));
  const header=rows.shift();
  if(JSON.stringify(header)!==JSON.stringify(SOURCE_COLUMNS)) throw new Error(`Unexpected source header in ${file}`);
  return rows.map((r,index)=>({
    num:Number(r[0]), name:r[1], stance:r[2], part:Number(r[3]), seconds:Number(r[4]),
    family:r[5], subfamily:r[6], modifiers:r[7]?r[7].split("|").filter(Boolean):[],
    siblingKey:r[8], url:r[9]
  }));
}
function serializeSource(data){
  return toCsv([SOURCE_COLUMNS,...data.map(d=>[
    d.num,d.name,d.stance,d.part,d.seconds,d.family,d.subfamily,(d.modifiers||[]).join("|"),d.siblingKey,d.url
  ])]);
}
function formatTimestamp(seconds){
  const m=Math.floor(seconds/60);
  return `${m}:${(seconds-m*60).toFixed(1).padStart(4,"0")}`;
}
function dataJs(data){
  return "/* GENERATED FILE. Edit flatground-tricks-source.csv, then run scripts/update-flatground-data.mjs. */\n"+
    "window.FLATGROUND_TRICKS_DATA=[\n"+
    data.map((d,i)=>JSON.stringify(d)+(i<data.length-1?",":"")).join("\n")+"\n];\n";
}
function rawCsv(data){
  return toCsv([
    ["trick_number","trick_name","stance","part","caption_timestamp"],
    ...data.map(d=>[d.num,d.name,d.stance,d.part,formatTimestamp(d.seconds)])
  ]);
}
function updateStaticCounts(html,count){
  const desc=`A sortable digital compendium of ${count} flatground tricks performed by Jamie Griffin.`;
  html=html.replace(/A sortable digital compendium of \d+ flatground tricks performed by Jamie Griffin\./g,desc);
  html=html.replace(/aria-label="\d+-trick stance overview"/g,`aria-label="${count}-trick stance overview"`);
  html=html.replace(/(<span class="count" id="matchCount"[^>]*>)\d+ \/ \d+(<\/span>)/, `$1${count} / ${count}$2`);
  html=html.replace(/(<span class="mobileToolCount" id="mobileMatchCount">)\d+ \/ \d+(<\/span>)/, `$1${count} / ${count}$2`);
  return html;
}
function validateBatch(existing,batch){
  if(batch.length!==100) throw new Error(`A release batch must contain exactly 100 tricks; found ${batch.length}`);
  const nextNum=existing.length+1;
  const nextPart=Math.floor(existing.length/100)+1;
  if(batch[0]?.num!==nextNum) throw new Error(`Batch must begin at #${nextNum}; found #${batch[0]?.num}`);
  for(let i=0;i<batch.length;i++){
    const d=batch[i];
    if(d.num!==nextNum+i) throw new Error(`Batch numbering gap at row ${i+1}: expected #${nextNum+i}, found #${d.num}`);
    if(d.part!==nextPart) throw new Error(`Batch #${d.num} must be Part ${nextPart}; found Part ${d.part}`);
  }
  if(nextPart>10) throw new Error("The compendium is capped at Part X / 1,000 tricks");
}
function writeOutputs(data,writeSource=false){
  if(writeSource) fs.writeFileSync(sourcePath,serializeSource(data));
  fs.writeFileSync(dataPath,dataJs(data));
  fs.writeFileSync(rawPath,rawCsv(data));
  const html=updateStaticCounts(fs.readFileSync(htmlPath,"utf8"),data.length);
  fs.writeFileSync(htmlPath,html);
}
function checkOutputs(data){
  const failures=[];
  if(fs.readFileSync(dataPath,"utf8")!==dataJs(data)) failures.push("flatground-tricks-data.js");
  if(fs.readFileSync(rawPath,"utf8")!==rawCsv(data)) failures.push("flatground-tricks-data.csv");
  const currentHtml=fs.readFileSync(htmlPath,"utf8");
  if(currentHtml!==updateStaticCounts(currentHtml,data.length)) failures.push("flatground-tricks.html static count markers");
  if(failures.length) throw new Error("Generated files are out of date: "+failures.join(", ")+"\nRun: node scripts/update-flatground-data.mjs --write");
}

const args=process.argv.slice(2);
const templateIndex=args.indexOf("--template");
if(templateIndex>=0){
  const part=Number(args[templateIndex+1]);
  if(!Number.isInteger(part)||part<9||part>10) throw new Error("--template requires part 9 or 10");
  const start=(part-1)*100+1;
  const rows=[SOURCE_COLUMNS];
  for(let num=start;num<start+100;num++) rows.push([num,"","",part,"","","","","",""]);
  const out=path.resolve(process.cwd(),`flatground-part-${part}-template.csv`);
  fs.writeFileSync(out,toCsv(rows));
  console.log(`Created ${out} with rows #${start}–#${start+99}.`);
  process.exit(0);
}
const write=args.includes("--write");
const check=args.includes("--check") || !write;
const batchIndex=args.indexOf("--batch");
let data=readSource();

if(batchIndex>=0){
  const batchArg=args[batchIndex+1];
  if(!batchArg) throw new Error("--batch requires a CSV path");
  const batch=readSource(path.resolve(process.cwd(),batchArg));
  validateBatch(data,batch);
  data=[...data,...batch];
  if(!write){
    console.log(`Dry run OK: ${batch.length} new tricks would produce ${data.length} total / Part ${data.at(-1).part}.`);
    process.exit(0);
  }
  writeOutputs(data,true);
}else if(write){
  writeOutputs(data,false);
}

if(check) checkOutputs(data);
console.log(`Flatground data OK: ${data.length} tricks / ${Math.ceil(data.length/100)} parts.`);
