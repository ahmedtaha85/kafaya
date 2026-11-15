"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CATS = [["abaya", "Abayad"], ["tarxad", "Tarxado"], ["xijaab", "Xijaabyo"], ["saraawiil", "Saraawiil"], ["dirac", "Dirac"], ["kabo", "Kabo"], ["gabsaar", "Gabsaar"], ["caruur", "Dharka Caruurta"]];
const SUBS = ["Rajatin", "Nigis", "Open"];
const RST = ["La doonayo", "La dalbaday", "Yimid", "Waa la dhiibay"];
const ADMIN_PHONE = "+252000000000"; // <-- BEDDEL: number-ka maamulka
const LOW = 3;
const tot = p => (p.variants || []).reduce((a, v) => a + (+v.qty || 0), 0);
const st = p => { const t = tot(p); return t <= 0 ? "out" : t <= LOW ? "low" : "ok"; };
const STL = { ok: "Wuu jiraa", low: "Stock hoose", out: "Dhammaaday" };
const cn = k => (CATS.find(c => c[0] === k) || [0, k])[1];

const Logo = () => (
  <svg width="44" height="44" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="none" stroke="#c9a227" strokeWidth="2.5" />
    <text x="32" y="43" textAnchor="middle" fontFamily="Georgia,serif" fontSize="28" fontWeight="700" fill="#fff">KB</text></svg>
);

export default function Page() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return null;
  return session ? <App session={session} /> : <Login />;
}

function Login() {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState("");
  async function go(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setErr("Email ama password waa khalad.");
  }
  return (
    <form className="card login" onSubmit={go} style={{ display: "grid", gap: 12 }}>
      <div style={{ textAlign: "center" }}><h1 style={{ margin: 0, color: "var(--mar)", fontFamily: "Cormorant Garamond,serif", letterSpacing: 3 }}>KAFAYA BOUTIQUE</h1><span className="mut">Gal nidaamka maamulka</span></div>
      <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" required placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} />
      {err && <div className="err">{err}</div>}
      <button>Gal</button>{ADMIN_PHONE && <p className="mut" style={{ textAlign: "center", margin: 0 }}>Cilad? Wac maamulka: <a href={"tel:" + ADMIN_PHONE.replace(/\s/g, "")}>{ADMIN_PHONE}</a></p>}
    </form>
  );
}

const ICON = { abaya: "👘", tarxad: "🧣", xijaab: "🧕", saraawiil: "👖", dirac: "👗", kabo: "👠", gabsaar: "👜", caruur: "🧒" };
const NAV = [["dash", "📊", "Dashboard"], ["inv", "📦", "Inventory"], ["sales", "🧾", "Sales"], ["fin", "💰", "Finance"], ["req", "📝", "Dalabyada"], ["rep", "📄", "Reports"]];
const METHODS = ["Cash", "EVC Plus", "E-Dahab", "Bank", "Card"];
const EXPC = ["Kiro", "Mushahar", "Alaab iibsasho", "Gaadiid", "Korontada/Biyaha", "Suuq-geyn", "Kale"];
const money = n => "$" + (+n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);

