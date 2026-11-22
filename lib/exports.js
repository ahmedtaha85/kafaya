// Excel + PDF export (waxay ka shaqeeyaan browser-ka)
const money = n => "$" + (+n || 0).toFixed(2);
const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

const invRows = (items, cn) => items.flatMap(p => (p.variants?.length ? p.variants : [{}]).map(v => [p.name, cn(p.cat), p.sub || "", +p.price || 0, v.color || "", v.size || "", +v.qty || 0]));
const saleRows = sales => sales.map(s => [s.created_at.slice(0, 10), s.customer || "-", s.method, (s.items || []).map(l => l.name + " x" + l.qty).join(", "), +s.total || 0]);
const finRows = fin => fin.map(f => [f.entry_date, f.kind === "income" ? "Dakhli" : "Kharash", f.category || "", f.description || "", +f.amount || 0, f.method || ""]);
function monthRows(sales, fin) {
  const ms = [...new Set([...sales.map(s => s.created_at.slice(0, 7)), ...fin.map(f => f.entry_date.slice(0, 7))])].sort().reverse();
  return ms.map(m => {
    const sal = sum(sales.filter(s => s.created_at.startsWith(m)), s => s.total);
    const oth = sum(fin.filter(f => f.kind === "income" && f.entry_date.startsWith(m)), f => f.amount);
    const exp = sum(fin.filter(f => f.kind === "expense" && f.entry_date.startsWith(m)), f => f.amount);
    return [m, sal, oth, sal + oth, exp, sal + oth - exp];
  });
}

export async function exportExcel({ items, sales, fin, reqs, cn }) {
  const X = await import("xlsx"), wb = X.utils.book_new();
  const add = (name, head, rows) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([head, ...rows]), name);
  add("Inventory", ["Magac", "Qayb", "Hoos-qayb", "Qiimo", "Midab", "Cabbir", "Tiro"], invRows(items, cn));
  add("Iibka", ["Taariikh", "Macmiil", "Habka", "Alaab", "Wadarta"], saleRows(sales));
  add("Maaliyadda", ["Taariikh", "Nooc", "Qayb", "Faahfaahin", "Lacag", "Habka"], finRows(fin));
  add("Bilaha", ["Bil", "Iib", "Dakhli kale", "Revenue guud", "Kharash", "Faa'iido"], monthRows(sales, fin));
  add("Dalabyada", ["Alaab", "Qayb", "Tiro", "Suuq", "Supplier", "Qiimo xabbo", "Shipping", "Wadarta", "Dalab taariikh", "ETA", "Tracking", "Xaalad"], reqs.map(r => [r.item, cn(r.cat), r.qty, r.origin, r.supplier || "", +r.unit_cost || 0, +r.shipping || 0, (+r.qty || 0) * (+r.unit_cost || 0) + (+r.shipping || 0), r.order_date, r.eta || "", r.tracking || "", r.status]));
  const buf = X.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "kafaya-warbixin-" + new Date().toISOString().slice(0, 10) + ".xlsx");
}

export async function exportPDF(kind, { items, sales, fin, cn, salesP, finP, per }) {
  const jm = await import("jspdf"), J = jm.jsPDF || jm.default, at = await import("jspdf-autotable");
  const span = per ? per + " maalmood" : "dhammaan";
  const cfg = {
    inv: ["Inventory", ["Magac", "Qayb", "Hoos-qayb", "Qiimo", "Midab", "Cabbir", "Tiro"], invRows(items, cn).map(r => [r[0], r[1], r[2], money(r[3]), r[4], r[5], r[6]]), ["Wadarta", "", "", "", "", "", String(sum(items, p => (p.variants || []).reduce((a, v) => a + (+v.qty || 0), 0)))]],
    sales: ["Iibka (" + span + ")", ["Taariikh", "Macmiil", "Habka", "Alaab", "Wadarta"], saleRows(salesP).map(r => [r[0], r[1], r[2], r[3], money(r[4])]), ["Wadarta", "", "", "", money(sum(salesP, s => s.total))]],
    fin: ["Maaliyadda (" + span + ")", ["Taariikh", "Nooc", "Qayb", "Faahfaahin", "Lacag", "Habka"], finRows(finP).map(r => [r[0], r[1], r[2], r[3], money(r[4]), r[5]]), null],
    months: ["Bilaha", ["Bil", "Iib", "Dakhli kale", "Revenue guud", "Kharash", "Faa'iido"], monthRows(sales, fin).map(r => [r[0], money(r[1]), money(r[2]), money(r[3]), money(r[4]), money(r[5])]), null],
  }[kind];
  const d = new J();
  d.setFontSize(16); d.setTextColor(114, 36, 62); d.text("KAFAYA BOUTIQUE", 14, 14);
  d.setFontSize(11); d.setTextColor(70); d.text(cfg[0] + "  -  " + new Date().toISOString().slice(0, 10), 14, 21);
  const opts = { startY: 26, head: [cfg[1]], body: cfg[2], foot: cfg[3] ? [cfg[3]] : undefined, styles: { fontSize: 9 }, headStyles: { fillColor: [114, 36, 62] }, footStyles: { fillColor: [246, 228, 230], textColor: [114, 36, 62] } };
  const fn = at.default || at.autoTable;
  if (typeof fn === "function") fn(d, opts); else d.autoTable(opts);
  download(d.output("blob"), "kafaya-" + kind + ".pdf");
}

export async function exportCustomers(custs) {
  const X = await import("xlsx"), wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Magac", "Telefoon", "Jeer", "Wadarta ($)", "Markii u dambeysay"], ...custs.map(c => [c.name, c.phone, c.visits, c.total, c.last.slice(0, 10)])]), "Macaamiisha");
  download(new Blob([X.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "kafaya-macaamiisha.xlsx");
}
