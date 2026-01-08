function $(id){ return document.getElementById(id); }

// ---------------- Navigation ----------------
function show(viewId, btnId){
  ["view-scan","view-runes","view-optimizer"].forEach(v=>$(v).classList.remove("active"));
  $(viewId).classList.add("active");
  ["btnScan","btnRunes","btnOpti"].forEach(b=>$(b).classList.remove("active"));
  $(btnId).classList.add("active");
}

$("btnScan").onclick  = ()=>show("view-scan","btnScan");
$("btnRunes").onclick = ()=>{ show("view-runes","btnRunes"); renderRunes(); };
$("btnOpti").onclick  = ()=>show("view-optimizer","btnOpti");

// ---------------- Storage ----------------
const KEY_RUNES = "swop_lite_runes_v1";

function loadRunes(){
  try { return JSON.parse(localStorage.getItem(KEY_RUNES) || "[]"); }
  catch { return []; }
}
function saveRunes(runes){
  localStorage.setItem(KEY_RUNES, JSON.stringify(runes));
}

function uid(){
  return (crypto?.randomUUID?.() || (Date.now()+"-"+Math.random().toString(16).slice(2)));
}

// ---------------- Scan: multi images + crop preview ----------------
let files = [];
let idx = 0;

function getCropPct(){
  const x = (parseFloat($("cropX").value)||0)/100;
  const y = (parseFloat($("cropY").value)||0)/100;
  const w = (parseFloat($("cropW").value)||100)/100;
  const h = (parseFloat($("cropH").value)||100)/100;
  return {x,y,w,h};
}

function setInfo(){
  if(!files.length){
    $("scanInfo").textContent = "Aucune image.";
    $("imgMeta").textContent = "";
    $("imgPreview").style.display = "none";
    $("cropPreview").style.display = "none";
    return;
  }
  $("scanInfo").textContent = `Images: ${files.length} — ${idx+1}/${files.length} — ${files[idx].name}`;
}

function loadImageFromFile(file){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function cropToUrls(file, cropPct){
  const img = await loadImageFromFile(file);
  const W = img.naturalWidth, H = img.naturalHeight;

  const sx = Math.round(cropPct.x*W);
  const sy = Math.round(cropPct.y*H);
  const sw = Math.round(cropPct.w*W);
  const sh = Math.round(cropPct.h*H);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, sw);
  canvas.height = Math.max(1, sh);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  return { fullUrl: img.src, cropUrl: canvas.toDataURL("image/png"), meta:`${W}x${H} | crop x=${sx} y=${sy} w=${sw} h=${sh}` };
}

function showFullPreview(){
  if(!files.length) return;
  $("imgPreview").src = URL.createObjectURL(files[idx]);
  $("imgPreview").style.display = "block";
  $("cropPreview").style.display = "none";
  $("imgMeta").textContent = "";
}

$("scanInput").addEventListener("change", (e)=>{
  files = Array.from(e.target.files || []);
  idx = 0;
  setInfo();
  if(files.length) showFullPreview();
});

$("btnNextImg").addEventListener("click", ()=>{
  if(!files.length) return;
  idx = (idx+1) % files.length;
  setInfo();
  showFullPreview();
});
$("btnPrevImg").addEventListener("click", ()=>{
  if(!files.length) return;
  idx = (idx-1+files.length) % files.length;
  setInfo();
  showFullPreview();
});

$("btnPreviewCrop").addEventListener("click", async ()=>{
  if(!files.length) return;
  setInfo();
  const out = await cropToUrls(files[idx], getCropPct());
  $("imgPreview").src = out.fullUrl;
  $("imgPreview").style.display = "block";
  $("cropPreview").src = out.cropUrl;
  $("cropPreview").style.display = "block";
  $("imgMeta").textContent = out.meta;
});

