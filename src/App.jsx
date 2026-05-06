import { useState, useEffect, useCallback } from "react";
import {
  deleteReservation as deleteCloudReservation,
  deleteReservations as deleteCloudReservations,
  fetchReservations,
  insertReservations,
  isSupabaseConfigured,
  supabase,
  updateReservation,
} from "./supabaseClient";

const MONTHS_BG = ["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"];
const DAYS_BG = ["Пон","Вт","Ср","Чет","Пет","Съб","Нед"];
const COLORS = ["#e8604c","#3d8b5e","#5b7fa6","#c47c2b","#7b5ea7","#2b9ca8","#b85c8a"];
const KEY = "rezervacii-v1";

async function loadFromStorage() {
  try {
    if (window.storage?.get) {
      const r = await window.storage.get(KEY);
      return r ? JSON.parse(r.value) : [];
    }
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveToStorage(data) {
  try {
    const raw = JSON.stringify(data);
    if (window.storage?.set) {
      await window.storage.set(KEY, raw);
      return;
    }
    window.localStorage.setItem(KEY, raw);
  } catch {}
}

function dateStr(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function parseDate(s) { const [y,m,d] = s.split("-").map(Number); return { y, m: m-1, d }; }
function getDaysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { let d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

function fmtDate(ds) {
  if (!ds) return "";
  const { y, m, d } = parseDate(ds);
  return `${d} ${MONTHS_BG[m]} ${y}`;
}

function sortDateStrings(dates) {
  return [...dates].sort((a,b)=>a.localeCompare(b));
}

function fmtDateList(dates) {
  const sorted = sortDateStrings(dates);
  if (sorted.length <= 3) return sorted.map(fmtDate).join(", ");
  return `${sorted.slice(0,3).map(fmtDate).join(", ")} + още ${sorted.length-3}`;
}

function colorFor(name) {
  return COLORS[Math.abs([...name].reduce((a,c)=>a+c.charCodeAt(0),0)) % COLORS.length];
}

function statusColors(status) {
  if (status === "Чакаща") return { bg:"#e8a820", soft:"#fff7d7", text:"#6b4a00", border:"#e8a820" };
  if (status === "Отменена") return { bg:"#6b7280", soft:"#eef0f2", text:"#3d424a", border:"#6b7280" };
  return { bg:"#e8604c", soft:"#fde8e5", text:"#8f241c", border:"#e8604c" };
}

function exportCSV(reservations) {
  const header = "Дата,Клиент,Телефон,Бележки,Статус";
  const rows = reservations.map(r =>
    `"${r.date}","${r.name}","${r.phone||""}","${(r.notes||"").replace(/"/g,'""')}","${r.status||"Потвърдена"}"`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="rezervacii.csv"; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split("\n").slice(1);
  return lines.map(line => {
    const cols=[]; let cur="", inQ=false;
    for(let i=0;i<line.length;i++){
      if(line[i]==='"'){inQ=!inQ;continue;}
      if(line[i]===','&&!inQ){cols.push(cur);cur="";continue;}
      cur+=line[i];
    }
    cols.push(cur);
    return {id:Date.now()+Math.random(),date:cols[0]||"",name:cols[1]||"",phone:cols[2]||"",notes:cols[3]||"",status:cols[4]||"Потвърдена"};
  }).filter(r=>r.date&&r.name);
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#faf7f2",borderRadius:20,padding:24,width:"100%",maxWidth:460,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [multiSelect, setMultiSelect] = useState(true);
  const [selectedDates, setSelectedDates] = useState([]);
  const [addDates, setAddDates] = useState([]);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({name:"",phone:"",notes:"",status:"Потвърдена"});
  const [view, setView] = useState("calendar");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const cloudMode = isSupabaseConfigured;

  const showMessage = useCallback((text) => {
    setMsg(text);
    setTimeout(()=>setMsg(""),3000);
  },[]);

  const saveLocal = useCallback((data)=>{ setReservations(data); saveToStorage(data); },[]);

  const refreshCloud = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      setBusy(true);
      setReservations(await fetchReservations());
    } catch (error) {
      showMessage(`❌ ${error.message || "Грешка при зареждане от Supabase."}`);
    } finally {
      setBusy(false);
    }
  },[showMessage]);

  useEffect(()=>{
    if (!isSupabaseConfigured) {
      loadFromStorage().then(setReservations);
      return;
    }

    refreshCloud();
  },[refreshCloud]);

  useEffect(()=>{
    if (!cloudMode) return;
    const channel = supabase
      .channel("reservations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, refreshCloud)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },[cloudMode, refreshCloud]);

  const resForDate = (ds) => reservations.filter(r=>r.date===ds);
  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const toggleSelectedDate = (ds) => {
    setSelectedDates(dates => dates.includes(ds)
      ? dates.filter(d=>d!==ds)
      : sortDateStrings([...dates, ds])
    );
  };
  const toggleMultiSelect = () => {
    setMultiSelect(active => {
      if (active) setSelectedDates([]);
      setModal(null);
      return !active;
    });
  };
  const openDay = (ds) => {
    if (multiSelect) {
      toggleSelectedDate(ds);
      return;
    }
    setSelectedDate(ds);
    setAddDates([]);
    setModal("day");
  };
  const openAdd = (ds) => {
    const dates = sortDateStrings(ds ? [ds] : (multiSelect && selectedDates.length ? selectedDates : [selectedDate || todayStr]));
    setSelectedDate(dates[0] || null);
    setAddDates(dates);
    setForm({name:"",phone:"",notes:"",status:"Потвърдена"});
    setModal("add");
  };
  const openEdit = (r) => {
    setEditId(r.id);
    setAddDates([]);
    setSelectedDate(r.date);
    setForm({name:r.name,phone:r.phone||"",notes:r.notes||"",status:r.status||"Потвърдена"});
    setModal("edit");
  };
  const closeForm = () => {
    if (modal==="edit" && selectedDate && !multiSelect) {
      setModal("day");
      return;
    }
    setModal(addDates.length===1 && selectedDate && !multiSelect ? "day" : null);
  };

  const submitAdd = async () => {
    if(!form.name.trim() || !addDates.length) return;
    const baseId = Date.now();
    const created = addDates.map((date, index)=>({id:baseId+index,date,...form}));
    try {
      setBusy(true);
      if (cloudMode) {
        const saved = await insertReservations(created);
        setReservations(data=>[...data,...saved]);
      } else {
        saveLocal([...reservations,...created]);
      }
    } catch (error) {
      showMessage(`❌ ${error.message || "Грешка при запис."}`);
      return;
    } finally {
      setBusy(false);
    }
    if (created.length > 1) {
      setSelectedDates([]);
      showMessage(`✅ Добавени ${created.length} резервации!`);
      setModal(null);
      return;
    }
    setModal("day");
  };
  const submitEdit = async () => {
    if(!form.name.trim()) return;
    try {
      setBusy(true);
      if (cloudMode) {
        const saved = await updateReservation(editId, form);
        setReservations(data=>data.map(r=>r.id===editId?saved:r));
      } else {
        saveLocal(reservations.map(r=>r.id===editId?{...r,...form}:r));
      }
      setModal("day");
    } catch (error) {
      showMessage(`❌ ${error.message || "Грешка при промяна."}`);
    } finally {
      setBusy(false);
    }
  };
  const deleteRes = async (id) => {
    try {
      setBusy(true);
      if (cloudMode) await deleteCloudReservation(id);
      const next = reservations.filter(r=>r.id!==id);
      cloudMode ? setReservations(next) : saveLocal(next);
    } catch (error) {
      showMessage(`❌ ${error.message || "Грешка при изтриване."}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteSelectedDateReservations = async () => {
    const selectedIds = reservations
      .filter(r=>selectedDates.includes(r.date))
      .map(r=>r.id);

    if (!selectedIds.length) return;

    try {
      setBusy(true);
      if (cloudMode) await deleteCloudReservations(selectedIds);
      const next = reservations.filter(r=>!selectedIds.includes(r.id));
      cloudMode ? setReservations(next) : saveLocal(next);
      showMessage(`✅ Изтрити ${selectedIds.length} резервации от избраните дати.`);
    } catch (error) {
      showMessage(`❌ ${error.message || "Грешка при изтриване."}`);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imported = parseCSV(ev.target.result);
      if(!imported.length){setMsg("❌ Файлът е празен или грешен формат.");setTimeout(()=>setMsg(""),3000);return;}
      try {
        if (cloudMode) {
          insertReservations(imported).then(saved=>{
            setReservations(data=>[...data,...saved]);
            showMessage(`✅ Внесени ${saved.length} резервации!`);
          }).catch(error=>showMessage(`❌ ${error.message || "Грешка при внос."}`));
        } else {
          saveLocal([...reservations,...imported]);
          showMessage(`✅ Внесени ${imported.length} резервации!`);
        }
      } catch (error) {
        showMessage(`❌ ${error.message || "Грешка при внос."}`);
      }
    };
    reader.readAsText(file,"UTF-8"); e.target.value="";
  };

  const daysInMonth = getDaysInMonth(year,month);
  const firstDay = getFirstDayOfMonth(year,month);
  const totalCells = Math.ceil((firstDay+daysInMonth)/7)*7;
  const cells = Array.from({length:totalCells},(_,i)=>{ const d=i-firstDay+1; return(d>=1&&d<=daysInMonth)?d:null; });

  const dayRes = selectedDate ? resForDate(selectedDate) : [];
  const selectedReservations = selectedDates.length
    ? reservations.filter(r=>selectedDates.includes(r.date))
    : [];

  const S = {
    btn: (bg,col)=>({background:bg,color:col,border:"none",borderRadius:10,padding:"10px 16px",fontSize:14,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}),
    input: {width:"100%",padding:"12px",fontSize:16,border:"2px solid #d4e0d4",borderRadius:10,fontFamily:"inherit",boxSizing:"border-box",background:"#fafff9",outline:"none"},
    smallBtn: (bg)=>({background:bg,color:"#fff",border:"none",borderRadius:8,width:36,height:36,fontSize:15,cursor:"pointer",flexShrink:0}),
  };

  return (
    <div style={{minHeight:"100vh",background:"#faf7f2",fontFamily:"Georgia, serif",color:"#2a2118"}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#2c5f3a,#1a3d24)",color:"#fff",padding:"16px 20px",boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:24,fontWeight:"bold"}}>📅 Резервации</div>
            <div style={{fontSize:12,opacity:0.7}}>Общо: {reservations.length} резервации</div>
            <div style={{fontSize:11,opacity:0.7,fontFamily:"sans-serif"}}>
              {cloudMode ? "☁️ Обща база: отворен достъп" : "💾 Локално съхранение"}
            </div>
          </div>
          <button onClick={()=>setView(v=>v==="calendar"?"list":"calendar")} style={S.btn("#ffffff22","#fff")}>
            {view==="calendar"?"📋 Списък":"📅 Календар"}
          </button>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>exportCSV(reservations)} style={S.btn("#4a9960","#fff")}>⬇️ Изтегли CSV</button>
          <label style={{...S.btn("#e8a820","#fff"),cursor:"pointer"}}>
            ⬆️ Внеси CSV
            <input type="file" accept=".csv" onChange={handleImport} style={{display:"none"}}/>
          </label>
          {cloudMode && <button onClick={refreshCloud} disabled={busy} style={S.btn("#ffffff22","#fff")}>↻ Обнови</button>}
        </div>
      </div>

      {msg && <div style={{background:"#d4edda",padding:"10px 20px",fontSize:15,fontWeight:"bold",color:"#155724",textAlign:"center"}}>{msg}</div>}

      {view==="calendar" ? (
        <div style={{padding:"16px 12px"}}>
          {/* Month nav */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,background:"#fff",borderRadius:14,padding:"12px 16px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
            <button onClick={prevMonth} style={{background:"#e8f0e8",color:"#2c5f3a",border:"none",borderRadius:8,padding:"8px 14px",fontSize:14,fontWeight:"bold",cursor:"pointer"}}>◀</button>
            <div style={{fontSize:20,fontWeight:"bold",color:"#1a3d24"}}>{MONTHS_BG[month]} {year}</div>
            <button onClick={nextMonth} style={{background:"#e8f0e8",color:"#2c5f3a",border:"none",borderRadius:8,padding:"8px 14px",fontSize:14,fontWeight:"bold",cursor:"pointer"}}>▶</button>
          </div>

          <div style={{background:"#fff",borderRadius:14,padding:"12px",marginBottom:12,boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={toggleMultiSelect} style={S.btn(multiSelect?"#e8a820":"#e8f0e8",multiSelect?"#fff":"#2c5f3a")}>
                {multiSelect?"✓ Избор на дати":"☑ Избери няколко дати"}
              </button>
              {multiSelect && (
                <>
                  <button
                    onClick={()=>openAdd()}
                    disabled={!selectedDates.length}
                    style={{
                      ...S.btn(selectedDates.length?"#2c5f3a":"#d8d0c4",selectedDates.length?"#fff":"#777"),
                      cursor:selectedDates.length?"pointer":"not-allowed"
                    }}
                  >
                    + Резервация за {selectedDates.length} дати
                  </button>
                  <button
                    onClick={deleteSelectedDateReservations}
                    disabled={!selectedReservations.length || busy}
                    style={{
                      ...S.btn(selectedReservations.length && !busy ? "#e8604c" : "#d8d0c4", selectedReservations.length && !busy ? "#fff" : "#777"),
                      cursor:selectedReservations.length && !busy ? "pointer" : "not-allowed"
                    }}
                  >
                    🗑 Изтрий всички ({selectedReservations.length})
                  </button>
                  <button onClick={()=>setSelectedDates([])} style={S.btn("#f0e6db","#6b4a2f")}>Изчисти</button>
                </>
              )}
            </div>
            {multiSelect && (
              <div style={{marginTop:8,fontSize:12,color:selectedDates.length?"#2c5f3a":"#9c8b78",fontFamily:"sans-serif",lineHeight:1.4}}>
                {selectedDates.length
                  ? `Избрани: ${fmtDateList(selectedDates)}`
                  : "Натиснете няколко дни в календара, после запазете резервация за всички избрани дати."}
              </div>
            )}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
              {["Потвърдена","Чакаща","Отменена"].map(status=>{
                const c = statusColors(status);
                return (
                  <span key={status} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,color:c.text,fontFamily:"sans-serif",fontWeight:"bold"}}>
                    <span style={{width:12,height:12,borderRadius:3,background:c.bg,display:"inline-block"}}></span>
                    {status}
                  </span>
                );
              })}
            </div>
          </div>

          {multiSelect && selectedDates.length > 0 && (
            <div style={{background:"#fff",borderRadius:14,padding:"12px",marginBottom:12,boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
              <div style={{fontWeight:"bold",color:"#1a3d24",fontSize:15,marginBottom:8}}>Резервации за избраните дати</div>
              {selectedDates.map(ds=>{
                const dayReservations = resForDate(ds);
                return (
                  <div key={ds} style={{borderTop:"1px solid #eee4d8",paddingTop:8,marginTop:8}}>
                    <div style={{fontSize:13,fontWeight:"bold",color:"#2c5f3a",marginBottom:6,fontFamily:"sans-serif"}}>{fmtDate(ds)}</div>
                    {dayReservations.length===0 ? (
                      <div style={{fontSize:12,color:"#aaa",fontFamily:"sans-serif",marginBottom:5}}>Няма резервации</div>
                    ) : dayReservations.map(r=>{
                      const c = statusColors(r.status);
                      return (
                        <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,background:c.soft,borderLeft:`4px solid ${c.border}`,borderRadius:9,padding:"8px 9px",marginBottom:6}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:"bold",fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</div>
                            <div style={{fontSize:11,color:c.text,fontFamily:"sans-serif",fontWeight:"bold"}}>{r.status || "Потвърдена"}</div>
                          </div>
                          <button onClick={()=>openEdit(r)} style={S.smallBtn("#e8a820")}>✏️</button>
                          <button onClick={()=>deleteRes(r.id)} style={S.smallBtn("#e8604c")}>🗑</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Day labels */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
            {DAYS_BG.map(d=>(
              <div key={d} style={{textAlign:"center",fontWeight:"bold",fontSize:11,color:"#2c5f3a",padding:"4px 0",fontFamily:"sans-serif"}}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {cells.map((day,i)=>{
              if(!day) return <div key={i}/>;
              const ds = dateStr(year,month,day);
              const res = resForDate(ds);
              const isToday = ds===todayStr;
              const isSelected = selectedDates.includes(ds);
              return (
                <div key={i} onClick={()=>openDay(ds)} style={{
                  background:isSelected?"#fff7d7":(isToday?"#e8f5ec":"#fff"),
                  border:isSelected?"2px solid #e8a820":(isToday?"2px solid #2c5f3a":"1px solid #e8e0d4"),
                  borderRadius:10,minHeight:68,padding:"5px 6px",cursor:"pointer",
                  boxShadow:isSelected?"0 2px 8px rgba(232,168,32,0.25)":(res.length?"0 2px 6px rgba(44,95,58,0.12)":"none"),
                  position:"relative"
                }}>
                  {isSelected && <div style={{position:"absolute",top:4,right:5,background:"#e8a820",color:"#fff",borderRadius:999,width:17,height:17,fontSize:11,lineHeight:"17px",textAlign:"center",fontFamily:"sans-serif",fontWeight:"bold"}}>✓</div>}
                  <div style={{fontSize:14,fontWeight:isToday?"bold":"normal",color:isToday?"#2c5f3a":"#2a2118",marginBottom:3}}>{day}</div>
                  {res.slice(0,2).map(r=>{
                    const c = statusColors(r.status);
                    return (
                      <div key={r.id} style={{background:c.bg,color:"#fff",fontSize:9,borderRadius:4,padding:"1px 3px",marginBottom:2,fontFamily:"sans-serif",display:"flex",alignItems:"center",gap:3,minWidth:0}}>
                        <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{r.name}</span>
                        <button
                          onClick={(e)=>{e.stopPropagation(); deleteRes(r.id);}}
                          title="Изтрий"
                          style={{border:"none",background:"rgba(255,255,255,0.22)",color:"#fff",borderRadius:4,width:14,height:14,lineHeight:"12px",fontSize:10,padding:0,cursor:"pointer",flexShrink:0}}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {res.length>2 && <div style={{fontSize:9,color:"#888",fontFamily:"sans-serif"}}>+{res.length-2}</div>}
                </div>
              );
            })}
          </div>
          <div style={{textAlign:"center",marginTop:12,fontSize:12,color:"#aaa",fontFamily:"sans-serif"}}>
            {multiSelect ? "Изберете няколко дни → добавете една резервация за всички" : "Натиснете ден → добавете резервация"}
          </div>
        </div>
      ) : (
        // LIST
        <div style={{padding:"16px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:"bold",color:"#1a3d24"}}>Всички резервации</div>
            <button onClick={()=>openAdd(todayStr)} style={S.btn("#2c5f3a","#fff")}>+ Нова</button>
          </div>
          {reservations.length===0 ? (
            <div style={{textAlign:"center",padding:50,color:"#bbb",fontSize:16}}>Няма резервации</div>
          ) : (
            [...reservations].sort((a,b)=>a.date.localeCompare(b.date)).map(r=>(
              <div key={r.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${colorFor(r.name)}`,display:"flex",gap:12,alignItems:"center"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:"bold",fontSize:16}}>{r.name}</div>
                  {r.phone&&<div style={{fontSize:13,color:"#666",fontFamily:"sans-serif"}}>📞 {r.phone}</div>}
                  {r.notes&&<div style={{fontSize:12,color:"#888",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.notes}</div>}
                  <div style={{fontSize:12,color:"#2c5f3a",fontWeight:"bold",marginTop:2,fontFamily:"sans-serif"}}>{fmtDate(r.date)}</div>
                  <div style={{fontSize:11,fontFamily:"sans-serif",display:"inline-block",marginTop:3,background:r.status==="Отменена"?"#fde8e8":"#e8f5ec",color:r.status==="Отменена"?"#c0392b":"#2c5f3a",borderRadius:6,padding:"1px 7px"}}>{r.status}</div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  <button onClick={()=>openEdit(r)} style={S.smallBtn("#e8a820")}>✏️</button>
                  <button onClick={()=>deleteRes(r.id)} style={S.smallBtn("#e8604c")}>🗑</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DAY MODAL */}
      {modal==="day" && selectedDate && (
        <Modal onClose={()=>setModal(null)}>
          <h2 style={{margin:"0 0 14px",color:"#1a3d24",fontSize:20}}>📅 {fmtDate(selectedDate)}</h2>
          {dayRes.length===0
            ? <div style={{color:"#aaa",textAlign:"center",padding:"16px 0",fontSize:15}}>Няма резервации за този ден</div>
            : dayRes.map(r=>(
              <div key={r.id} style={{background:"#f7f9f7",borderLeft:`4px solid ${colorFor(r.name)}`,borderRadius:10,padding:"12px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:"bold",fontSize:17}}>{r.name}</div>
                    {r.phone&&<div style={{fontSize:14,color:"#555",fontFamily:"sans-serif"}}>📞 {r.phone}</div>}
                    {r.notes&&<div style={{fontSize:13,color:"#777",marginTop:4,fontStyle:"italic"}}>{r.notes}</div>}
                    <div style={{fontSize:11,fontFamily:"sans-serif",marginTop:6,display:"inline-block",background:r.status==="Отменена"?"#fde8e8":"#e8f5ec",color:r.status==="Отменена"?"#c0392b":"#2c5f3a",borderRadius:6,padding:"1px 7px"}}>{r.status}</div>
                  </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}}>
                    <button onClick={()=>openEdit(r)} style={S.smallBtn("#e8a820")}>✏️</button>
                    <button onClick={()=>deleteRes(r.id)} style={S.smallBtn("#e8604c")}>🗑</button>
                  </div>
                </div>
              </div>
            ))
          }
          <button onClick={()=>openAdd(selectedDate)} style={{...S.btn("#2c5f3a","#fff"),width:"100%",marginTop:10,fontSize:16,padding:"13px"}}>
            + Добави резервация
          </button>
        </Modal>
      )}

      {/* ADD / EDIT MODAL */}
      {(modal==="add"||modal==="edit") && (
        <Modal onClose={closeForm}>
          <h2 style={{margin:"0 0 16px",color:"#1a3d24",fontSize:19}}>
            {modal==="add"?"➕ Нова резервация":"✏️ Промени резервация"}
          </h2>
          {modal==="add"&&(
            <div style={{color:"#2c5f3a",fontWeight:"bold",marginBottom:14,fontSize:15}}>
              📅 {addDates.length>1 ? `${addDates.length} избрани дати` : fmtDate(addDates[0] || selectedDate)}
              {addDates.length>1 && (
                <div style={{fontSize:12,color:"#6b7b63",fontWeight:"normal",marginTop:4,lineHeight:1.35}}>
                  {fmtDateList(addDates)}
                </div>
              )}
            </div>
          )}

          {[
            {key:"name",label:"👤 Клиент *",placeholder:"Иван Иванов"},
            {key:"phone",label:"📞 Телефон",placeholder:"088 123 4567"},
            {key:"notes",label:"📝 Бележки",placeholder:"Специални изисквания..."},
          ].map(f=>(
            <div key={f.key} style={{marginBottom:13}}>
              <label style={{display:"block",fontWeight:"bold",marginBottom:5,fontSize:14}}>{f.label}</label>
              <input value={form[f.key]} onChange={e=>setForm(fm=>({...fm,[f.key]:e.target.value}))}
                placeholder={f.placeholder} style={S.input}/>
            </div>
          ))}

          <div style={{marginBottom:18}}>
            <label style={{display:"block",fontWeight:"bold",marginBottom:5,fontSize:14}}>📌 Статус</label>
            <select value={form.status} onChange={e=>setForm(fm=>({...fm,status:e.target.value}))} style={{...S.input}}>
              <option>Потвърдена</option>
              <option>Чакаща</option>
              <option>Отменена</option>
            </select>
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={modal==="add"?submitAdd:submitEdit} style={{...S.btn("#2c5f3a","#fff"),flex:1,fontSize:16,padding:"13px"}}>
              {modal==="add" && addDates.length>1 ? `✅ Запази за ${addDates.length} дати` : "✅ Запази"}
            </button>
            <button onClick={closeForm} style={{...S.btn("#e0dbd4","#555"),flex:1,fontSize:16,padding:"13px"}}>
              Отказ
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