function App({ session }) {
  const [items, setItems] = useState([]), [sales, setSales] = useState([]), [fin, setFin] = useState([]);
  const [cat, setCat] = useState("all"), [q, setQ] = useState(""), [view, setView] = useState("dash"), [mode, setMode] = useState("grid"), [edit, setEdit] = useState(null), [menu, setMenu] = useState(false);
  const [sub, setSub] = useState(""), [reqs, setReqs] = useState([]), [rf, setRf] = useState("today"), [rn, setRn] = useState({ item: "", cat: "abaya", details: "", qty: 1, customer: "", phone: "", need_date: today(), status: "La doonayo", note: "" }), [fm, setFm] = useState("all"), [proof, setProof] = useState(null);
  const [cart, setCart] = useState([]), [cust, setCust] = useState(""), [method, setMethod] = useState("Cash"), [pick, setPick] = useState(""), [qty, setQty] = useState(1), [cp, setCp] = useState("");
  const [fe, setFe] = useState({ kind: "expense", category: EXPC[0], description: "", amount: "", method: "Cash", date: today() }), [per, setPer] = useState(30);
  const load = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from("catalog_items").select("*").order("created_at", { ascending: false }),
      supabase.from("store_sales").select("*").order("created_at", { ascending: false }),
      supabase.from("store_finance").select("*").order("entry_date", { ascending: false }),
      supabase.from("store_requests").select("*").order("need_date", { ascending: true })]);
    setItems(a.data || []); setSales(b.data || []); setFin(c.data || []); setReqs(d.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const name = (session.user.email || "").split("@")[0];
  const match = p => !q || (p.name + " " + (p.variants || []).map(v => v.color + " " + v.size).join(" ")).toLowerCase().includes(q.toLowerCase());
  const list = items.filter(p => (cat === "all" || p.cat === cat) && (!sub || p.sub === sub) && match(p));
  const alerts = items.filter(p => st(p) !== "ok");
  const qtyAll = sum(items, tot), stockVal = sum(items, p => tot(p) * (+p.price || 0));
  const mk = today().slice(0, 7), inM = d => (d || "").slice(0, 7) === mk;
  const incM = sum(sales.filter(s => inM(s.created_at)), s => s.total) + sum(fin.filter(f => f.kind === "income" && inM(f.entry_date)), f => f.amount);
  const expM = sum(fin.filter(f => f.kind === "expense" && inM(f.entry_date)), f => f.amount);
  const salesToday = sum(sales.filter(s => s.created_at.slice(0, 10) === today()), s => s.total);
  const days = [6, 5, 4, 3, 2, 1, 0].map(k => { const d = new Date(Date.now() - k * 864e5).toISOString().slice(0, 10); return { d: d.slice(5), v: sum(sales.filter(s => s.created_at.slice(0, 10) === d), s => s.total) }; });
  const months = [5, 4, 3, 2, 1, 0].map(k => { const t = new Date(new Date().getFullYear(), new Date().getMonth() - k, 1), m = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0"); return { m, Dakhli: sum(sales.filter(s => s.created_at.startsWith(m)), s => s.total) + sum(fin.filter(f => f.kind === "income" && f.entry_date.startsWith(m)), f => f.amount), Kharash: sum(fin.filter(f => f.kind === "expense" && f.entry_date.startsWith(m)), f => f.amount) }; });
  const opts = items.flatMap(p => (p.variants || []).map((v, i) => ({ key: p.id + "|" + i, p, i, v }))).filter(o => o.v.qty > 0);
  const cartTotal = sum(cart, l => l.qty * l.price);
  const cut = per ? Date.now() - per * 864e5 : 0;
  const salesP = sales.filter(s => new Date(s.created_at) >= cut), finP = fin.filter(f => new Date(f.entry_date) >= cut);
  const incP = sum(salesP, s => s.total) + sum(finP.filter(f => f.kind === "income"), f => f.amount), expP = sum(finP.filter(f => f.kind === "expense"), f => f.amount);
  const top = Object.values(salesP.flatMap(s => s.items || []).reduce((a, l) => { (a[l.name] = a[l.name] || { n: l.name, qty: 0, rev: 0 }); a[l.name].qty += +l.qty; a[l.name].rev += l.qty * l.price; return a; }, {})).sort((a, b) => b.qty - a.qty).slice(0, 6);
  const byM = METHODS.map(m => ({ m, v: sum(salesP.filter(s => s.method === m), s => s.total) })).filter(x => x.v > 0);
  const byCat = CATS.map(c => ({ k: c[0], n: c[1], qty: sum(items.filter(p => p.cat === c[0]), tot) })), maxQ = Math.max(1, ...byCat.map(c => c.qty));
  const go = v => { setView(v); setMenu(false); };

  const monthsAll = [...new Set([...sales.map(s => s.created_at.slice(0, 7)), ...fin.map(f => f.entry_date.slice(0, 7))])].sort().reverse();
  const mRow = m => ({ inc: sum(sales.filter(s => s.created_at.startsWith(m)), s => s.total) + sum(fin.filter(f => f.kind === "income" && f.entry_date.startsWith(m)), f => f.amount), exp: sum(fin.filter(f => f.kind === "expense" && f.entry_date.startsWith(m)), f => f.amount) });
  const finList = fin.filter(f => fm === "all" || f.entry_date.startsWith(fm));
  const reqList = reqs.filter(r => rf === "all" ? true : rf === "today" ? (r.need_date <= today() && r.status !== "Waa la dhiibay") : r.status === rf);
  const reqOpen = reqs.filter(r => r.need_date <= today() && r.status !== "Waa la dhiibay").length;
  async function addReq(e) { e.preventDefault(); await supabase.from("store_requests").insert({ ...rn, qty: +rn.qty || 1 }); setRn({ ...rn, item: "", details: "", customer: "", phone: "", note: "" }); load(); }
  async function setStatus(r, status) { await supabase.from("store_requests").update({ status }).eq("id", r.id); load(); }
  async function openProof(path) { const { data } = await supabase.storage.from("proofs").createSignedUrl(path, 120); if (data) window.open(data.signedUrl, "_blank"); }
  async function del(p) { if (confirm("Ma hubtaa inaad tirtirto " + p.name + "?")) { await supabase.from("catalog_items").delete().eq("id", p.id); load(); } }
  async function adj(p, i, d) {
    const v = p.variants.map((x, j) => j === i ? { ...x, qty: Math.max(0, (+x.qty || 0) + d) } : x);
    setItems(items.map(x => x.id === p.id ? { ...x, variants: v } : x));
    await supabase.from("catalog_items").update({ variants: v }).eq("id", p.id);
  }
  function addCart() {
    const o = opts.find(o => o.key === pick); if (!o) return;
    const inCart = sum(cart.filter(l => l.key === pick), l => l.qty);
    if (+qty < 1 || inCart + +qty > o.v.qty) return alert("Stock-ga kuma filna. Haray: " + (o.v.qty - inCart));
    setCart([...cart, { key: pick, id: o.p.id, i: o.i, name: o.p.name, color: o.v.color, size: o.v.size, qty: +qty, price: +cp || 0 }]); setPick(""); setQty(1); setCp("");
  }
  async function sell() {
    if (!cart.length) return;
    const upd = {};
    cart.forEach(l => { const p = upd[l.id] || items.find(x => x.id === l.id); upd[l.id] = { ...p, variants: p.variants.map((x, j) => j === l.i ? { ...x, qty: Math.max(0, x.qty - l.qty) } : x) }; });
    for (const id in upd) await supabase.from("catalog_items").update({ variants: upd[id].variants }).eq("id", id);
    await supabase.from("store_sales").insert({ customer: cust, method, total: cartTotal, items: cart.map(({ id, i, name, color, size, qty, price }) => ({ id, i, name, color, size, qty, price })) });
    setCart([]); setCust(""); load();
  }
  async function cancelSale(s) {
    if (!confirm("Jooji iibkan oo stock-ga soo celi?")) return;
    for (const l of s.items || []) { const p = items.find(x => x.id === l.id); if (p) await supabase.from("catalog_items").update({ variants: p.variants.map((x, j) => j === l.i ? { ...x, qty: (+x.qty || 0) + +l.qty } : x) }).eq("id", l.id); }
    await supabase.from("store_sales").delete().eq("id", s.id); load();
  }
  async function addEntry(e) {
    e.preventDefault(); let proof_url = null;
    if (proof) { const path = crypto.randomUUID() + "-" + proof.name.replace(/[^\w.]/g, "_"); const { error } = await supabase.storage.from("proofs").upload(path, proof); if (error) return alert("Sawirka lama upload gareyn karin: " + error.message); proof_url = path; }
    await supabase.from("store_finance").insert({ kind: fe.kind, category: fe.category, description: fe.description, amount: +fe.amount, method: fe.method, entry_date: fe.date, proof_url });
    setFe({ ...fe, description: "", amount: "" }); setProof(null); load();
  }
  const rows = () => items.flatMap(p => (p.variants?.length ? p.variants : [{}]).map(v => ({ Magac: p.name, Qayb: cn(p.cat), Qiimo: p.price, Midab: v.color || "", Cabbir: v.size || "", Tiro: v.qty || 0 })));
  async function xlsx() {
    const X = await import("xlsx"), wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows()), "Inventory");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(sales.map(s => ({ Taariikh: s.created_at.slice(0, 10), Macmiil: s.customer, Habka: s.method, Wadarta: s.total, Alaab: (s.items || []).map(l => l.name + " x" + l.qty).join(", ") }))), "Sales");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(fin.map(f => ({ Taariikh: f.entry_date, Nooc: f.kind, Qayb: f.category, Faahfaahin: f.description, Lacag: f.amount, Habka: f.method }))), "Finance");
    X.writeFile(wb, "kafaya-warbixin.xlsx");
  }
  async function pdf() {
    const { default: J } = await import("jspdf"), AT = (await import("jspdf-autotable")).default, d = new J();
    d.setFontSize(16); d.text("KAFAYA BOUTIQUE - Inventory", 14, 15);
    AT(d, { startY: 22, head: [["Magac", "Qayb", "Qiimo", "Midab", "Cabbir", "Tiro"]], body: rows().map(r => Object.values(r)), headStyles: { fillColor: [114, 36, 62] } }); d.save("kafaya-inventory.pdf");
  }
  const Ic = ({ p }) => <div className="ic">{p.img ? <img alt="" src={p.img} /> : ICON[p.cat] || "🛍️"}</div>;

  return (
    <div className="app">
      <aside className={"side" + (menu ? " open" : "")}>
        <div className="brand"><Logo /><div><b>KAFAYA</b><small>BOUTIQUE · Ku Filan</small></div></div>
        {NAV.map(n => <button key={n[0]} className={"nav" + (view === n[0] ? " on" : "")} onClick={() => go(n[0])}>{n[1]} {n[2]}{n[0] === "inv" && alerts.length > 0 && <span className="n">{alerts.length}</span>}{n[0] === "req" && reqOpen > 0 && <span className="n">{reqOpen}</span>}</button>)}
        {ADMIN_PHONE && <a className="help" href={"tel:" + ADMIN_PHONE.replace(/\s/g, "")}>📞 Cilad? Wac maamulka<br /><b>{ADMIN_PHONE}</b></a>}
        <div className="user">{session.user.email}<button className="g sm" onClick={() => supabase.auth.signOut()}>Ka bax</button></div>
      </aside>
      <div className="main">
        <div className="top">
          <button className="burger" onClick={() => setMenu(!menu)}>☰</button><h2>{NAV.find(n => n[0] === view)[2]}</h2>
          {view === "inv" ? <input placeholder="Raadi alaab, midab ama cabbir..." value={q} onChange={e => setQ(e.target.value)} /> : <span style={{ flex: 1 }} />}
          <button onClick={() => { setEdit({}); }}>+ Alaab</button>
        </div>
        <div className="page">
          {view === "dash" && <>
            <div className="hello"><h1>Soo dhawoow, {name} 👋</h1><p>Soo koobidda dukaanka.</p></div>
            <div className="stats">{[["c1", "🧾", money(salesToday), "Iibka maanta"], ["c2", "📈", money(incM - expM), "Faa'iidada bishan"], ["c3", "📦", qtyAll, "Xabbadaha stock-ga"], ["c4", "⚠️", alerts.length, "Digniino stock"]].map(s => <div className={"stat " + s[0]} key={s[3]}><div className="ic">{s[1]}</div><div><b>{s[2]}</b><span>{s[3]}</span></div></div>)}</div>
            <div className="cols">
              <div className="card"><h3>Iibka 7-dii maalmood</h3><ResponsiveContainer width="100%" height={220}><BarChart data={days}><XAxis dataKey="d" /><YAxis /><Tooltip /><Bar dataKey="v" fill="#72243e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <div className="card"><h3>Digniinaha stock-ga</h3>{alerts.length === 0 && <p className="mut">Wax digniin ah ma jiraan 👍</p>}{alerts.slice(0, 6).map(p => <div className="li" key={p.id}><Ic p={p} /><div className="t"><b>{p.name}</b><span className="mut">{cn(p.cat)}</span></div><span className={"badge " + st(p)}>{tot(p)}</span></div>)}</div>
              <div className="card"><h3>Iibkii ugu dambeeyay</h3>{sales.slice(0, 5).map(s => <div className="li" key={s.id}><div className="ic">🧾</div><div className="t"><b>{s.customer || "Macmiil"}</b><span className="mut">{s.method} · {s.created_at.slice(0, 10)}</span></div><b className="price">{money(s.total)}</b></div>)}{sales.length === 0 && <p className="mut">Weli iib ma jiro.</p>}</div>
              <div className="card"><h3>Qaybaha</h3>{byCat.map(c => <div className="li" key={c.k}><div className="ic">{ICON[c.k]}</div><div className="t"><b>{c.n}</b><div className="bar"><i style={{ width: c.qty / maxQ * 100 + "%" }} /></div></div><span className="mut">{c.qty}</span></div>)}</div>
            </div></>}

          {view === "inv" && <>
            <div className="row" style={{ marginBottom: 12 }}><div className="seg"><button className={mode === "grid" ? "on" : ""} onClick={() => setMode("grid")}>Kaararka</button><button className={mode === "table" ? "on" : ""} onClick={() => setMode("table")}>Shaxda stock-ga</button></div><span className="mut">Qiimaha stock-ga: {money(stockVal)}</span></div>
            <div className="tabs">{[["all", "Dhammaan"], ...CATS].map(c => <button key={c[0]} className={"tab" + (cat === c[0] ? " on" : "")} onClick={() => { setCat(c[0]); setSub(""); }}>{c[1]}</button>)}</div>
            {cat === "abaya" && <div className="tabs">{["", ...SUBS].map(x => <button key={x} className={"tab" + (sub === x ? " on" : "")} onClick={() => setSub(x)}>{x || "Dhammaan Abayad"}</button>)}</div>}
            {mode === "grid" ? <div className="grid">{list.length === 0 && <p className="mut">Alaab lama helin.</p>}{list.map(p => <div className="item" key={p.id}><div className="ph">{p.img ? <img alt="" src={p.img} /> : ICON[p.cat]}</div><div className="bd"><h4>{p.name}</h4><span className="mut">{cn(p.cat)}{p.sub ? " · " + p.sub : ""}</span>{p.price > 0 && <div className="price">{money(p.price)}</div>}<div>{(p.variants || []).map((v, i) => <span className="chip" key={i}>{v.color || "-"} · {v.size || "-"} · {v.qty}</span>)}</div><span className={"badge " + st(p)}>{STL[st(p)]} · {tot(p)}</span><div className="row"><button className="g sm" onClick={() => setEdit(p)}>Wax ka beddel</button><button className="g sm" onClick={() => del(p)}>Tirtir</button></div></div></div>)}</div>
              : <div className="card wrap"><table><thead><tr><th>Alaab</th><th>Midab</th><th>Cabbir</th><th>Tiro</th><th>Xaalad</th></tr></thead><tbody>{list.flatMap(p => (p.variants || []).map((v, i) => { const s = v.qty <= 0 ? "out" : v.qty <= LOW ? "low" : "ok"; return <tr key={p.id + i}><td><b>{p.name}</b></td><td>{v.color || "-"}</td><td>{v.size || "-"}</td><td><span className="qty"><button className="g" onClick={() => adj(p, i, -1)}>−</button><b>{v.qty}</b><button onClick={() => adj(p, i, 1)}>+</button></span></td><td><span className={"badge " + s}>{STL[s]}</span></td></tr>; }))}</tbody></table></div>}
          </>}

          {view === "sales" && <div className="split">
            <div className="card gap"><h3>Iib cusub</h3>
              <label>Alaabta<select value={pick} onChange={e => { setPick(e.target.value); const o = opts.find(o => o.key === e.target.value); if (o) setCp(o.p.price || ""); }}><option value="">Dooro alaab...</option>{opts.map(o => <option key={o.key} value={o.key}>{o.p.name} · {o.v.color || "-"} · {o.v.size || "-"} ({o.v.qty})</option>)}</select></label>
              <div className="two"><label>Tirada<input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></label><label>Qiimaha ($)<input type="number" step="0.01" value={cp} onChange={e => setCp(e.target.value)} /></label></div>
              <button className="g" onClick={addCart}>+ Ku dar gaarigga</button>
              {cart.map((l, i) => <div className="li" key={i}><div className="t"><b>{l.name}</b><span className="mut">{l.color || "-"} · {l.size || "-"} · {l.qty} × {money(l.price)}</span></div><b>{money(l.qty * l.price)}</b><button className="g sm" onClick={() => setCart(cart.filter((_, j) => j !== i))}>×</button></div>)}
              <label>Macmiilka (ikhtiyaari)<input value={cust} onChange={e => setCust(e.target.value)} /></label>
              <label>Habka lacag bixinta<select value={method} onChange={e => setMethod(e.target.value)}>{METHODS.map(m => <option key={m}>{m}</option>)}</select></label>
              <div className="tot"><span>Wadarta</span><span>{money(cartTotal)}</span></div>
              <button disabled={!cart.length} onClick={sell}>Dhammaystir iibka</button></div>
            <div className="card wrap"><h3>Taariikhda iibka</h3><table><thead><tr><th>Taariikh</th><th>Macmiil</th><th>Alaab</th><th>Habka</th><th>Wadarta</th><th></th></tr></thead><tbody>{sales.map(s => <tr key={s.id}><td>{s.created_at.slice(0, 10)}</td><td>{s.customer || "-"}</td><td>{(s.items || []).map(l => l.name + " ×" + l.qty).join(", ")}</td><td>{s.method}</td><td><b>{money(s.total)}</b></td><td><button className="g sm" onClick={() => cancelSale(s)}>Jooji</button></td></tr>)}</tbody></table>{sales.length === 0 && <p className="mut">Weli iib ma jiro.</p>}</div></div>}

          {view === "fin" && <>
            <div className="stats">{[["c2", "⬆️", money(incM), "Dakhliga bishan"], ["c4", "⬇️", money(expM), "Kharashka bishan"], ["c1", "📈", money(incM - expM), "Faa'iidada bishan"]].map(s => <div className={"stat " + s[0]} key={s[3]}><div className="ic">{s[1]}</div><div><b>{s[2]}</b><span>{s[3]}</span></div></div>)}</div>
            <div className="cols">
              <div className="card"><h3>Dakhliga iyo kharashka (6 bilood)</h3><ResponsiveContainer width="100%" height={230}><BarChart data={months}><XAxis dataKey="m" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="Dakhli" fill="#2e7d32" radius={[5, 5, 0, 0]} /><Bar dataKey="Kharash" fill="#b3261e" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <form className="card gap" onSubmit={addEntry}><h3>Ku dar diiwaan</h3>
                <div className="two"><label>Nooca<select value={fe.kind} onChange={e => setFe({ ...fe, kind: e.target.value, category: e.target.value === "expense" ? EXPC[0] : "Dakhli kale" })}><option value="expense">Kharash</option><option value="income">Dakhli</option></select></label>
                  <label>Qaybta<select value={fe.category} onChange={e => setFe({ ...fe, category: e.target.value })}>{(fe.kind === "expense" ? EXPC : ["Dakhli kale"]).map(c => <option key={c}>{c}</option>)}</select></label></div>
                <label>Faahfaahin<input value={fe.description} onChange={e => setFe({ ...fe, description: e.target.value })} /></label>
                <div className="two"><label>Lacagta ($)<input required type="number" step="0.01" min="0" value={fe.amount} onChange={e => setFe({ ...fe, amount: e.target.value })} /></label><label>Taariikh<input type="date" value={fe.date} onChange={e => setFe({ ...fe, date: e.target.value })} /></label></div>
                <label>Habka<select value={fe.method} onChange={e => setFe({ ...fe, method: e.target.value })}>{METHODS.map(m => <option key={m}>{m}</option>)}</select></label><label>Sawirka caddaynta (screenshot)<input key={String(!!proof)} type="file" accept="image/*" onChange={e => setProof(e.target.files[0])} /></label><button>Kaydi</button></form>
            </div>
            <div className="card wrap" style={{ marginBottom: 14 }}><h3>Bilihii hore (riix bil si aad u aragto)</h3><table><thead><tr><th>Bil</th><th>Dakhli</th><th>Kharash</th><th>Faa'iido</th></tr></thead><tbody>{monthsAll.map(m => { const r = mRow(m); return <tr key={m} style={{ cursor: "pointer" }} onClick={() => setFm(m)}><td><b>{m}</b></td><td className="pos">{money(r.inc)}</td><td className="neg">{money(r.exp)}</td><td><b>{money(r.inc - r.exp)}</b></td></tr>; })}</tbody></table></div>
            <div className="card wrap"><div className="row" style={{ marginBottom: 8 }}><h3 style={{ margin: 0 }}>Diiwaannada</h3><select style={{ width: "auto" }} value={fm} onChange={e => setFm(e.target.value)}><option value="all">Dhammaan bilaha</option>{monthsAll.map(m => <option key={m}>{m}</option>)}</select></div>
              <table><thead><tr><th>Taariikh</th><th>Nooc</th><th>Qayb</th><th>Faahfaahin</th><th>Lacag</th><th>Caddayn</th><th></th></tr></thead><tbody>{finList.map(f => <tr key={f.id}><td>{f.entry_date}</td><td>{f.kind === "income" ? "Dakhli" : "Kharash"}</td><td>{f.category}</td><td>{f.description}</td><td className={f.kind === "income" ? "pos" : "neg"}>{f.kind === "income" ? "+" : "−"}{money(f.amount)}</td><td>{f.proof_url ? <button className="g sm" onClick={() => openProof(f.proof_url)}>📎 Eeg</button> : "-"}</td><td><button className="g sm" onClick={async () => { if (confirm("Tirtir?")) { await supabase.from("store_finance").delete().eq("id", f.id); load(); } }}>×</button></td></tr>)}</tbody></table>{finList.length === 0 && <p className="mut">Diiwaan ma jiro.</p>}</div></>}

          {view === "req" && <div className="split">
            <form className="card gap" onSubmit={addReq}><h3>Dalab cusub / alaab la doonayo</h3>
              <label>Alaabta<input required value={rn.item} onChange={e => setRn({ ...rn, item: e.target.value })} placeholder="Tusaale: Abaya Nigis madow" /></label>
              <div className="two"><label>Qaybta<select value={rn.cat} onChange={e => setRn({ ...rn, cat: e.target.value })}>{CATS.map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}</select></label><label>Tirada<input type="number" min="1" value={rn.qty} onChange={e => setRn({ ...rn, qty: e.target.value })} /></label></div>
              <label>Midab / cabbir<input value={rn.details} onChange={e => setRn({ ...rn, details: e.target.value })} /></label>
              <div className="two"><label>Macmiilka<input value={rn.customer} onChange={e => setRn({ ...rn, customer: e.target.value })} /></label><label>Telefoon<input value={rn.phone} onChange={e => setRn({ ...rn, phone: e.target.value })} /></label></div>
              <div className="two"><label>Maalinta loo baahan yahay<input type="date" value={rn.need_date} onChange={e => setRn({ ...rn, need_date: e.target.value })} /></label><label>Xaalad<select value={rn.status} onChange={e => setRn({ ...rn, status: e.target.value })}>{RST.map(x => <option key={x}>{x}</option>)}</select></label></div>
              <label>Fiiro gaar ah<input value={rn.note} onChange={e => setRn({ ...rn, note: e.target.value })} /></label><button>Kaydi dalabka</button></form>
            <div className="card wrap"><div className="tabs">{[["today", "Maanta"], ...RST.map(x => [x, x]), ["all", "Dhammaan"]].map(t => <button key={t[0]} className={"tab" + (rf === t[0] ? " on" : "")} onClick={() => setRf(t[0])}>{t[1]}</button>)}</div>
              <table><thead><tr><th>Alaab</th><th>Qayb</th><th>Tiro</th><th>Macmiil</th><th>Taariikh</th><th>Xaalad</th><th></th></tr></thead><tbody>{reqList.map(r => <tr key={r.id}><td><b>{r.item}</b><div className="mut">{r.details}{r.note ? " · " + r.note : ""}</div></td><td>{cn(r.cat)}</td><td>{r.qty}</td><td>{r.customer || "-"}{r.phone && <div><a href={"tel:" + r.phone}>{r.phone}</a></div>}</td><td>{r.need_date}</td><td><select style={{ width: "auto" }} value={r.status} onChange={e => setStatus(r, e.target.value)}>{RST.map(x => <option key={x}>{x}</option>)}</select></td><td><button className="g sm" onClick={async () => { if (confirm("Tirtir dalabkan?")) { await supabase.from("store_requests").delete().eq("id", r.id); load(); } }}>×</button></td></tr>)}</tbody></table>{reqList.length === 0 && <p className="mut">Dalab ma jiro.</p>}</div></div>}

          {view === "rep" && <>
            <div className="row" style={{ marginBottom: 14 }}><select style={{ width: "auto" }} value={per} onChange={e => setPer(+e.target.value)}><option value={7}>7 maalmood</option><option value={30}>30 maalmood</option><option value={90}>90 maalmood</option><option value={0}>Dhammaan</option></select><span style={{ flex: 1 }} /><button onClick={xlsx}>⬇ Excel</button><button className="g" onClick={pdf}>⬇ PDF (Inventory)</button></div>
            <div className="stats">{[["c1", "🧾", salesP.length, "Tirada iibka"], ["c2", "⬆️", money(incP), "Dakhli"], ["c4", "⬇️", money(expP), "Kharash"], ["c3", "📈", money(incP - expP), "Faa'iido"]].map(s => <div className={"stat " + s[0]} key={s[3]}><div className="ic">{s[1]}</div><div><b>{s[2]}</b><span>{s[3]}</span></div></div>)}</div>
            <div className="cols">
              <div className="card"><h3>Alaabta ugu iibsiga badan</h3>{top.map(t => <div className="li" key={t.n}><div className="t"><b>{t.n}</b><span className="mut">{t.qty} xabbo</span></div><b>{money(t.rev)}</b></div>)}{top.length === 0 && <p className="mut">Xog ma jirto.</p>}</div>
              <div className="card"><h3>Habka lacag bixinta</h3>{byM.map(x => <div className="li" key={x.m}><div className="t"><b>{x.m}</b></div><b>{money(x.v)}</b></div>)}{byM.length === 0 && <p className="mut">Xog ma jirto.</p>}</div>
            </div></>}
        </div>
      </div>
      {edit && <Editor p={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function Editor({ p, onClose, onSaved }) {
  const [f, setF] = useState({ sub: p.sub || "", name: p.name || "", cat: p.cat || CATS[0][0], price: p.price || "", note: p.note || "" });
  const [vs, setVs] = useState(p.variants?.length ? p.variants : [{ color: "", size: "", qty: "" }]);
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const setV = (i, k, v) => setVs(vs.map((x, j) => j === i ? { ...x, [k]: v } : x));
  async function save(e) {
    e.preventDefault(); setBusy(true); setErr("");
    let img = p.img || null;
    if (file) {
      const path = crypto.randomUUID() + "-" + file.name.replace(/[^\w.]/g, "_");
      const { error } = await supabase.storage.from("products").upload(path, file);
      if (error) { setErr("Sawirka lama upload gareyn karin: " + error.message); setBusy(false); return; }
      img = supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
    }
    const row = { sub: f.cat === "abaya" ? f.sub || null : null, name: f.name.trim(), cat: f.cat, price: +f.price || 0, note: f.note, img, variants: vs.filter(v => v.color || v.size || v.qty).map(v => ({ ...v, qty: +v.qty || 0 })) };
    const { error } = p.id ? await supabase.from("catalog_items").update(row).eq("id", p.id) : await supabase.from("catalog_items").insert(row);
    setBusy(false);
    if (error) setErr(error.message); else onSaved();
  }
  return (
    <div className="modal"><form onSubmit={save}>
      <h2>{p.id ? "Wax ka beddel alaabta" : "Alaab cusub"}</h2>
      <label>Magaca<input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <div className="two">
        <label>Qaybta<select value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })}>{CATS.map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}</select></label>
        <label>Qiimaha ($)<input type="number" min="0" step="0.01" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} /></label>
      </div>
      {f.cat === "abaya" && <label>Hoos-qaybta<select value={f.sub} onChange={e => setF({ ...f, sub: e.target.value })}><option value="">-</option>{SUBS.map(x => <option key={x}>{x}</option>)}</select></label>}
      <label>Sawir<input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} /></label>
      <label>Faahfaahin<textarea rows="2" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></label>
      <div><label>Midab, cabbir iyo tiro</label>
        {vs.map((v, i) => <div className="vr" key={i}>
          <input placeholder="Midab" value={v.color} onChange={e => setV(i, "color", e.target.value)} />
          <input placeholder="Cabbir" value={v.size} onChange={e => setV(i, "size", e.target.value)} />
          <input type="number" min="0" placeholder="Tiro" value={v.qty} onChange={e => setV(i, "qty", e.target.value)} />
          <button type="button" className="g" style={{ padding: 0 }} onClick={() => setVs(vs.filter((_, j) => j !== i))}>×</button></div>)}
        <button type="button" className="g sm" onClick={() => setVs([...vs, { color: "", size: "", qty: "" }])}>+ Ku dar</button></div>
      {err && <div className="err">{err}</div>}
      <div className="two"><button type="button" className="g" onClick={onClose}>Jooji</button><button disabled={busy}>{busy ? "Waa la kaydinayaa..." : "Kaydi"}</button></div>
    </form></div>
  );
}