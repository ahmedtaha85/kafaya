"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { exportExcel, exportPDF, exportCustomers } from "../lib/exports";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CATS = [["abaya", "Abayad"], ["tarxad", "Tarxado"], ["xijaab", "Xijaabyo"], ["saraawiil", "Saraawiil"], ["dirac", "Dirac"], ["kabo", "Kabo"], ["gabsaar", "Gabsaar"], ["carfo", "Carafta Dumarka"], ["caruur", "Dharka Caruurta"]];
const SUBS = ["Rajatin", "Nigis", "Open"];
const RST = ["La dalbaday", "Waddada ku jira", "Yimid", "Stock-ga la geliyay"];
const ORIGINS = ["China", "Dubai", "Kale"];
const INC = ["Iib gacanta", "Lacag soo gashay", "Deyn la soo celiyay", "Maalgelin", "Kale"];
const ADMIN_CALL = "+252617490814"; // Wicitaan (Hormuud)
const ADMIN_WA = "+252619801681"; // WhatsApp
const waLink = "https://wa.me/" + ADMIN_WA.replace(/\D/g, "");
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
  const [session, setSession] = useState(undefined), [staff, setStaff] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, x) => setSession(x));
    return () => data.subscription.unsubscribe();
  }, []);
  const uid = session?.user?.id;
  useEffect(() => {
    if (!uid) { setStaff(undefined); return; }
    supabase.from("staff").select("*").eq("user_id", uid).maybeSingle().then(({ data }) => setStaff(data || null));
  }, [uid]);
  if (session === undefined) return null;
  if (!session) return <Login />;
  if (staff === undefined) return null;
  if (!staff || !staff.active) return <Blocked />;
  return <App session={session} staff={staff} />;
}

function Blocked() {
  return (
    <div className="card login" style={{ textAlign: "center", display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0, color: "var(--mar)" }}>Akoonkaaga lama furin</h2>
      <p className="mut">Akoonkaaga waa la xiray ama weli lama dhamaystirin. La xiriir admin-ka.</p>
      <a href={"tel:" + ADMIN_CALL}>📞 {ADMIN_CALL}</a>
      <a href={"https://wa.me/" + waNum(ADMIN_WA)} target="_blank" rel="noreferrer">💬 WhatsApp</a>
      <button className="g" onClick={() => supabase.auth.signOut()}>Ka bax</button>
    </div>
  );
}

function Login() {
  const [u, setU] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const id = u.trim().toLowerCase(), email = id.includes("@") ? id : id + "@kafaya.staff";
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false); if (error) setErr("Username ama password waa khalad.");
  }
  const wa = msg => "https://wa.me/" + waNum(ADMIN_WA) + "?text=" + encodeURIComponent(msg);
  return (
    <form className="card login" onSubmit={go} style={{ display: "grid", gap: 12 }}>
      <div style={{ textAlign: "center" }}><h1 style={{ margin: 0, color: "var(--mar)", fontFamily: "Cormorant Garamond,serif", letterSpacing: 3 }}>KAFAYA BOUTIQUE</h1><span className="mut">Gal nidaamka maamulka</span></div>
      <input required placeholder="Username (code)" autoCapitalize="none" value={u} onChange={e => setU(e.target.value)} />
      <input type="password" required placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} />
      {err && <div className="err">{err}</div>}
      <button disabled={busy}>{busy ? "Waa la galayaa..." : "Gal"}</button>
      <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
        <a href={wa("Password-kayga waan illoobay. Username-kaygu waa: " + u)} target="_blank" rel="noreferrer">Password-ka ilaaway?</a>
        <a href={wa("Waxaan rabaa akoon cusub oo Kafaya system ah.")} target="_blank" rel="noreferrer">Akoon cusub (Register)</a>
      </div>
      <p className="mut" style={{ textAlign: "center", margin: 0 }}>Admin keliya ayaa akoon abuuri kara ama password beddeli kara.<br /><a href={"tel:" + ADMIN_CALL}>📞 {ADMIN_CALL}</a> · <a href={"https://wa.me/" + waNum(ADMIN_WA)} target="_blank" rel="noreferrer">💬 WhatsApp</a></p>
    </form>
  );
}

const ICON = { abaya: "👘", tarxad: "🧣", xijaab: "🧕", saraawiil: "👖", dirac: "👗", kabo: "👠", gabsaar: "👜", carfo: "🌸", caruur: "🧒" };
const ROLE_L = { admin: "Admin", supervisor: "Supervisor", cashier: "Cashier" };
const NAV = [["dash", "📊", "Dashboard"], ["inv", "📦", "Inventory"], ["sales", "🧾", "Sales"], ["cust", "👥", "Macaamiisha"], ["fin", "💰", "Finance"], ["req", "📝", "Dalabyada"], ["rep", "📄", "Reports"], ["staff", "🔐", "Shaqaalaha"]];
const METHODS = ["Cash", "EVC Plus", "E-Dahab", "Bank", "Card"];
const EXPC = ["Kiro", "Mushahar", "Alaab iibsasho", "Gaadiid", "Korontada/Biyaha", "Suuq-geyn", "Kale"];
const money = n => "$" + (+n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);
const impTotal = r => (+r.qty || 0) * (+r.unit_cost || 0) + (+r.shipping || 0);
const waNum = p => { let d = (p || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.startsWith("0")) d = d.slice(1); return d.length <= 9 ? "252" + d : d; };