// ---------------- Manual add rune (for now) ----------------
$("btnSaveRune").addEventListener("click", ()=>{
  const rune = {
    id: uid(),
    set: $("fSet").value.trim(),
    slot: $("fSlot").value.trim(),
    stars: $("fStars").value.trim(),
    grade: $("fGrade").value.trim(),
    level: $("fLevel").value.trim(),
    main: $("fMain").value.trim(),
    subs: ($("fSubs").value || "").split("\n").map(s=>s.trim()).filter(Boolean),
    locked: $("fLocked").checked,
    createdAt: Date.now()
  };

  if(!rune.set || !rune.slot){
    $("saveMsg").textContent = "❌ Set et Slot obligatoires.";
    return;
  }

  const runes = loadRunes();
  runes.push(rune);
  saveRunes(runes);

  $("saveMsg").textContent = `✅ Rune enregistrée. Total: ${runes.length}`;
  $("fMain").value = "";
  $("fSubs").value = "";
});

// ---------------- Runes list ----------------
function runeLine(r){
  const parts = [
    `Slot ${r.slot}`,
    r.set,
    r.stars ? `${r.stars}★` : "",
    r.level || "",
    r.grade || "",
    r.locked ? "LOCK" : ""
  ].filter(Boolean).join(" • ");

  const detail = []
    .concat(r.main ? [`Main: ${r.main}`] : [])
    .concat(r.subs?.length ? [`Subs: ${r.subs.join(", ")}`] : [])
    .join(" | ");

  return `${parts}\n  ${detail}`;
}

function renderRunes(){
  const runes = loadRunes();
  $("runeCount").textContent = `Total runes: ${runes.length}`;
  const out = runes.map((r,i)=>`#${i+1} ${runeLine(r)}`).join("\n\n");
  $("runeList").textContent = out || "(vide)";
}

$("btnExport").addEventListener("click", ()=>{
  const data = JSON.stringify(loadRunes(), null, 2);
  navigator.clipboard?.writeText(data).then(()=>{
    alert("✅ JSON copié dans le presse-papier");
  }).catch(()=>{
    alert("❌ Impossible de copier. (autorisation navigateur)");
  });
});

