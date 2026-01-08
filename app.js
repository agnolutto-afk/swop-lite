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