function App({ session, staff }) {
  const mgr = staff.role !== "cashier", isAdmin = staff.role === "admin";
  const nav = NAV.filter(n => isAdmin || (n[0] !== "staff" && (mgr || ["inv", "sales", "cust"].includes(n[0]))));
  const [items, setItems] = useState([]), [sales, setSales] = useState([]), [fin, setFin] = useState([]);
  const [cat, setCat] = useState("all"), [q, setQ] = useState(""), [view, setView] = useState(staff.role === "cashier" ? "sales" : "dash"), [mode, setMode] = useState("grid"), [edit, setEdit] = useState(null), [menu, setMenu] = useState(false);
  const [sub, setSub] = useState(""), [reqs, setReqs] = useState([]), [rf, setRf] = useState("all"), [rn, setRn] = useState({ item: "", cat: "abaya", details: "", qty: 1, origin: "China", supplier: "", unit_cost: "", shipping: "", order_date: today(), eta: "", tracking: "", status: "La dalbaday", note: "" }), [asExp, setAsExp] = useState(true), [fm, setFm] = useState("all"), [ft, setFt] = useState("dakhli"), [proof, setProof] = useState(null);
  const [sdate, setSdate] = useState(today()), [cphone, setCphone] = useState("");
  const [cart, setCart] = useState([]), [cust, setCust] = useState(""), [method, setMethod] = useState("Cash"), [pick, setPick] = useState(""), [qty, setQty] = useState(1), [cp, setCp] = useState("");
  const [fe, setFe] = useState({ kind: "income", category: INC[0], description: "", amount: "", method: "Cash", date: today() }), [per, setPer] = useState(30);
  const load = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from("catalog_items").select("*").order("created_at", { ascending: false }),
      supabase.from("store_sales").select("*").order("created_at", { ascending: false }),
      supabase.from("store_finance").select("*").order("entry_date", { ascending: false }),
      supabase.from("store_imports").select("*").order("order_date", { ascending: false })]);
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
  const mRow = m => { const sal = sum(sales.filter(x => x.created_at.startsWith(m)), x => x.total), oth = sum(fin.filter(f => f.kind === "income" && f.entry_date.startsWith(m)), f => f.amount); return { sal, oth, inc: sal + oth, exp: sum(fin.filter(f => f.kind === "expense" && f.entry_date.startsWith(m)), f => f.amount) }; };
  const goFt = t => { setFt(t); if (t !== "bilaha") setFe({ ...fe, kind: t === "dakhli" ? "income" : "expense", category: t === "dakhli" ? INC[0] : EXPC[0] }); };
  const finList = fin.filter(f => fm === "all" || f.entry_date.startsWith(fm));
  const reqList = reqs.filter(r => rf === "all" || r.status === rf);
  const reqOpen = reqs.filter(r => r.status === "La dalbaday" || r.status === "Waddada ku jira").length;
  const transitVal = sum(reqs.filter(r => r.status === "La dalbaday" || r.status === "Waddada ku jira"), impTotal), impMonth = sum(reqs.filter(r => (r.order_date || "").startsWith(mk)), impTotal);
  const custs = Object.values(sales.filter(x => (x.customer_phone || "").trim()).reduce((a, x) => { const k = x.customer_phone.replace(/\D/g, ""); const c = a[k] || (a[k] = { phone: x.customer_phone, name: "", visits: 0, total: 0, last: "" }); c.name = c.name || x.customer || ""; c.visits++; c.total += +x.total || 0; if (x.created_at > c.last) c.last = x.created_at; return a; }, {})).sort((a, b) => b.total - a.total);
  async function addReq(e) {
    e.preventDefault(); let proof_url = null;
    if (proof) { const path = crypto.randomUUID() + "-" + proof.name.replace(/[^\w.]/g, "_"); const { error } = await supabase.storage.from("proofs").upload(path, proof); if (error) return alert("Sawirka lama upload gareyn karin: " + error.message); proof_url = path; }
    const row = { ...rn, qty: +rn.qty || 1, unit_cost: +rn.unit_cost || 0, shipping: +rn.shipping || 0, eta: rn.eta || null, proof_url };
    const { error } = await supabase.from("store_imports").insert(row); if (error) return alert(error.message);
    if (asExp) await supabase.from("store_finance").insert({ kind: "expense", category: "Alaab iibsasho", description: "Dalab " + rn.origin + ": " + rn.item, amount: impTotal(row), method: "Bank", entry_date: rn.order_date, proof_url });
    setRn({ ...rn, item: "", details: "", supplier: "", unit_cost: "", shipping: "", eta: "", tracking: "", note: "" }); setProof(null); load();
  }
  async function setStatus(r, status) { await supabase.from("store_imports").update({ status }).eq("id", r.id); load(); }
  async function updSale(x, patch) { await supabase.from("store_sales").update(patch).eq("id", x.id); load(); }
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
    await supabase.from("store_sales").insert({ customer: cust, customer_phone: cphone, created_at: sdate + "T12:00:00.000Z", method, total: cartTotal, items: cart.map(({ id, i, name, color, size, qty, price }) => ({ id, i, name, color, size, qty, price })) });
    setCart([]); setCust(""); setCphone(""); load();
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
  const myPw = async () => { const pw = prompt("Password cusub (ugu yaraan 6 xaraf):"); if (!pw) return; if (pw.length < 6) return alert("Waa gaaban yahay"); const { error } = await supabase.auth.updateUser({ password: pw }); alert(error ? error.message : "Password-ka waa la beddelay ✅"); };
  const exp = async fn => { try { await fn(); } catch (e) { alert("Export way fashilantay: " + (e.message || e)); } };
  const xdata = { items, sales, fin, reqs, cn, salesP, finP, per };
  const Ic = ({ p }) => <div className="ic">{p.img ? <img alt="" src={p.img} /> : ICON[p.cat] || "🛍️"}</div>;

  return (
    <div className="app">
      <aside className={"side" + (menu ? " open" : "")}>
        <div className="brand"><Logo /><div><b>KAFAYA</b><small>BOUTIQUE · Ku Filan</small></div></div>
        {nav.map(n => <button key={n[0]} className={"nav" + (view === n[0] ? " on" : "")} onClick={() => go(n[0])}>{n[1]} {n[2]}{n[0] === "inv" && alerts.length > 0 && <span className="n">{alerts.length}</span>}{n[0] === "req" && reqOpen > 0 && <span className="n">{reqOpen}</span>}</button>)}
        <div className="help"><div>Cilad? La xiriir maamulka</div><a href={"tel:" + ADMIN_CALL}>📞 Wac: {ADMIN_CALL}</a><a href={waLink} target="_blank" rel="noreferrer">💬 WhatsApp: {ADMIN_WA}</a></div>
        <div className="user"><b>{staff.full_name || staff.username}</b> · {ROLE_L[staff.role]}<br />{staff.username}<button className="g sm" onClick={myPw}>Beddel password</button><button className="g sm" onClick={() => supabase.auth.signOut()}>Ka bax</button></div>
      </aside>
      <div className="main">
        <div className="top">
          <button className="burger" onClick={() => setMenu(!menu)}>☰</button><h2>{NAV.find(n => n[0] === view)[2]}</h2>
          {view === "inv" ? <input placeholder="Raadi alaab, midab ama cabbir..." value={q} onChange={e => setQ(e.target.value)} /> : <span style={{ flex: 1 }} />}
          <button onClick={() => { setEdit({}); }}>+ Alaab</button>
        </div>
        <div className="page">
          {view === "dash" && <Dashboard items={items} sales={sales} fin={fin} reqs={reqs} name={name} go={go} />}

          {view === "inv" && <>
            <div className="row" style={{ marginBottom: 12 }}><div className="seg"><button className={mode === "grid" ? "on" : ""} onClick={() => setMode("grid")}>Kaararka</button><button className={mode === "table" ? "on" : ""} onClick={() => setMode("table")}>Shaxda stock-ga</button></div><span className="mut">Qiimaha stock-ga: {money(stockVal)}</span></div>
            <div className="tabs">{[["all", "Dhammaan"], ...CATS].map(c => <button key={c[0]} className={"tab" + (cat === c[0] ? " on" : "")} onClick={() => { setCat(c[0]); setSub(""); }}>{c[1]}</button>)}</div>
            {cat === "abaya" && <div className="tabs">{["", ...SUBS].map(x => <button key={x} className={"tab" + (sub === x ? " on" : "")} onClick={() => setSub(x)}>{x || "Dhammaan Abayad"}</button>)}</div>}
            {mode === "grid" ? <div className="grid">{list.length === 0 && <p className="mut">Alaab lama helin.</p>}{list.map(p => <div className="item" key={p.id}><div className="ph">{p.img ? <img alt="" src={p.img} /> : ICON[p.cat]}</div><div className="bd"><h4>{p.name}</h4><span className="mut">{cn(p.cat)}{p.sub ? " · " + p.sub : ""}</span>{p.price > 0 && <div className="price">{money(p.price)}</div>}<div>{(p.variants || []).map((v, i) => <span className="chip" key={i}>{v.color || "-"} · {v.size || "-"} · {v.qty}</span>)}</div><span className={"badge " + st(p)}>{STL[st(p)]} · {tot(p)}</span><div className="row"><button className="g sm" onClick={() => setEdit(p)}>Wax ka beddel</button>{mgr && <button className="g sm" onClick={() => del(p)}>Tirtir</button>}</div></div></div>)}</div>
              : <div className="card wrap"><table><thead><tr><th>Alaab</th><th>Midab</th><th>Cabbir</th><th>Tiro</th><th>Xaalad</th></tr></thead><tbody>{list.flatMap(p => (p.variants || []).map((v, i) => { const s = v.qty <= 0 ? "out" : v.qty <= LOW ? "low" : "ok"; return <tr key={p.id + i}><td><b>{p.name}</b></td><td>{v.color || "-"}</td><td>{v.size || "-"}</td><td><span className="qty"><button className="g" onClick={() => adj(p, i, -1)}>−</button><b>{v.qty}</b><button onClick={() => adj(p, i, 1)}>+</button></span></td><td><span className={"badge " + s}>{STL[s]}</span></td></tr>; }))}</tbody></table></div>}
          </>}

          {view === "sales" && <div className="split">
            <div className="card gap"><h3>Iib cusub</h3>
              <label>Alaabta<select value={pick} onChange={e => { setPick(e.target.value); const o = opts.find(o => o.key === e.target.value); if (o) setCp(o.p.price || ""); }}><option value="">Dooro alaab...</option>{opts.map(o => <option key={o.key} value={o.key}>{o.p.name} · {o.v.color || "-"} · {o.v.size || "-"} ({o.v.qty})</option>)}</select></label>
              <div className="two"><label>Tirada<input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></label><label>Qiimaha ($)<input type="number" step="0.01" value={cp} onChange={e => setCp(e.target.value)} /></label></div>
              <button className="g" onClick={addCart}>+ Ku dar gaarigga</button>
              {cart.map((l, i) => <div className="li" key={i}><div className="t"><b>{l.name}</b><span className="mut">{l.color || "-"} · {l.size || "-"} · {l.qty} × {money(l.price)}</span></div><b>{money(l.qty * l.price)}</b><button className="g sm" onClick={() => setCart(cart.filter((_, j) => j !== i))}>×</button></div>)}
              <label>Taariikhda iibka (waa la beddeli karaa)<input type="date" max={today()} value={sdate} onChange={e => setSdate(e.target.value)} /></label>
              <div className="two"><label>Macmiilka<input value={cust} onChange={e => setCust(e.target.value)} /></label><label>Telefoon (marketing)<input type="tel" value={cphone} onChange={e => setCphone(e.target.value)} placeholder="+252..." /></label></div>
              <label>Habka lacag bixinta<select value={method} onChange={e => setMethod(e.target.value)}>{METHODS.map(m => <option key={m}>{m}</option>)}</select></label>
              <div className="tot"><span>Wadarta</span><span>{money(cartTotal)}</span></div>
              <button disabled={!cart.length} onClick={sell}>Dhammaystir iibka</button></div>
            <div className="card wrap"><h3>Taariikhda iibka</h3><table><thead><tr><th>Taariikh</th><th>Macmiil</th><th>Telefoon</th><th>Alaab</th><th>Habka</th><th>Wadarta</th><th></th></tr></thead><tbody>{sales.map(s => <tr key={s.id}><td><input type="date" disabled={!mgr} style={{ width: 140 }} max={today()} value={s.created_at.slice(0, 10)} onChange={e => e.target.value && updSale(s, { created_at: e.target.value + "T12:00:00.000Z" })} /></td><td>{s.customer || "-"}</td><td><input key={s.id + (s.customer_phone || "")} type="tel" disabled={!mgr} style={{ width: 130 }} defaultValue={s.customer_phone || ""} onBlur={e => e.target.value !== (s.customer_phone || "") && updSale(s, { customer_phone: e.target.value })} /></td><td>{(s.items || []).map(l => l.name + " ×" + l.qty).join(", ")}</td><td>{s.method}</td><td><b>{money(s.total)}</b></td><td>{mgr && <button className="g sm" onClick={() => cancelSale(s)}>Jooji</button>}</td></tr>)}</tbody></table>{sales.length === 0 && <p className="mut">Weli iib ma jiro.</p>}</div></div>}

          {view === "fin" && <>
            <div className="stats">{[["c2", "⬆️", money(incM), "Dakhliga bishan"], ["c4", "⬇️", money(expM), "Kharashka bishan"], ["c1", "📈", money(incM - expM), "Faa'iidada bishan"]].map(s => <div className={"stat " + s[0]} key={s[3]}><div className="ic">{s[1]}</div><div><b>{s[2]}</b><span>{s[3]}</span></div></div>)}</div>
            <div className="seg" style={{ marginBottom: 14 }}>{[["dakhli", "⬆️ Dakhli (Revenue)"], ["kharash", "⬇️ Kharash (Expenses)"], ["bilaha", "📅 Bilaha"]].map(t => <button key={t[0]} className={ft === t[0] ? "on" : ""} onClick={() => goFt(t[0])}>{t[1]}</button>)}</div>
            {ft !== "bilaha" && <div className="split">
              <form className="card gap" onSubmit={addEntry}><h3>{ft === "dakhli" ? "Ku dar dakhli soo galay" : "Ku dar kharash baxay"}</h3>
                <label>Qaybta<select value={fe.category} onChange={e => setFe({ ...fe, category: e.target.value })}>{(ft === "dakhli" ? INC : EXPC).map(c => <option key={c}>{c}</option>)}</select></label>
                <label>Faahfaahin<input value={fe.description} onChange={e => setFe({ ...fe, description: e.target.value })} /></label>
                <div className="two"><label>Lacagta ($)<input required type="number" step="0.01" min="0" value={fe.amount} onChange={e => setFe({ ...fe, amount: e.target.value })} /></label><label>Taariikh<input type="date" value={fe.date} onChange={e => setFe({ ...fe, date: e.target.value })} /></label></div>
                <label>Habka<select value={fe.method} onChange={e => setFe({ ...fe, method: e.target.value })}>{METHODS.map(m => <option key={m}>{m}</option>)}</select></label>
                <label>Sawirka caddaynta (screenshot)<input key={String(!!proof)} type="file" accept="image/*" onChange={e => setProof(e.target.files[0])} /></label>
                <button>Kaydi</button>
                {ft === "dakhli" && <p className="mut" style={{ margin: 0 }}>Iibka laga sameeyo menu-ga Sales si automatic ah ayaa loogu daraa revenue-ga. Halkan ku dar dakhliga kale oo keliya.</p>}</form>
              <div className="card wrap">{(() => {
                const L = finList.filter(f => f.kind === (ft === "dakhli" ? "income" : "expense")); return <>
                  <div className="row" style={{ marginBottom: 8 }}><h3 style={{ margin: 0 }}>{ft === "dakhli" ? "Dakhliga la diiwaangeliyay" : "Kharashyada"}</h3><select style={{ width: "auto" }} value={fm} onChange={e => setFm(e.target.value)}><option value="all">Dhammaan bilaha</option>{monthsAll.map(m => <option key={m}>{m}</option>)}</select><b style={{ marginLeft: "auto" }} className={ft === "dakhli" ? "pos" : "neg"}>{money(sum(L, f => f.amount))}</b></div>
                  <table><thead><tr><th>Taariikh</th><th>Qayb</th><th>Faahfaahin</th><th>Lacag</th><th>Caddayn</th><th></th></tr></thead><tbody>{L.map(f => <tr key={f.id}><td>{f.entry_date}</td><td>{f.category}</td><td>{f.description}</td><td className={ft === "dakhli" ? "pos" : "neg"}>{money(f.amount)}</td><td>{f.proof_url ? <button className="g sm" onClick={() => openProof(f.proof_url)}>📎 Eeg</button> : "-"}</td><td><button className="g sm" onClick={async () => { if (confirm("Tirtir?")) { await supabase.from("store_finance").delete().eq("id", f.id); load(); } }}>×</button></td></tr>)}</tbody></table>{L.length === 0 && <p className="mut">Diiwaan ma jiro.</p>}</>;
              })()}</div>
            </div>}
            {ft === "bilaha" && <>
              <div className="card" style={{ marginBottom: 14 }}><h3>Revenue-ka iyo kharashka bil kasta</h3><ResponsiveContainer width="100%" height={250}><BarChart data={monthsAll.slice(0, 12).reverse().map(m => { const r = mRow(m); return { m, Revenue: r.inc, Kharash: r.exp }; })}><XAxis dataKey="m" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="Revenue" fill="#2e7d32" radius={[5, 5, 0, 0]} /><Bar dataKey="Kharash" fill="#b3261e" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <div className="card wrap"><h3>Bilihii hore (riix bil si aad u aragto dakhligeeda)</h3><table><thead><tr><th>Bil</th><th>Iib (Sales)</th><th>Dakhli kale</th><th>Revenue guud</th><th>Kharash</th><th>Faa'iido</th></tr></thead><tbody>{monthsAll.map(m => { const r = mRow(m); return <tr key={m} style={{ cursor: "pointer" }} onClick={() => { setFm(m); goFt("dakhli"); }}><td><b>{m}</b></td><td>{money(r.sal)}</td><td>{money(r.oth)}</td><td className="pos"><b>{money(r.inc)}</b></td><td className="neg">{money(r.exp)}</td><td><b>{money(r.inc - r.exp)}</b></td></tr>; })}</tbody></table>{monthsAll.length === 0 && <p className="mut">Weli xog ma jirto.</p>}</div></>}
          </>}

          {view === "staff" && isAdmin && <StaffAdmin me={session.user.id} />}

          {view === "cust" && <div className="card wrap"><div className="row" style={{ marginBottom: 8 }}><h3 style={{ margin: 0 }}>Macaamiisha ({custs.length})</h3><span className="mut">Waxay ka timaadaan iibka marka telefoon la geliyo.</span><span style={{ flex: 1 }} /><button className="g sm" onClick={() => exp(() => exportCustomers(custs))}>⬇ Excel</button></div>
            <table><thead><tr><th>Magac</th><th>Telefoon</th><th>Jeer</th><th>Wadarta</th><th>Markii u dambeysay</th><th></th></tr></thead><tbody>{custs.map(c => <tr key={c.phone}><td><b>{c.name || "-"}</b></td><td><a href={"tel:" + c.phone}>{c.phone}</a></td><td>{c.visits}</td><td><b>{money(c.total)}</b></td><td>{c.last.slice(0, 10)}</td><td><a href={"https://wa.me/" + waNum(c.phone)} target="_blank" rel="noreferrer"><button className="g sm">💬 WhatsApp</button></a></td></tr>)}</tbody></table>{custs.length === 0 && <p className="mut">Weli macmiil telefoon leh ma jiro.</p>}</div>}

          {view === "req" && <>
            <div className="stats">{[["c3", "🚢", reqOpen, "Dalab socda"], ["c1", "💵", money(transitVal), "Qiimaha alaabta socota"], ["c4", "🧾", money(impMonth), "La dalbaday bishan"]].map(s => <div className={"stat " + s[0]} key={s[3]}><div className="ic">{s[1]}</div><div><b>{s[2]}</b><span>{s[3]}</span></div></div>)}</div>
            <div className="split">
              <form className="card gap" onSubmit={addReq}><h3>Dalab cusub (China / Dubai)</h3>
                <div className="two"><label>Suuqa<select value={rn.origin} onChange={e => setRn({ ...rn, origin: e.target.value })}>{ORIGINS.map(x => <option key={x}>{x}</option>)}</select></label><label>Supplier / dukaan<input value={rn.supplier} onChange={e => setRn({ ...rn, supplier: e.target.value })} /></label></div>
                <label>Alaabta<input required value={rn.item} onChange={e => setRn({ ...rn, item: e.target.value })} placeholder="Tusaale: Abaya Nigis madow" /></label>
                <div className="two"><label>Qaybta<select value={rn.cat} onChange={e => setRn({ ...rn, cat: e.target.value })}>{CATS.map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}</select></label><label>Tirada<input type="number" min="1" value={rn.qty} onChange={e => setRn({ ...rn, qty: e.target.value })} /></label></div>
                <label>Midab / cabbir<input value={rn.details} onChange={e => setRn({ ...rn, details: e.target.value })} /></label>
                <div className="two"><label>Qiimaha xabadda ($)<input type="number" step="0.01" min="0" value={rn.unit_cost} onChange={e => setRn({ ...rn, unit_cost: e.target.value })} /></label><label>Shipping ($)<input type="number" step="0.01" min="0" value={rn.shipping} onChange={e => setRn({ ...rn, shipping: e.target.value })} /></label></div>
                <div className="tot"><span>Wadarta</span><span>{money(impTotal(rn))}</span></div>
                <div className="two"><label>Taariikhda dalabka<input type="date" value={rn.order_date} onChange={e => setRn({ ...rn, order_date: e.target.value })} /></label><label>Wakhtiga la filayo (ETA)<input type="date" value={rn.eta} onChange={e => setRn({ ...rn, eta: e.target.value })} /></label></div>
                <div className="two"><label>Tracking<input value={rn.tracking} onChange={e => setRn({ ...rn, tracking: e.target.value })} /></label><label>Xaalad<select value={rn.status} onChange={e => setRn({ ...rn, status: e.target.value })}>{RST.map(x => <option key={x}>{x}</option>)}</select></label></div>
                <label>Fiiro gaar ah<input value={rn.note} onChange={e => setRn({ ...rn, note: e.target.value })} /></label>
                <label>Sawirka caddaynta (invoice / lacag bixin)<input key={String(!!proof)} type="file" accept="image/*" onChange={e => setProof(e.target.files[0])} /></label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={asExp} onChange={e => setAsExp(e.target.checked)} />Ku diiwaangeli kharash (Alaab iibsasho)</label>
                <button>Kaydi dalabka</button></form>
              <div className="card wrap"><div className="tabs">{[["all", "Dhammaan"], ...RST.map(x => [x, x])].map(t => <button key={t[0]} className={"tab" + (rf === t[0] ? " on" : "")} onClick={() => setRf(t[0])}>{t[1]}</button>)}</div>
                <table><thead><tr><th>Alaab</th><th>Suuq</th><th>Tiro</th><th>Wadarta</th><th>ETA</th><th>Xaalad</th><th></th></tr></thead><tbody>{reqList.map(r => { const late = r.eta && r.eta < today() && r.status !== "Yimid" && r.status !== "Stock-ga la geliyay"; return <tr key={r.id}><td><b>{r.item}</b><div className="mut">{r.details}{r.note ? " · " + r.note : ""}{r.tracking ? " · #" + r.tracking : ""}</div></td><td>{r.origin}<div className="mut">{r.supplier}</div></td><td>{r.qty}</td><td><b>{money(impTotal(r))}</b></td><td className={late ? "neg" : ""}>{r.eta || "-"}{late && <div className="mut">Dib u dhacay</div>}</td><td><select style={{ width: "auto" }} value={r.status} onChange={e => setStatus(r, e.target.value)}>{RST.map(x => <option key={x}>{x}</option>)}</select></td><td><div className="row">{r.proof_url && <button className="g sm" onClick={() => openProof(r.proof_url)}>📎</button>}<button className="g sm" title="Ku dar Inventory" onClick={() => setEdit({ name: r.item, cat: r.cat, note: r.details || "", variants: [{ color: "", size: "", qty: r.qty }] })}>📦</button><button className="g sm" onClick={async () => { if (confirm("Tirtir dalabkan?")) { await supabase.from("store_imports").delete().eq("id", r.id); load(); } }}>×</button></div></td></tr>; })}</tbody></table>{reqList.length === 0 && <p className="mut">Dalab ma jiro.</p>}</div></div></>}

          {view === "rep" && <>
            <div className="row" style={{ marginBottom: 14 }}><select style={{ width: "auto" }} value={per} onChange={e => setPer(+e.target.value)}><option value={7}>7 maalmood</option><option value={30}>30 maalmood</option><option value={90}>90 maalmood</option><option value={0}>Dhammaan</option></select><span style={{ flex: 1 }} /></div>
            <div className="card" style={{ marginBottom: 14 }}><h3>Soo deji warbixinada</h3><div className="row"><button onClick={() => exp(() => exportExcel(xdata))}>⬇ Excel (dhammaan)</button>{[["inv", "PDF Inventory"], ["sales", "PDF Iibka"], ["fin", "PDF Maaliyadda"], ["months", "PDF Bilaha"]].map(t => <button key={t[0]} className="g" onClick={() => exp(() => exportPDF(t[0], xdata))}>⬇ {t[1]}</button>)}</div><p className="mut" style={{ marginBottom: 0 }}>PDF-ka Iibka iyo Maaliyadda wuxuu raacayaa muddada aad kor ka doorato.</p></div>
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


function StaffAdmin({ me }) {
  const blank = { username: "", full_name: "", role: "cashier", password: "" };
  const [rows, setRows] = useState([]), [f, setF] = useState(blank), [cred, setCred] = useState(null);
  const load = useCallback(async () => { const { data } = await supabase.from("staff").select("*").order("created_at"); setRows(data || []); }, []);
  useEffect(() => { load(); }, [load]);
  const call = async body => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error || data?.error) { alert(data?.error || error.message || "Cilad ayaa dhacday"); return false; }
    return true;
  };
  const gen = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
  async function create(e) {
    e.preventDefault();
    if (await call({ action: "create", ...f })) { setCred({ username: f.username.trim().toLowerCase(), password: f.password, role: f.role, name: f.full_name }); setF(blank); load(); }
  }
  async function reset(r) {
    if (!confirm("Password cusub u samee " + r.username + "?")) return;
    const pw = gen();
    if (await call({ action: "reset", user_id: r.user_id, password: pw })) setCred({ username: r.username, password: pw, role: r.role, name: r.full_name });
  }
  const msg = c => "KAFAYA BOUTIQUE\nLink: " + window.location.origin + "\nUsername: " + c.username + "\nPassword: " + c.password + "\nRole: " + ROLE_L[c.role] + "\n(Beddel password-ka marka aad gasho.)";
  return (
    <div className="gap">
      {cred && <div className="card" style={{ background: "#fff8e1" }}><h3>Xogta gelitaanka: {cred.name || cred.username}</h3>
        <p style={{ margin: 0 }}>Username: <b>{cred.username}</b><br />Password: <b>{cred.password}</b></p>
        <p className="mut">Password-ka mar kale lama arki karo. Koobi ama u dir hadda. Haddii la lumiyo, admin-ku wuu beddeli karaa.</p>
        <div className="row"><button className="g sm" onClick={() => navigator.clipboard.writeText(msg(cred))}>📋 Koobi</button><a href={"https://wa.me/?text=" + encodeURIComponent(msg(cred))} target="_blank" rel="noreferrer"><button className="g sm">💬 U dir WhatsApp</button></a><button className="g sm" onClick={() => setCred(null)}>Xir</button></div></div>}
      <div className="split">
        <form className="card gap" onSubmit={create}><h3>Shaqaale cusub</h3>
          <label>Username (code)<input required value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="tusaale: fadumo" autoCapitalize="none" /></label>
          <label>Magaca buuxa<input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></label>
          <label>Doorka<select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option value="cashier">Cashier (iib, macaamiil, stock)</option><option value="supervisor">Supervisor (dhammaan marka laga reebo shaqaalaha)</option><option value="admin">Admin (dhammaan)</option></select></label>
          <label>Password<div className="row"><input required style={{ flex: 1 }} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /><button type="button" className="g" onClick={() => setF({ ...f, password: gen() })}>🎲</button></div></label>
          <button>Abuur akoon</button></form>
        <div className="card wrap"><h3>Shaqaalaha ({rows.length})</h3>
          <table><thead><tr><th>Username</th><th>Magac</th><th>Doorka</th><th>Xaalad</th><th></th></tr></thead><tbody>{rows.map(r => <tr key={r.user_id}><td><b>{r.username}</b></td><td>{r.full_name}</td>
            <td><select style={{ width: "auto" }} disabled={r.user_id === me} value={r.role} onChange={async e => { if (await call({ action: "role", user_id: r.user_id, role: e.target.value })) load(); }}>{Object.keys(ROLE_L).map(k => <option key={k} value={k}>{ROLE_L[k]}</option>)}</select></td>
            <td><span className={"badge " + (r.active ? "ok" : "out")}>{r.active ? "Furan" : "La xiray"}</span></td>
            <td><div className="row"><button className="g sm" onClick={() => reset(r)}>Reset password</button>{r.user_id !== me && <button className="g sm" onClick={async () => { if (await call({ action: "active", user_id: r.user_id, active: !r.active })) load(); }}>{r.active ? "Xir" : "Fur"}</button>}</div></td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}


const PAL = ["#72243e", "#c9a227", "#2e7d32", "#3b6fd4", "#d96c8f", "#8d6e63", "#00897b", "#f57c00", "#7b1fa2"];
function Dashboard({ items, sales, fin, reqs, name, go }) {
  const day = k => new Date(Date.now() - k * 864e5).toISOString().slice(0, 10);
  const between = (a, b) => sales.filter(s => { const d = s.created_at.slice(0, 10); return d >= day(a) && d <= day(b); });
  const T = a => sum(a, s => s.total);
  const pct = (a, b) => (b ? Math.round((a - b) / b * 100) : null);
  const sToday = between(0, 0), tToday = T(sToday), tYest = T(between(1, 1)), w1 = T(between(6, 0)), w0 = T(between(13, 7)), s30 = between(29, 0), mk = today().slice(0, 7);
  const incM = sum(sales.filter(s => s.created_at.startsWith(mk)), s => s.total) + sum(fin.filter(f => f.kind === "income" && f.entry_date.startsWith(mk)), f => f.amount);
  const expM = sum(fin.filter(f => f.kind === "expense" && f.entry_date.startsWith(mk)), f => f.amount);
  const line = Array.from({ length: 14 }, (_, i) => { const k = 13 - i; return { d: day(k).slice(5), v: T(between(k, k)) }; });
  const byItem = {}, byCat = {};
  s30.forEach(s => (s.items || []).forEach(l => { const o = byItem[l.id] || (byItem[l.id] = { id: l.id, name: l.name, qty: 0, rev: 0 }); o.qty += +l.qty; o.rev += l.qty * l.price; const p = items.find(x => x.id === l.id), c = p ? p.cat : "x"; byCat[c] = (byCat[c] || 0) + l.qty * l.price; }));
  const top = Object.values(byItem).sort((a, b) => b.qty - a.qty).slice(0, 5), maxTop = Math.max(1, top[0] ? top[0].qty : 1);
  const catData = Object.entries(byCat).map(([k, v]) => ({ name: k === "x" ? "Kale" : cn(k), value: Math.round(v) })).sort((a, b) => b.value - a.value);
  const alerts = items.filter(p => st(p) !== "ok"), outN = items.filter(p => st(p) === "out").length;
  const dead = items.filter(p => tot(p) > 0 && !byItem[p.id] && Date.now() - new Date(p.created_at) > 30 * 864e5);
  const open = reqs.filter(r => r.status === "La dalbaday" || r.status === "Waddada ku jira");
  const late = open.filter(r => r.eta && r.eta < today()), soon = open.filter(r => r.eta && r.eta >= today() && r.eta <= day(-3));
  const cm = {}; sales.forEach(s => { const k = (s.customer_phone || "").replace(/\D/g, ""); if (k && (!cm[k] || s.created_at > cm[k])) cm[k] = s.created_at; });
  const cold = Object.values(cm).filter(d => d.slice(0, 10) < day(30)).length;
  const tp = top[0] && items.find(p => p.id === top[0].id), tr = pct(w1, w0);
  const ins = [];
  if (outN) ins.push({ l: 0, e: "🚫", t: outN + " alaab way dhammaatay stock-ga.", b: "Eeg stock", v: "inv" });
  if (alerts.length - outN > 0) ins.push({ l: 1, e: "⚠️", t: (alerts.length - outN) + " alaab stock-gooda waa hooseeyaa (3 ama ka yar).", b: "Eeg stock", v: "inv" });
  if (tp && tot(tp) <= 5) ins.push({ l: 1, e: "🔥", t: '"' + tp.name + '" waa kan ugu iibsiga badan, laakiin ' + tot(tp) + " xabo ayaa hadhay. Dib u dalbo.", b: "Dalab cusub", v: "req" });
  if (tr !== null) ins.push(tr >= 10 ? { l: 3, e: "📈", t: "Iibku wuu kordhay " + tr + "% usbuucan marka loo eego usbuucii hore." } : tr <= -10 ? { l: 1, e: "📉", t: "Iibku wuu dhacay " + Math.abs(tr) + "% usbuucan. Tijaabi fariin WhatsApp ah oo macaamiisha loo diro.", b: "Macaamiisha", v: "cust" } : { l: 2, e: "➖", t: "Iibku waa deggan yahay usbuucan." });
  if (late.length) ins.push({ l: 0, e: "🚢", t: late.length + " dalab (China/Dubai) ayaa dib u dhacay ETA-giisii.", b: "Eeg dalabyada", v: "req" });
  if (soon.length) ins.push({ l: 2, e: "📦", t: soon.length + " dalab ayaa 3 maalmood gudahood imanaya.", b: "Eeg dalabyada", v: "req" });
  if (dead.length) ins.push({ l: 2, e: "🧊", t: dead.length + " alaab 30 maalmood ma iibsan. Tixgeli qiimo dhimis ama soo bandhig.", b: "Eeg alaabta", v: "inv" });
  if (cold) ins.push({ l: 2, e: "💬", t: cold + " macmiil 30+ maalmood ma iibsan. U dir fariin WhatsApp ah.", b: "Macaamiisha", v: "cust" });
  if (expM > incM && expM > 0) ins.push({ l: 0, e: "💸", t: "Kharashka bishan wuu ka badan yahay dakhliga.", b: "Finance", v: "fin" });
  if (!ins.length) ins.push({ l: 3, e: "🎉", t: "Wax digniin ah ma jiraan. Dukaanku si fiican ayuu u socdaa." });
  ins.sort((a, b) => a.l - b.l);
  const cls = ["bad", "warn", "info", "good"];
  const Dl = ({ a, b }) => { const d = pct(a, b); return d === null ? null : <span className={"delta " + (d >= 0 ? "up" : "down")}>{d >= 0 ? "▲" : "▼"} {Math.abs(d)}%</span>; };
  return (
    <>
      <div className="dh">
        <div><h1>Soo dhawoow, {name} 👋</h1><p>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p></div>
        <div className="row"><div className="pill"><b>{money(tToday)}</b><span>Iibka maanta</span></div><div className="pill"><b>{sToday.length}</b><span>Iib maanta</span></div><div className="pill"><b>{alerts.length}</b><span>Digniino stock</span></div></div>
      </div>
      <div className="kpis">
        <div className="kpi"><span>Iibka maanta</span><b>{money(tToday)}</b><Dl a={tToday} b={tYest} /> <small>shalay ka dib</small></div>
        <div className="kpi"><span>Iibka 7 maalmood</span><b>{money(w1)}</b><Dl a={w1} b={w0} /> <small>usbuucii hore ka dib</small></div>
        <div className="kpi"><span>Faa'iidada bishan</span><b className={incM - expM >= 0 ? "up" : "down"}>{money(incM - expM)}</b><small>Dakhli {money(incM)} · Kharash {money(expM)}</small></div>
        <div className="kpi"><span>Stock-ga</span><b>{sum(items, tot)} xabo</b><small>Qiimaha {money(sum(items, p => tot(p) * (+p.price || 0)))}</small></div>
      </div>
      <div className="dgrid">
        <div className="card"><h3>Iibka 14-kii maalmood</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={line}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#72243e" stopOpacity={0.35} /><stop offset="95%" stopColor="#72243e" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="d" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={v => money(v)} /><Area type="monotone" dataKey="v" stroke="#72243e" strokeWidth={2.5} fill="url(#g1)" /></AreaChart></ResponsiveContainer></div>
        <div className="card"><h3>✨ Talooyin smart ah</h3><p className="mut" style={{ marginTop: -6 }}>Waxaa laga xisaabiyay xogta dukaankaaga.</p>
          {ins.slice(0, 6).map((x, i) => <div className={"ins " + cls[x.l]} key={i}><span className="e">{x.e}</span><span className="x">{x.t}</span>{x.b && <button className="g" onClick={() => go(x.v)}>{x.b}</button>}</div>)}</div>
      </div>
      <div className="cols">
        <div className="card"><h3>Alaabta ugu iibsiga badan (30 maalmood)</h3>{top.map(t => <div className="li" key={t.id}><div className="t"><b>{t.name}</b><div className="bar"><i style={{ width: t.qty / maxTop * 100 + "%" }} /></div></div><span className="mut">{t.qty} xabo</span></div>)}{top.length === 0 && <p className="mut">Weli iib ma jiro.</p>}</div>
        <div className="card"><h3>Iibka qayb kasta (30 maalmood)</h3>{catData.length === 0 ? <p className="mut">Weli iib ma jiro.</p> : <div className="row" style={{ flexWrap: "nowrap" }}><div style={{ width: 150, height: 150 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={catData} dataKey="value" innerRadius={42} outerRadius={68} paddingAngle={2}>{catData.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]} />)}</Pie></PieChart></ResponsiveContainer></div><div style={{ flex: 1 }}>{catData.slice(0, 6).map((c, i) => <div key={c.name} className="mut"><span className="dot" style={{ background: PAL[i % PAL.length] }} />{c.name} · {money(c.value)}</div>)}</div></div>}</div>
        <div className="card"><h3>Stock hoose</h3>{alerts.slice(0, 5).map(p => <div className="li" key={p.id}><div className="ic">{p.img ? <img alt="" src={p.img} /> : ICON[p.cat] || "🛍️"}</div><div className="t"><b>{p.name}</b><span className="mut">{cn(p.cat)}</span></div><span className={"badge " + st(p)}>{tot(p)}</span></div>)}{alerts.length === 0 && <p className="mut">Dhammaan stock-gu waa fiicanyahay 👍</p>}</div>
        <div className="card"><h3>Dalabyada socda (China / Dubai)</h3>{open.slice(0, 5).map(r => <div className="li" key={r.id}><div className="ic">🚢</div><div className="t"><b>{r.item}</b><span className="mut">{r.origin} · ETA {r.eta || "-"}</span></div><span className="mut">{r.qty}</span></div>)}{open.length === 0 && <p className="mut">Dalab socda ma jiro.</p>}</div>
      </div>
    </>
  );
}