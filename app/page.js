"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CATS = [["abaya","Abayo"],["tarxad","Tarxado"],["xijaab","Xijaabyo"],["saraawiil","Saraawiil"],["dirac","Dirac"],["kab","Kab & Gabsaar"],["caruur","Dharka Caruurta"]];
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
  return session ? <App /> : <Login />;
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
      <button>Gal</button>
    </form>
  );
}

function App() {
  const [items, setItems] = useState([]), [cat, setCat] = useState("all"), [q, setQ] = useState(""), [flt, setFlt] = useState(""), [tab, setTab] = useState("items"), [edit, setEdit] = useState(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("catalog_items").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = items.filter(p => {
    if (cat !== "all" && p.cat !== cat) return false;
    if (flt && st(p) !== flt) return false;
    const h = (p.name + " " + (p.note || "") + " " + (p.variants || []).map(v => v.color + " " + v.size).join(" ")).toLowerCase();
    return !q || h.includes(q.toLowerCase());
  });
  const byCat = CATS.map(c => ({ n: c[1], qty: items.filter(p => p.cat === c[0]).reduce((a, p) => a + tot(p), 0) }));
  const stat = ["ok", "low", "out"].map(k => ({ name: STL[k], value: items.filter(p => st(p) === k).length }));
  const COL = ["#2e7d32", "#c9a227", "#b3261e"];

  async function del(p) {
    if (!confirm("Ma hubtaa inaad tirtirto alaabtan?")) return;
    await supabase.from("catalog_items").delete().eq("id", p.id); load();
  }
  const rows = () => items.flatMap(p => (p.variants?.length ? p.variants : [{}]).map(v => ({ Magac: p.name, Qayb: cn(p.cat), Qiimo: p.price, Midab: v.color || "", Cabbir: v.size || "", Tiro: v.qty || 0 })));
  async function xlsx() {
    const X = await import("xlsx"); const ws = X.utils.json_to_sheet(rows()); const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Alaabta"); X.writeFile(wb, "kafaya-alaabta.xlsx");
  }
  async function pdf() {
    const { default: J } = await import("jspdf"); const AT = (await import("jspdf-autotable")).default;
    const d = new J(); d.setFontSize(16); d.text("KAFAYA BOUTIQUE - Liiska Alaabta", 14, 15);
    AT(d, { startY: 22, head: [["Magac", "Qayb", "Qiimo", "Midab", "Cabbir", "Tiro"]], body: rows().map(r => Object.values(r)), headStyles: { fillColor: [114, 36, 62] } });
    d.save("kafaya-alaabta.pdf");
  }

  return (
    <>
      <header>
        <div className="row"><Logo /><div><h1>KAFAYA BOUTIQUE</h1><small>Ku Filan</small></div></div>
        <button className="g sm" onClick={() => supabase.auth.signOut()}>Ka bax</button>
      </header>
      <main>
        <div className="row" style={{ marginBottom: 12 }}>
          <button className={"tab " + (tab === "dash" ? "on" : "")} onClick={() => setTab("dash")}>Dashboard</button>
          <button className={"tab " + (tab === "items" ? "on" : "")} onClick={() => setTab("items")}>Alaabta</button>
          <span style={{ flex: 1 }} />
          <button className="g sm" onClick={xlsx}>Excel</button><button className="g sm" onClick={pdf}>PDF</button>
        </div>
        {tab === "dash" ? (
          <>
            <div className="stats">
              {[[items.length, "Nooc alaab"], [items.reduce((a, p) => a + tot(p), 0), "Wadarta xabbadaha"], [stat[1].value, "Stock hoose"], [stat[2].value, "Dhammaaday"]].map((s, i) =>
                <div className="card stat" key={i}><b>{s[0]}</b><span>{s[1]}</span></div>)}
            </div>
            <div className="charts">
              <div className="card"><div className="mut">Xabbadaha qayb kasta</div><ResponsiveContainer width="100%" height={240}><BarChart data={byCat}><XAxis dataKey="n" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="qty" fill="#72243e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <div className="card"><div className="mut">Xaaladda stock-ga</div><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={stat} dataKey="value" nameKey="name" outerRadius={85} label>{stat.map((_, i) => <Cell key={i} fill={COL[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            </div>
          </>
        ) : (
          <>
            <div className="row">
              <input style={{ flex: 1, minWidth: 180 }} placeholder="Raadi magac, midab ama cabbir..." value={q} onChange={e => setQ(e.target.value)} />
              <select style={{ width: "auto" }} value={flt} onChange={e => setFlt(e.target.value)}><option value="">Dhammaan stock-ga</option><option value="low">Stock hoose</option><option value="out">Dhammaaday</option></select>
              <button onClick={() => setEdit({})}>+ Alaab cusub</button>
            </div>
            <div className="tabs">{[["all", "Dhammaan"], ...CATS].map(c => <button key={c[0]} className={"tab " + (cat === c[0] ? "on" : "")} onClick={() => setCat(c[0])}>{c[1]}</button>)}</div>
            <div className="grid">
              {list.length === 0 && <div className="mut" style={{ padding: 30 }}>Alaab lama helin.</div>}
              {list.map(p => (
                <div className="item" key={p.id}>
                  <div className="ph">{p.img ? <img alt="" src={p.img} /> : p.name[0]}</div>
                  <div className="bd">
                    <h3>{p.name}</h3><div className="mut">{cn(p.cat)}</div>
                    {p.price > 0 && <div className="price">${(+p.price).toFixed(2)}</div>}
                    <div>{(p.variants || []).map((v, i) => <span className="chip" key={i}>{v.color || "-"} · {v.size || "-"} · {v.qty}</span>)}</div>
                    <span className={"badge " + st(p)}>{STL[st(p)]} · {tot(p)} xabbo</span>
                    <div className="row"><button className="g sm" onClick={() => setEdit(p)}>Wax ka beddel</button><button className="g sm" onClick={() => del(p)}>Tirtir</button></div>
                  </div>
                </div>))}
            </div>
          </>
        )}
      </main>
      {edit && <Editor p={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}

function Editor({ p, onClose, onSaved }) {
  const [f, setF] = useState({ name: p.name || "", cat: p.cat || CATS[0][0], price: p.price || "", note: p.note || "" });
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
    const row = { name: f.name.trim(), cat: f.cat, price: +f.price || 0, note: f.note, img, variants: vs.filter(v => v.color || v.size || v.qty).map(v => ({ ...v, qty: +v.qty || 0 })) };
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