$("btnClear").addEventListener("click", ()=>{
  if(!confirm("Tout effacer ?")) return;
  saveRunes([]);
  renderRunes();
});
// ---------------- OCR batch ----------------
async function ocrCropFromCurrentImage() {
  if (!files.length) return;

  const cropPct = getCropPct();
  const out = await cropToUrls(files[idx], cropPct);

  $("imgMeta").textContent = "OCR en cours...";

  const result = await Tesseract.recognize(
  out.cropUrl,
  "eng",
  {
    logger: m => $("imgMeta").textContent = `OCR ${Math.round((m.progress||0)*100)}%`,
    tessedit_pageseg_mode: "6",
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%+.-(): \n"
  }
);

  const cleaned = cleanAndFormatOcr(result.data.text || "");
$("imgMeta").textContent = cleaned || "(aucun texte détecté)";
fillFormFromOCR(cleaned);
async function ocrBatchAll() {
  if (!files.length) return;

  for (let i = 0; i < files.length; i++) {
    idx = i;
    setInfo();
    await ocrCropFromCurrentImage();
    await new Promise(r => setTimeout(r, 300)); // pause légère pour le mobile
  }
}
// ================== OCR PARSING ==================
function cleanAndFormatOcr(raw){
  let t = (raw || "").replace(/\r/g, " ");

  // Corrige erreurs OCR fréquentes
  t = t.toUpperCase()
       .replace(/SWIIT/g, "SWIFT")
       .replace(/SWI1T/g, "SWIFT")
       .replace(/S W I F T/g, "SWIFT");

  // Supprime bruit très fréquent
  t = t.replace(/\b\d+\/\d+\b/g, " ");           // ex 162/2234
  t = t.replace(/TEMPORARILY|POWER[- ]?UP|SELL/gi, " ");

  // Force des "lignes" en mettant \n avant des patterns utiles
  // 1) Titre rune
  t = t.replace(/(\+\d+\s+[^]*?RUNE\s*\(\d\))/g, "\n$1\n");

  // 2) Main/Sub stats : ATK +160 / HP +17% / SPD +25 / ACCURACY +7% etc.
  t = t.replace(/(ATK|HP|DEF|SPD|ACCURACY|RESISTANCE|CR|CD)\s*\+\s*\d+(\+\d+)?%?/g, "\n$1 +$0".replace("$1 +","") );

  // La ligne ci-dessus peut être trop aggressive selon navigateur,
  // donc on fait une version plus sûre juste après :
  t = t.replace(/(ATK|HP|DEF|SPD|ACCURACY|RESISTANCE|CR|CD)\s*\+\s*/g, "\n$1 +");

  // 3) Ligne set bonus
  t = t.replace(/(\d+\s*SET\s*:\s*SPD\s*\+\s*\d+%)/g, "\n$1\n");

  // Nettoyage final
  t = t.replace(/[“”‘’]/g, '"')
       .replace(/[^\S\n]+/g, " ")
       .replace(/\n+/g, "\n")
       .trim();

  return t;
}
// normalisation texte OCR
function normText(t){
  return (t||"")
    .replace(/[^\S\r\n]+/g," ")
    .replace(/,/g,".")
    .toUpperCase();
}

// sets connus
const SETS = [
  "VIOLENT","WILL","SWIFT","DESPAIR","RAGE","FATAL","BLADE",
  "ENERGY","GUARD","SHIELD","REVENGE","NEMESIS","DESTROY",
  "FOCUS","ACCURACY","ENDURE","TOLERANCE","FIGHT","DETERMINATION","ENHANCE",
  "SEAL","INTANGIBLE"
];

// stats connues
const STAT_KEYS = ["SPD","HP%","ATK%","DEF%","CR","CD","ACC","RES","HP","ATK","DEF"];

function detectSet(text){
  for(const s of SETS){
    if(text.includes(s)) return s;
  }
  return "";
}

function detectSlot(text){
  const m = text.match(/SLOT\s*([1-6])/);
  if(m) return m[1];
  return "";
}

function detectStars(text){
  const m = text.match(/([4-6])\s*STAR/);
  return m ? m[1] : "";
}

function detectLevel(text){
  const m = text.match(/\+(\d{1,2})/);
  return m ? "+"+m[1] : "";
}

function detectMainStat(text){
  for(const k of STAT_KEYS){
    const re = new RegExp(k.replace("%","\\%")+"\\s*\\+","i");
    if(re.test(text)) return k;
  }
  return "";
}

function detectSubstats(text){
  const subs = [];
  const lines = (text || "").split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of lines) {

    // Ignore le bruit évident
    if (/\b\d+\/\d+\b/.test(line)) continue; // 162/2234
    if (/POWER|SELL|TEMPORARILY/i.test(line)) continue;

    // SPD +25 | SPD +21+4
    if (/^SPD\s*\+\d+(\+\d+)?$/i.test(line)) {
      subs.push(line);
      continue;
    }

    // HP +17% | HP +11%+6%
    if (/^HP\s*\+\d+%(\+\d+%)?$/i.test(line)) {
      subs.push(line);
      continue;
    }

    // HP +565 | HP +138+427
    if (/^HP\s*\+\d+(\+\d+)?$/i.test(line)) {
      subs.push(line);
      continue;
    }

    // ATK / DEF / ACC / RES
    if (/^(ATK|DEF|ACCURACY|RESISTANCE)\s*\+\d+%?(\+\d+%?)?$/i.test(line)) {
      subs.push(line);
      continue;
    }
  }

  return [...new Set(subs)];
}

// Remplit le formulaire à partir du texte OCR
function fillFormFromOCR(text){
  const t = fixCommonOcr(normText(text));

  $("fSet").value   = detectSet(t);
  $("fSlot").value  = detectSlot(t);
  $("fStars").value = detectStars(t);
  $("fLevel").value = detectLevel(t);

  const main = detectMainStat(t);
  $("fMain").value = main;

  const subs = detectSubstats(text);
  $("fSubs").value = subs.filter(s => !s.includes(main)).join("\n");
}
