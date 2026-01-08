function $(id) {
  return document.getElementById(id);
}

function show(view) {
  ["view-scan", "view-runes", "view-optimizer"].forEach(v => {
    $(v).classList.remove("active");
  });
  view.classList.add("active");

  ["btnScan", "btnRunes", "btnOpti"].forEach(b => {
    $(b).classList.remove("active");
  });
}

$("btnScan").onclick = () => {
  show($("view-scan"));
  $("btnScan").classList.add("active");
};

$("btnRunes").onclick = () => {
  show($("view-runes"));
  $("btnRunes").classList.add("active");
};

$("btnOpti").onclick = () => {
  show($("view-optimizer"));
  $("btnOpti").classList.add("active");
};

$("scanInput").addEventListener("change", e => {
  alert(e.target.files.length + " image(s) sélectionnée(s)");
});
