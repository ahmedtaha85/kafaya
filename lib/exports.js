const d10 = s => (s || "").slice(0, 10);
const usd = n => "$" + (+n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);
const itemsTxt = s => (s.items || []).map(l => l.name + (l.color ? " " + l.color : "") + (l.size ? " " + l.size : "") + " x" + l.qty).join(", ");
const perTxt = per => (per ? "Muddada: " + per + " maalmood ee u dambeeyay" : "Muddada: Dhammaan");

function monthRows({ sales, fin }) {
    const ms = [...new Set([...sales.map(s => s.created_at.slice(0, 7)), ...fin.map(f => f.entry_date.slice(0, 7))])].sort().reverse();
    return ms.map(m => {
        const sal = sum(sales.filter(s => s.created_at.startsWith(m)), s => s.total);
        const oth = sum(fin.filter(f => f.kind === "income" && f.entry_date.startsWith(m)), f => f.amount);
        const exp = sum(fin.filter(f => f.kind === "expense" && f.entry_date.startsWith(m)), f => f.amount);
        return { m, sal, oth, inc: sal + oth, exp, net: sal + oth - exp };
    });
}

export async function exportExcel(x) {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Xog: "Xog ma jirto" }]), name);

    add("Inventory", x.items.flatMap(p => (p.variants || []).map(v => ({
        Alaab: p.name, Qayb: x.cn(p.cat), Hoosqayb: p.sub || "", Midab: v.color || "", Cabbir: v.size || "", Tiro: +v.qty || 0, Qiimo: +p.price || 0
    }))));
    add("Iibka", x.salesP.map(s => ({
        Taariikh: d10(s.created_at), Macmiil: s.customer || "", Alaab: itemsTxt(s), Habka: s.method, Wadarta: +s.total || 0
    })));
    add("Maaliyadda", x.finP.map(f => ({
        Taariikh: f.entry_date, Nooca: f.kind === "income" ? "Dakhli" : "Kharash", Qayb: f.category, Faahfaahin: f.description || "", Lacag: +f.amount || 0, Habka: f.method || ""
    })));
    add("Bilaha", monthRows(x).map(r => ({ Bil: r.m, Iib: r.sal, "Dakhli kale": r.oth, Revenue: r.inc, Kharash: r.exp, Faaiido: r.net })));
    add("Dalabyada", x.reqs.map(r => ({
        Alaab: r.item, Qayb: x.cn(r.cat), Tiro: r.qty, Macmiil: r.customer || "", Telefoon: r.phone || "", Taariikh: r.need_date, Xaalad: r.status
    })));

    XLSX.writeFile(wb, "kafaya-warbixin-" + new Date().toISOString().slice(0, 10) + ".xlsx");
}

export async function exportPDF(type, x) {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const stamp = new Date().toISOString().slice(0, 10);
    const head = (title, sub) => {
        doc.setFontSize(16); doc.text("KAFAYA BOUTIQUE", 14, 15);
        doc.setFontSize(12); doc.text(title, 14, 22);
        doc.setFontSize(9); doc.setTextColor(110); doc.text((sub ? sub + "  |  " : "") + "Taariikh: " + stamp, 14, 27); doc.setTextColor(0);
    };
    const style = { headStyles: { fillColor: [114, 36, 62] }, styles: { fontSize: 9 } };
    let file = "warbixin";

    if (type === "sales") {
        file = "warbixinta-iibka";
        head("Warbixinta Iibka", perTxt(x.per));
        const rows = x.salesP.map(s => [d10(s.created_at), s.customer || "-", itemsTxt(s), s.method, usd(s.total)]);
        autoTable(doc, {
            startY: 31, head: [["Taariikh", "Macmiil", "Alaab", "Habka", "Wadarta"]], body: rows,
            foot: [["", "", "", "Wadarta guud (" + x.salesP.length + " iib)", usd(sum(x.salesP, s => s.total))]],
            footStyles: { fillColor: [240, 230, 235], textColor: 0 }, columnStyles: { 2: { cellWidth: 70 } }, ...style
        });
    } else if (type === "fin") {
        file = "warbixinta-maaliyadda";
        head("Warbixinta Maaliyadda", perTxt(x.per));
        const inc = sum(x.finP.filter(f => f.kind === "income"), f => f.amount);
        const exp = sum(x.finP.filter(f => f.kind === "expense"), f => f.amount);
        autoTable(doc, {
            startY: 31, head: [["Taariikh", "Nooca", "Qayb", "Faahfaahin", "Lacag", "Habka"]],
            body: x.finP.map(f => [f.entry_date, f.kind === "income" ? "Dakhli" : "Kharash", f.category, f.description || "", usd(f.amount), f.method || ""]),
            foot: [["", "", "", "Dakhli: " + usd(inc), "Kharash: " + usd(exp), "Net: " + usd(inc - exp)]],
            footStyles: { fillColor: [240, 230, 235], textColor: 0 }, ...style
        });
    } else if (type === "months") {
        file = "warbixinta-bilaha";
        head("Warbixinta Bilaha");
        autoTable(doc, {
            startY: 31, head: [["Bil", "Iib", "Dakhli kale", "Revenue", "Kharash", "Faa'iido"]],
            body: monthRows(x).map(r => [r.m, usd(r.sal), usd(r.oth), usd(r.inc), usd(r.exp), usd(r.net)]), ...style
        });
    } else {
        file = "warbixinta-inventory";
        head("Warbixinta Inventory");
        autoTable(doc, {
            startY: 31, head: [["Alaab", "Qayb", "Midab", "Cabbir", "Tiro", "Qiimo"]],
            body: x.items.flatMap(p => (p.variants || []).map(v => [p.name, x.cn(p.cat), v.color || "-", v.size || "-", v.qty, usd(p.price)])), ...style
        });
    }
    doc.save(file + "-" + stamp + ".pdf");
}