/* jrt-core.js — inti simulator JRT, dipakai halaman admin, petugas, dan master data */
  var $ = function(s){ return document.querySelector(s); };
  function fm(x, d){ d = d===undefined ? 2 : d; x = Number(x); if(Math.abs(x) < 0.5*Math.pow(10,-d)) x = 0; return x.toFixed(d).replace(".", ","); }
  function mm(x){ return Math.round(x*1000); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  var EPS = 1e-6;
  // tanggal masuk (GR) per SU untuk FIFO. Hari ini mengikuti tanggal perangkat.
  function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function todayStr(){ return ymd(new Date()); }
  function addDays(s, k){ var a = s.split("-"); var d = new Date(+a[0], +a[1]-1, +a[2]); d.setDate(d.getDate()+k); return ymd(d); }
  function tgLbl(s){ if(!s) return "–"; var a = s.split("-"); return a[2]+"/"+a[1]; }
  function tgFull(s){ if(!s) return "tanpa tanggal"; var a = s.split("-"), B = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]; return (+a[2])+" "+B[+a[1]-1]+" "+a[0]; }
  function ageDays(s){ if(!s) return 0; var a = s.split("-"), t = todayStr().split("-"); return Math.round((new Date(+t[0],+t[1]-1,+t[2]) - new Date(+a[0],+a[1]-1,+a[2]))/864e5); }

  /* ================= parameter & master ================= */
  var P = { HMAX:6.6, GAP:0.30, GAPMIN:0.20, RHO:230, FILL_EASY:0.30, FILL_MAX:0.60, C_MOVE:1, C_EMPTY:[3,6,10], C_SPLIT:3, C_TANG:2, C_HEAVY:10, BUNDLE:{ "1":true, "1.15":true } };
  // diameter dari list stok 27 Okt 2026 (varian sistem 1158/1358/2008/2208 disatukan ke 1150/1350/2000/2200) + 1600 dari catatan lapangan
  var DIAS = [1.0, 1.15, 1.35, 1.5, 1.6, 1.75, 1.8, 1.85, 2.0, 2.2];
  function canBundle(d){ return !!P.BUNDLE[String(d)]; }

  var COLORS = ["#2f6f6b","#3f6fb0","#8a6d1f","#a0432e","#6a55a0","#3f8a4f","#b0602a","#8a3f72","#2f7f99","#7d7a24","#4a7a3a","#9a4a5a","#3a5a8a","#8a5a2a","#5a7a8a"];
  // no material fiktif, ukuran mengikuti list stok 28 Okt 2026; rhoTrue = kepadatan "asli" untuk membuat berat contoh (dokumen transfer: 190-270 kg/m3)
  var MATS = [
    { code:"5100211", d:2.2,  w:2.75, coreIn:10, name:"toilet 3 ply 16,8 gsm", rhoTrue:237, known:9 },
    { code:"5100212", d:2.0,  w:2.79, coreIn:10, name:"facial 2 ply 14,4 gsm", rhoTrue:225, known:14 },
    { code:"5100213", d:2.0,  w:2.75, coreIn:10, name:"towel 3 ply 18 gsm",    rhoTrue:245, known:8 },
    { code:"5100214", d:1.8,  w:2.79, coreIn:10, name:"facial 2 ply 11,5 gsm", rhoTrue:246, known:6 },
    { code:"5100223", d:1.85, w:2.77, coreIn:10, name:"towel 2 ply 18 gsm",    rhoTrue:250, known:2 },
    { code:"5100222", d:1.75, w:2.75, coreIn:10, name:"facial 2 ply 13 gsm",   rhoTrue:230, known:2 },
    { code:"5100215", d:1.6,  w:2.5,  coreIn:10, name:"toilet 2 ply 17 gsm",   rhoTrue:230, known:4 },
    { code:"5100221", d:1.5,  w:2.77, coreIn:6,  name:"toilet 2 ply 16 gsm",   rhoTrue:228, known:3 },
    { code:"5100216", d:1.35, w:1.37, coreIn:6,  name:"towel 2 ply 25,1 gsm",  rhoTrue:255, known:5 },
    { code:"5100224", d:1.35, w:1.1,  coreIn:6,  name:"facial 3 ply 13 gsm",   rhoTrue:215, known:6 },
    { code:"5100217", d:1.15, w:0.46, coreIn:3,  name:"toilet 2 ply 15 gsm",   rhoTrue:232, known:6 },
    { code:"5100218", d:1.15, w:0.40, coreIn:3,  name:"facial 2 ply 14,2 gsm", rhoTrue:222, known:0 },
    { code:"5100225", d:1.15, w:0.36, coreIn:3,  name:"facial 2 ply 14,2 gsm", rhoTrue:226, known:0 },
    { code:"5100219", d:1.0,  w:0.46, coreIn:3,  name:"napkin 1 ply 17 gsm",   rhoTrue:240, known:7 },
    { code:"5100220", d:1.0,  w:0.23, coreIn:3,  name:"napkin 1 ply 17 gsm",   rhoTrue:236, known:0 }
  ];
  MATS.forEach(function(m){ m.core = m.coreIn*0.0254; var v = Math.PI/4*(m.d*m.d-m.core*m.core)*m.w; m.trueKg = Math.round(m.rhoTrue*v); m.kg = m.known ? m.trueKg : null; m.refN = m.known; });
  MATS.forEach(function(m, i){ m.color = COLORS[i%COLORS.length]; m.kg0 = m.kg; m.refN0 = m.refN; });
  function mat(code){ for(var i=0;i<MATS.length;i++) if(MATS[i].code===code) return MATS[i]; return null; }
  function dLbl(d){ return mm(d)+"D"; }

  var LINES = [
    { id:"A", depth:8.1, len:119, from:13, to:92, plot:2.0,  mix:true },
    { id:"B", depth:8.9, len:115, from:13, to:88, plot:2.2 },
    { id:"C", depth:8.9, len:115, from:13, to:88, plot:2.0 },
    { id:"D", depth:8.1, len:115, from:13, to:88, plot:2.0 },
    { id:"E", depth:9.1, len:115, from:13, to:88, plot:1.8 },
    { id:"F", depth:8.1, len:115, from:13, to:88, plot:1.35 },
    { id:"G", depth:9.1, len:115, from:13, to:88, plot:1.0 },
    { id:"H", depth:8.1, len:115, from:13, to:88, plot:1.15 }
  ];
  function lineById(id){ for(var i=0;i<LINES.length;i++) if(LINES[i].id===id) return LINES[i]; }
  function lineIdx(L){ return LINES.indexOf(L); }
  // L.plot = lebar plot fisik bin (tetap); L.pref = peruntukan untuk saran: "mix", "bebas", atau daftar diameter (m) — 1 line boleh beberapa diameter. Diatur di Master data.
  function defPref(L){ return L.mix ? "mix" : [L.plot]; }
  function normPref(p){ if(p==="mix" || p==="bebas") return p; if(Array.isArray(p)) return p.filter(function(x){ return isFinite(x); }).map(Number); if(isFinite(p)) return [Number(p)]; return "bebas"; }
  LINES.forEach(function(L){ L.pref = defPref(L); });
  // apakah diameter d termasuk peruntukan line L ("bebas" = semua cocok, "mix" = line cadangan)
  function prefHas(L, d){ return L.pref==="bebas" || (Array.isArray(L.pref) && L.pref.some(function(x){ return Math.abs(x-d)<EPS; })); }
  function prefLbl(L){ return L.pref==="mix" ? "mix" : (L.pref==="bebas" ? "bebas" : (L.pref.length ? L.pref.slice().sort(function(a,b){ return a-b; }).map(dLbl).join(" + ") : "belum diatur")); }
  function plotLbl(L){ return prefLbl(L); }

  /* ================= model ================= */
  // bin: {line, no, w (lebar plot/geser), cols:[col]}; col: {mat, gap (m kosong di depan), stacks:[{d, units:[{n, nw, h, isNew}]}]}
  function buildLine(L){
    L.gap = P.GAP; L.bins = [];
    var x = 0;
    for(var no=L.from; no<=L.to; no++){
      var i = L.bins.length, g = (i>0 && i%2===0) ? L.gap : 0;
      if(x+g+L.plot > L.len+EPS) break;
      L.bins.push({ line:L, no:no, w:L.plot, cols:[] });
      x += g + L.plot;
    }
  }
  // jarak 30 cm dihitung per 2 ROLL berdampingan: bin biasa = 1 roll ke samping, bin A/B = 2 roll (sudah 1 pasangan sendiri)
  function rollsAcross(b, over){ var n = (over && over.b===b) ? over.n : b.cols.length; return n===2 ? 2 : 1; }
  function layoutWith(L, over){
    var xs = [], x = 0, grp = 0, nGaps = 0;
    L.bins.forEach(function(b, i){
      var w = (over && over.b===b) ? over.w : b.w, n = rollsAcross(b, over);
      if(i>0 && grp+n>2){ x += L.gap; nGaps++; grp = 0; }
      xs.push(x); x += w; grp += n;
    });
    return { xs:xs, used:x, slack:L.len-x, nGaps:nGaps };
  }
  function layout(L){ return layoutWith(L, null); }
  function stackH(s){ var h = 0; s.units.forEach(function(u){ h += u.h; }); return h; }
  function colW(c){ var w = 0; c.stacks.forEach(function(s){ w = Math.max(w, s.d); }); return w; }
  function colDepth(c){ var d = 0; c.stacks.forEach(function(s){ d += s.d; }); return d; }
  function colIDs(c){ var n = 0; c.stacks.forEach(function(s){ n += s.units.length; }); return n; }
  function colRolls(c){ var n = 0; c.stacks.forEach(function(s){ s.units.forEach(function(u){ n += u.n; }); }); return n; }
  function binContentW(b){ var w = 0; b.cols.forEach(function(c){ w += colW(c); }); return w; }
  function binIDs(b){ var n = 0; b.cols.forEach(function(c){ n += colIDs(c); }); return n; }
  function binRolls(b){ var n = 0; b.cols.forEach(function(c){ n += colRolls(c); }); return n; }
  function colFront(c, depth){ return Math.max(0, depth - colDepth(c)); }
  function binPct(b){ if(!b.cols.length) return 0; var s = 0; b.cols.forEach(function(c){ s += colDepth(c)/b.line.depth; }); return Math.round(s/b.cols.length*100); }
  function isAB(b){ return b.cols.length===2; }
  function colLabel(b, ci){ return b.line.id+b.no+(isAB(b) ? (ci===0?"A":"B") : ""); }
  function binName(b){ return b.line.id+b.no+(isAB(b) ? "A/B" : ""); }
  function binOf(lineId, no){ var L = lineById(lineId); for(var i=0;i<L.bins.length;i++) if(L.bins[i].no===no) return L.bins[i]; return null; }
  function perStack(h){ return Math.floor((P.HMAX+EPS)/h); }

  function colCap(c, d, h, depth){
    var per = perStack(h); if(per<1) return 0;
    var stacks = c ? c.stacks : [], used = 0;
    stacks.forEach(function(s){ used += s.d; });
    var top = 0, last = stacks[stacks.length-1];
    if(last && Math.abs(last.d-d)<EPS) top = Math.floor((P.HMAX-stackH(last)+EPS)/h);
    return top + Math.floor((depth-used+EPS)/d)*per;
  }
  function fillCol(c, d, unit, qty, depth){
    var placed = 0;
    while(placed<qty){
      var last = c.stacks[c.stacks.length-1];
      var u = { n:unit.n, nw:unit.nw, h:unit.h, isNew:true };
      if(last && Math.abs(last.d-d)<EPS && stackH(last)+unit.h <= P.HMAX+EPS){ last.units.push(u); placed++; continue; }
      if(colDepth(c)+d <= depth+EPS){ c.stacks.push({ d:d, units:[u] }); placed++; continue; }
      break;
    }
    return placed;
  }
  // berapa line bertambah panjang kalau bin b jadi selebar newW dengan newN roll ke samping, dan bisakah ditampung
  function geserFor(L, b, newW, newN){
    var w = Math.max(b.w, newW), lay0 = layout(L), lay1 = layoutWith(L, { b:b, w:w, n:newN });
    var extra = lay1.used - lay0.used, r = { w:w, n:newN, extra:extra, slack:lay0.slack, pair:(newN===2 && rollsAcross(b)!==2) };
    if(extra<=EPS){ r.ok = true; r.mode = "none"; return r; }
    if(lay1.used <= L.len+EPS){ r.ok = true; r.mode = "slack"; return r; }
    if(lay1.nGaps){ var g = L.gap-(lay1.used-L.len)/lay1.nGaps; if(g >= P.GAPMIN-EPS){ r.ok = true; r.mode = "gap"; r.gapNew = g; return r; } }
    r.ok = false; return r;
  }
  function geserNote(b, g){
    if(g.mode==="none") return "";
    var nx = b.line.bins[b.line.bins.indexOf(b)+1], why = g.pair ? " (bin jadi 2 roll berdampingan, jadi perlu jarak sendiri sebelum bin sebelahnya)" : "";
    if(g.mode==="slack") return "<b>Geser "+Math.round(g.extra*100)+" cm:</b> bin "+(nx ? b.line.id+nx.no+" dst." : "sesudahnya")+" digeser ke arah ujung line"+why+". Sisa ujung line "+fm(g.slack,1)+" m.";
    return "<b>Geser "+Math.round(g.extra*100)+" cm:</b> jarak antar pasangan di line "+b.line.id+" dipersempit jadi "+Math.round(g.gapNew*100)+" cm"+why+".";
  }

  /* ---------- seed ---------- */
  var seedV;
  function rnd(){ seedV = (seedV*1103515245 + 12345) % 2147483648; return seedV/2147483648; }
  function pick(a){ return a[Math.floor(rnd()*a.length)]; }
  var SEED_ID = 0;
  function seedCol(b, code, ids, n, gapStacks){
    var m = mat(code), c = { mat:code, gap:0, stacks:[] };
    b.cols.push(c);
    for(var q=0;q<ids;q++){
      var nn = n===1 ? 1 : 2+Math.floor(rnd()*4);   // bundle: isi tiap ID acak 2-5 roll
      if(!placeUnit(c, m.d, { n:nn, nw:m.w, h:nn*m.w, isNew:false, id:"PR"+String(700000+(++SEED_ID)) }, b.line.depth)) break;
    }
    // FIFO: tumpukan depan paling lama, makin ke belakang makin baru
    var tg = addDays(todayStr(), -(18+Math.floor(rnd()*50)));
    c.stacks.forEach(function(s, si){ if(si>0 && rnd()<0.6) tg = addDays(tg, 1+Math.floor(rnd()*3)); s.units.forEach(function(u){ u.tg = tg; }); });
    for(var i=0;i<(gapStacks||0) && c.stacks.length>1;i++){ var s = c.stacks.shift(); c.gap += s.d; }
    if(!c.stacks.length) b.cols.pop();
    return c;
  }
  var LINE_MATS = { A:["5100212","5100213","5100214","5100215","5100216","5100217","5100219","5100220","5100221","5100222","5100223"], B:["5100211"], C:["5100212","5100213"], D:["5100212","5100213","5100215","5100221"],
                    E:["5100214","5100222"], F:["5100216","5100224"], G:["5100219","5100220"], H:["5100217","5100218","5100225"] };
  function bundleN(m){ return canBundle(m.d) ? 2+Math.floor(rnd()*4) : 1; }
  function resetWarehouse(){
    seedV = 20261028; LINES.forEach(function(L){ L.pref = defPref(L); });
    MATS.forEach(function(m){ m.kg = m.kg0; m.refN = m.refN0; });
    LINES.forEach(function(L){
      buildLine(L);
      var n = L.bins.length;
      L.bins.forEach(function(b, i){
        var r = rnd(), emptyP = i > n*0.72 ? 0.85 : (L.mix ? 0.3 : 0.22);
        if(r < emptyP) return;
        var code = pick(LINE_MATS[L.id]), m = mat(code);
        var nn = bundleN(m), h = (canBundle(m.d) ? 3.5 : 1)*m.w, cap = colCap(null, m.d, h, L.depth);
        var ids = Math.max(1, Math.round(cap*(0.35+0.65*rnd())));
        var gs = rnd()<0.18 ? 1+Math.floor(rnd()*2) : 0;
        seedCol(b, code, ids, nn, gs);
        // roll kecil di bin lebar: kadang separuh lainnya diisi no material lain (A/B)
        if(m.d*2 <= b.w+EPS && rnd()<0.45){
          var code2 = pick(LINE_MATS[L.id].filter(function(c){ return mat(c).d*2<=b.w+EPS; }));
          var m2 = mat(code2), n2 = bundleN(m2), cap2 = colCap(null, m2.d, (canBundle(m2.d) ? 3.5 : 1)*m2.w, L.depth);
          seedCol(b, code2, Math.max(1, Math.round(cap2*(0.3+0.6*rnd()))), n2, 0);
        }
      });
    });
    // contoh dari lapangan: B13 diplot untuk roll besar, diisi 1000D -> B13A & B13B
    var b13 = binOf("B", 13); b13.cols = [];
    seedCol(b13, "5100219", 20, 3, 0); seedCol(b13, "5100220", 14, 3, 1);
    var b14 = binOf("B", 14); if(!b14.cols.length) seedCol(b14, "5100211", 5, 1, 0);
    // 1 bin kosong yang pasti ada di tengah line H
    var h20 = binOf("H", 20); if(h20) h20.cols = [];
    // bin A/B menambah jarak; buang bin kosong di ujung line kalau line jadi melebihi panjangnya
    LINES.forEach(function(L){ while(layout(L).used > L.len+EPS && L.bins.length && !L.bins[L.bins.length-1].cols.length) L.bins.pop(); });
    TASKS = []; ID_SEQ = 0; SEED_ID = 0;
  }

    /* ================= saran tempat & booking (dipakai admin & petugas) ================= */
  function vol(m){ return Math.PI/4*(m.d*m.d - m.core*m.core)*m.w; }
  function sampleKg(m, n){
    var base = m.rhoTrue*vol(m), v = canBundle(m.d) ? (1+(Math.random()-0.5)*0.05) : (Math.random()<0.15 ? 0.8+Math.random()*0.08 : 1+(Math.random()-0.5)*0.06);
    return Math.round(n*base*v);
  }
  function median(a){ var s = a.slice().sort(function(x,y){ return x-y; }), k = Math.floor(s.length/2); return s.length%2 ? s[k] : (s[k-1]+s[k])/2; }
  // berat 1 roll: acuan tersimpan -> hitungan petugas di kedatangan ini -> pola berat kedatangan (dicek volume) -> volume saja
  var KIND = { same:["No material sama","ok"], empty:["Bin kosong","dim"], samemix:["No material sama, diameter beda","info"], split:["Pecah A/B (isi separuh kosong)","warn"], other:["Bin kosong, line lain","warn"], lineA:["Line A (mix)","crit"] };
  var RANK = { same:0, empty:1, samemix:2, split:3, other:4, lineA:5 };
  // Forklift hanya masuk dari depan, dan roll baru wajib di BELAKANG roll lama.
  // Jadi menambah ke kolom yang sudah berisi = keluarkan dulu roll di depan posisi baru ke koridor, taruh yang baru di belakang, susun ulang yang lama di depan.
  // Usaha dinilai dari isi kolom: <= 30% ringan, 30-60% sedang, > 60% berat (tidak disarankan). Batas bisa diubah di master data.
  var EFFORT = [["tanpa pindah","ok"],["ringan","info"],["sedang","warn"],["berat","crit"]];
  function colFill(c, depth){ var a = 0; c.stacks.forEach(function(s){ a += s.d*stackH(s); }); return a/(depth*P.HMAX); }
  function movesFor(o, d, uh){
    var r = { n:0, fill:0, eff:0 }, b = o.b;
    o.colsUse.forEach(function(ci){
      var c = b.cols[ci], L = c.stacks.length, last = c.stacks[L-1];
      // tumpuk di atas tumpukan paling depan tanpa pindah hanya kalau kolom itu cuma 1 tumpukan
      var first = (last && Math.abs(last.d-d)<EPS && stackH(last)+uh <= P.HMAX+EPS) ? L-1 : L;
      for(var si=0; si<first; si++) c.stacks[si].units.forEach(function(u){ if(!u.pending) r.n++; });
      r.fill = Math.max(r.fill, colFill(c, b.line.depth));
    });
    r.eff = !r.n ? 0 : (r.fill <= P.FILL_EASY+EPS ? 1 : (r.fill <= P.FILL_MAX+EPS ? 2 : 3));
    return r;
  }
  function rankOf(o){
    if(o.kind==="same" || o.kind==="samemix") return [0, 2, 5, 7][o.effort||0] + (o.kind==="samemix" ? 0.5 : 0);
    return { empty:1, split:3, other:4, lineA:6 }[o.kind];
  }
  function effortNote(o){
    if(!o.moves) return "";
    var pc = Math.round(o.fill*100);
    return "<b>Perlu pindah "+o.moves+" ID roll</b> (isi kolom "+pc+"%): keluarkan dulu ke koridor, taruh yang baru di belakang, lalu susun ulang yang lama di depan."+(o.effort===3 ? " Isi di atas "+Math.round(P.FILL_MAX*100)+"%, usahanya berat &mdash; tidak disarankan." : "");
  }
  function cloneCol(c){ return { mat:c.mat, gap:0, stacks:c.stacks.map(function(s){ return { d:s.d, units:s.units.slice() }; }) }; }
  // menaruh: roll baru boleh ditumpuk di atas roll lama (tanggal beda tidak masalah). FIFO diatur saat pengambilan.
  function placeUnit(c, d, u, depth){
    var last = c.stacks[c.stacks.length-1];
    if(last && Math.abs(last.d-d)<EPS && stackH(last)+u.h <= P.HMAX+EPS){ last.units.push(u); return true; }
    if(colDepth(c)+d <= depth+EPS){ c.stacks.push({ d:d, units:[u] }); return true; }
    return false;
  }
  function placeList(cols, d, units, depth, limit){
    var got = [], lim = limit===undefined ? Infinity : limit;
    for(var i=0;i<units.length && got.length<lim;i++){
      for(var k=0;k<cols.length;k++){ if(placeUnit(cols[k], d, units[i], depth)){ got.push(units[i]); break; } }
    }
    return got;
  }
  function simCols(o, m){ var cols = o.colsUse.map(function(ci){ return cloneCol(o.b.cols[ci]); }); for(var k=0;k<o.colsNew;k++) cols.push({ mat:m.code, gap:0, stacks:[] }); return cols; }
  function simGot(o, m, units, limit){ return placeList(simCols(o, m), m.d, units, o.b.line.depth, limit); }

  function findOptions(st, reserved, all){
    var m = st.m, d = m.d, opts = [];
    LINES.forEach(function(L){
      L.bins.forEach(function(b){
        if(reserved[L.id+b.no]) return;
        var notes = [], o = null;
        if(!b.cols.length){
          var k = (2*d <= b.w+EPS) ? 2 : 1;
          if(d-b.w > 0.5+EPS) return;
          var kind = L.pref==="mix" ? "lineA" : (prefHas(L, d) ? "empty" : "other");
          o = { b:b, kind:kind, colsNew:k, colsUse:[], newW:k*d, newN:k, label:L.id+b.no+(k===2 ? "A/B" : "") };
          notes.push("Bin kosong.");
          if(kind==="empty") notes.push(L.pref==="bebas" ? "Line "+L.id+" tanpa peruntukan khusus." : "Sesuai peruntukan line "+L.id+" ("+prefLbl(L)+").");
          if(kind==="other") notes.push("Peruntukan line "+L.id+" sebenarnya "+prefLbl(L)+" (kedalaman "+fm(L.depth,1)+" m), tapi masih muat.");
          if(kind==="lineA") notes.push("Line mix, dipakai kalau line lain penuh.");
          if(k===2) notes.push("Roll "+dLbl(d)+" muat 2 kolom berdampingan &rarr; di WMS jadi "+L.id+b.no+"A dan "+L.id+b.no+"B, keduanya "+m.code+".");
        } else {
          var mine = [];
          b.cols.forEach(function(c, ci){ if(c.mat===m.code) mine.push(ci); });
          if(mine.length){
            var newW = 0, mixD = false, gapM = 0;
            b.cols.forEach(function(c){
              if(c.mat===m.code){ newW += Math.max(colW(c), d); gapM += c.gap; c.stacks.forEach(function(s){ if(Math.abs(s.d-d)>EPS) mixD = true; }); }
              else newW += colW(c);
            });
            var add2 = (b.cols.length===1 && b.w-newW >= d-EPS) ? 1 : 0;
            var where = mine.map(function(ci){ return colLabel(b, ci); });
            if(add2) where.push(L.id+b.no+"B (baru)");
            o = { b:b, kind:mixD ? "samemix" : "same", colsUse:mine, colsNew:add2, newW:newW+(add2 ? d : 0), newN:b.cols.length+add2, label:where.join(" + ") };
            notes.push((isAB(b) ? "Bin "+L.id+b.no+" sudah pecah A/B: " : "")+"<b>"+mine.map(function(ci){ return colLabel(b, ci); }).join(" & ")+"</b> berisi "+m.code+" (no material sama)"+(isAB(b) ? ", sebelahnya "+b.cols.filter(function(c){ return c.mat!==m.code; }).map(function(c){ return colLabel(b, b.cols.indexOf(c))+" = "+c.mat; }).join(", ") : "")+". Roll baru disusun di belakang roll lama"+(mixD ? " (diameter beda, roll "+dLbl(d)+")" : "")+".");
            if(add2) notes.push("Separuh bin masih kosong &rarr; kalau kolom pertama penuh, sisanya masuk "+L.id+b.no+"B (bin jadi "+L.id+b.no+"A/B, keduanya "+m.code+").");
          } else if(b.cols.length===1){
            var c0 = b.cols[0], w0 = colW(c0);
            if(w0 > b.w/2+0.15 || d-(b.w-w0) > 0.3+EPS) return;
            o = { b:b, kind:"split", colsUse:[], colsNew:1, newW:w0+d, newN:2, label:L.id+b.no+"B (baru)" };
            notes.push("Bin "+L.id+b.no+" berisi 1 kolom roll kecil no material lain ("+c0.mat+") dan separuhnya kosong. Roll ini masuk separuh yang kosong &rarr; bin dipecah: <b>"+L.id+b.no+"A tetap "+c0.mat+"</b>, <b>"+L.id+b.no+"B = "+m.code+"</b>. Tetap 1 no material per sub-bin.");
          }
        }
        if(!o) return;
        o.cap = simGot(o, m, st.units).length; if(!o.cap) return;
        var g = geserFor(L, b, o.newW, o.newN); if(!g.ok) return;
        o.g = g; o.need = g.extra>EPS ? g.extra : 0;
        if(o.need) notes.push(geserNote(b, g));
        o.waste = L.depth - Math.floor((L.depth+EPS)/d)*d;
        var mv = movesFor(o, d, st.units.length ? st.units[0].h : m.w); o.moves = mv.n; o.fill = mv.fill; o.effort = mv.eff;

        o.notes = notes; o.label = o.label || L.id+b.no;
        opts.push(o);
      });
    });
    opts.sort(function(a, b){
      var ra = rankOf(a), rb = rankOf(b);
      if(ra!==rb) return ra-rb;
      var ga = a.need>EPS ? 1 : 0, gb = b.need>EPS ? 1 : 0;
      if(a.kind==="same" || a.kind==="samemix"){
        if(a.moves!==b.moves) return a.moves-b.moves;
        if(ga!==gb) return ga-gb;
        var fa = a.cap>=st.qty ? 0 : 1, fb = b.cap>=st.qty ? 0 : 1;
        if(fa!==fb) return fa-fb;
        return fa===0 ? a.cap-b.cap : b.cap-a.cap;
      }
      if(ga!==gb) return ga-gb;
      if(Math.abs(a.waste-b.waste)>EPS) return a.waste-b.waste;
      if(a.cap!==b.cap) return b.cap-a.cap;
      return lineIdx(a.b.line)-lineIdx(b.b.line) || a.b.no-b.b.no;
    });
    if(all) return opts;
    var out = [], cnt = { same:0, samemix:0, empty:0, split:0, lineA:0 }, seenLine = {};
    opts.forEach(function(o){
      if(o.kind==="same"){ if(cnt.same>=5) return; cnt.same++; }
      if(o.kind==="samemix"){ if(cnt.samemix>=2) return; cnt.samemix++; }
      if(o.kind==="empty"){ if(cnt.empty>=3) return; cnt.empty++; }
      if(o.kind==="split"){ if(cnt.split>=2) return; cnt.split++; }
      if(o.kind==="lineA"){ if(cnt.lineA>=2) return; cnt.lineA++; }
      if(o.kind==="other"){ if(seenLine[o.b.line.id]) return; seenLine[o.b.line.id] = 1; }
      out.push(o);
    });
    return out;
  }
  function recommendGroup(gp){
    var left = gp.st.units.slice(), m = gp.st.m;
    gp.opts.forEach(function(o){
      var got = left.length ? simGot(o, m, left) : [];
      o.qty = got.length; o.on = o.qty>0;
      left = left.filter(function(u){ return got.indexOf(u)<0; });
    });
  }
  /* ================= optimisasi peletakan (rencana berbiaya) ================= */
  // Isi kolom dihitung terhadap kapasitas no material itu: posisi ke belakang x tumpuk ke atas (bukan luas tampak samping).
  function colFillMat(c, depth){
    if(!c || !c.stacks.length) return 0;
    var hs = 0, n = 0, d = 0, area = 0;
    c.stacks.forEach(function(s){ d = Math.max(d, s.d); area += s.d*stackH(s); s.units.forEach(function(u){ hs += u.h; n++; }); });
    var h = n ? hs/n : 1, per = perStack(h), pos = Math.floor((depth+EPS)/d);
    if(per<1 || pos<1) return 1;
    return Math.min(1.5, area/(pos*d*per*h));
  }
  function colPlacedIDs(c){ var n = 0; c.stacks.forEach(function(s){ s.units.forEach(function(u){ if(!u.pending) n++; }); }); return n; }
  function colHasPending(c){ return c.stacks.some(function(s){ return s.units.some(function(u){ return u.pending; }); }); }
  // bin kosong makin langka -> makin mahal dipakai (tabungan untuk kedatangan besar)
  function emptyCostFor(d){
    var E = 0, T = 0;
    LINES.forEach(function(L){ if(!prefHas(L, d)) return; L.bins.forEach(function(b){ T++; if(!b.cols.length) E++; }); });
    // tidak ada line yang peruntukannya diameter ini -> hitung dari semua line (selain mix) yang bin-nya muat
    if(!T) LINES.forEach(function(L){ if(L.pref==="mix" || d-L.plot > 0.5+EPS) return; L.bins.forEach(function(b){ T++; if(!b.cols.length) E++; }); });
    var r = T ? E/T : 0;
    return { cost: r>0.30 ? P.C_EMPTY[0] : (r>0.10 ? P.C_EMPTY[1] : P.C_EMPTY[2]), E:E, T:T, r:r };
  }
  // akibat menaruh 'units' di opsi o: berapa ID lama dipindah, isi sebelum -> sesudah
  function optEffect(o, m, units){
    var cols = simCols(o, m), before = cols.map(function(c){ return c.stacks.length; }), depth = o.b.line.depth;
    var fb = o.colsUse.map(function(ci){ return colFillMat(o.b.cols[ci], depth); });
    var got = placeList(cols, m.d, units, depth);
    var moves = 0, used = [];
    cols.forEach(function(c, k){
      var isOld = k < o.colsUse.length, src = isOld ? o.b.cols[o.colsUse[k]] : null;
      var placedHere = got.some(function(u){ return c.stacks.some(function(s){ return s.units.indexOf(u)>=0; }); });
      if(!placedHere) return;
      used.push({ old:isOld, fb:isOld ? fb[k] : 0, fa:colFillMat(c, depth), key:o.b.line.id+o.b.no+"#"+(isOld ? o.colsUse[k] : "n"+k) });
      if(isOld){
        // ada tumpukan baru di belakang -> semua roll lama keluar dulu; hanya tumpuk di atas tumpukan terakhir -> yang di depannya saja
        var lim = c.stacks.length > before[k] ? before[k] : before[k]-1;
        for(var si=0; si<lim; si++) src.stacks[si].units.forEach(function(u){ if(!u.pending) moves++; });
      }
    });
    return { got:got, moves:moves, used:used };
  }
  function tanggungOf(code){
    var r = {};
    LINES.forEach(function(L){ L.bins.forEach(function(b){ b.cols.forEach(function(c, ci){ if(c.mat===code && colPlacedIDs(c) && colFillMat(c, L.depth) <= P.FILL_EASY+EPS) r[L.id+b.no+"#"+ci] = true; }); }); });
    return r;
  }
  // biaya 1 rencana (daftar opsi berurutan); units dibagi berurutan ke opsi-opsi itu
  function planCost(list, st, ctx){
    var m = st.m, left = st.units.slice(), cost = 0, parts = [], tg = Object.assign({}, ctx.tang), why = [], moves = 0, emptyUsed = 0;
    for(var i=0;i<list.length;i++){
      var o = list[i]; if(!left.length) break;
      var ef = optEffect(o, m, left); if(!ef.got.length) continue;
      left = left.filter(function(u){ return ef.got.indexOf(u)<0; });
      var c = ef.moves*P.C_MOVE;
      if(o.kind==="empty" || o.kind==="other" || o.kind==="lineA"){ c += ctx.empty.cost; emptyUsed++; }
      if(o.kind==="split") c += 1;
      if(o.kind==="other") c += 1;
      if(o.kind==="lineA") c += 3;
      if(o.kind==="samemix") c += 0.5;
      if(o.need>EPS) c += 1;
      var heavy = ef.used.some(function(x){ return x.old && x.fb > P.FILL_MAX+EPS; });
      if(heavy && ef.moves) c += P.C_HEAVY;
      ef.used.forEach(function(x){ if(x.fa <= P.FILL_EASY+EPS) tg[x.key] = true; else delete tg[x.key]; });
      cost += c; moves += ef.moves;
      parts.push({ o:o, qty:ef.got.length, moves:ef.moves, used:ef.used, heavy:heavy, cost:c });
    }
    if(parts.length>1) cost += P.C_SPLIT*(parts.length-1);
    var tN = Object.keys(tg).length; cost += P.C_TANG*tN;
    if(left.length) cost += 100*left.length;
    return { cost:cost, parts:parts, left:left.length, tN:tN, moves:moves, emptyUsed:emptyUsed };
  }
  function planGroup(gp){
    var st = gp.st, m = st.m, opts = gp.opts, Q = st.units.length;
    var ctx = { tang:tanggungOf(m.code), empty:emptyCostFor(m.d) };
    gp.ctx = ctx;
    opts.forEach(function(o){ o.qty = 0; o.on = false; var s = planCost([o], st, ctx); o.single = s; o.cost1 = s.cost - 100*s.left; });
    // kandidat: termurah (tanpa hitung sisa) + yang kapasitasnya terbesar, dibatasi supaya cepat
    var byCost = opts.slice().sort(function(a, b){ return a.cost1-b.cost1; }).slice(0, 14);
    var byCap = opts.slice().sort(function(a, b){ return b.cap-a.cap; }).slice(0, 6);
    var cand = byCost.concat(byCap.filter(function(o){ return byCost.indexOf(o)<0; })), best = null;
    function consider(list){ var r = planCost(list, st, ctx); if(!best || r.cost < best.cost-EPS || (Math.abs(r.cost-best.cost)<EPS && r.parts.length < best.parts.length)) best = r; }
    cand.forEach(function(o){ consider([o]); });
    if(!best || best.left){
      cand.forEach(function(a){ cand.forEach(function(b){ if(a!==b && a.b!==b.b) consider([a, b]); }); });
    }
    if(best && best.left){
      // kedatangan besar: tambah bin satu per satu, pilih yang menambah biaya paling kecil per ID
      var list = best.parts.map(function(p){ return p.o; });
      for(var guard=0; guard<12 && best.left; guard++){
        var pick = null;
        opts.forEach(function(o){ if(list.indexOf(o)>=0 || list.some(function(x){ return x.b===o.b; })) return; var r = planCost(list.concat([o]), st, ctx); if(!pick || r.cost < pick.cost) pick = r; });
        if(!pick) break; best = pick; list = best.parts.map(function(p){ return p.o; });
      }
    }
    gp.plan = best;
    if(!best) return;
    best.parts.forEach(function(p){ p.o.qty = p.qty; p.o.on = true; p.o.moves = p.moves; p.o.planCost = p.cost; p.o.used = p.used; p.o.heavy = p.heavy; });
    // urutan tampil: rencana dulu, sisanya menurut biaya kalau dipakai sendiri
    var inPlan = best.parts.map(function(p){ return p.o; });
    gp.opts = inPlan.concat(opts.filter(function(o){ return inPlan.indexOf(o)<0; }).sort(function(a, b){ return a.single.cost-b.single.cost; }).slice(0, 12));
    gp.opts.forEach(function(o){ if(inPlan.indexOf(o)<0){ var p = o.single.parts[0]; o.moves = p ? p.moves : 0; o.used = p ? p.used : []; o.heavy = p ? p.heavy : false; } });
  }
  function planWhy(gp){
    var pl = gp.plan, st = gp.st; if(!pl) return "";
    var t = pl.parts.map(function(p){
      var u = p.used.map(function(x){ return (x.old ? Math.round(x.fb*100)+"% &rarr; " : "kosong &rarr; ")+Math.round(Math.min(1, x.fa)*100)+"%"; }).join(", ");
      return "<b>"+p.o.label+"</b> "+p.qty+" ID ("+u+(p.moves ? ", pindah "+p.moves+" ID lama" : ", tanpa pindah")+")";
    }).join(" + ");
    var e = gp.ctx.empty;
    return "Rencana: "+t+" &middot; biaya "+fm(pl.cost,1)+" &middot; bin kosong untuk "+dLbl(st.m.d)+": "+e.E+" dari "+e.T+" ("+Math.round(e.r*100)+"%), 1 bin kosong dihitung "+e.cost+" poin"+(pl.tN ? " &middot; sisa bin tanggung "+st.m.code+": "+pl.tN : "")+(pl.left ? ' &middot; <span style="color:var(--crit)">'+pl.left+" ID belum dapat bin</span>" : "")+".";
  }

  /* ================= rapikan saat senggang ================= */
  // gabungkan bin tanggung (atau bin di luar line peruntukan) ke bin no material sama yang masih muat, supaya ada bin kosong lagi
  function colUniformD(c, d){ return c.stacks.every(function(s){ return Math.abs(s.d-d)<EPS; }); }
  function inPrefLine(L, d){ return prefHas(L, d); }
  function rapikanList(){
    var cols = [], busy = rapiBusy();
    LINES.forEach(function(L){ L.bins.forEach(function(b){ if(busy[L.id+b.no]) return; b.cols.forEach(function(c, ci){ var m = mat(c.mat); if(!m || colHasPending(c) || !colUniformD(c, m.d) || !colPlacedIDs(c)) return; cols.push({ L:L, b:b, ci:ci, c:c, m:m, fill:colFillMat(c, L.depth), ids:colPlacedIDs(c), pref:inPrefLine(L, m.d) }); }); }); });
    var out = [];
    cols.forEach(function(s){
      var why = s.fill <= P.FILL_EASY+EPS ? "tanggung" : (!s.pref && s.fill <= P.FILL_MAX+EPS ? "line" : null);
      if(!why) return;
      var best = null;
      cols.forEach(function(t){
        if(t===s || t.c.mat!==s.c.mat || (t.b===s.b)) return;
        if(why==="line" && !t.pref) return;
        var sim = rapikanSim(s, t); if(!sim) return;
        var score = sim.moves + (t.pref ? 0 : 2) + (t.fill > P.FILL_MAX ? 3 : 0);
        if(!best || score < best.score) best = { s:s, t:t, moves:sim.moves, fa:sim.fa, score:score, why:why };
      });
      if(best) out.push(best);
    });
    // 1 bin hanya muncul sekali (sebagai asal atau tujuan), dahulukan yang paling sedikit pindah
    out.sort(function(a, b){ return a.score-b.score; });
    var seen = {}, res = [];
    out.forEach(function(r){ var ks = r.s.L.id+r.s.b.no, kt = r.t.L.id+r.t.b.no; if(seen[ks] || seen[kt]) return; seen[ks] = seen[kt] = 1; res.push(r); });
    return res.slice(0, 15);
  }
  // susun ulang tujuan: semua ID dua kolom diurutkan tanggal masuk, paling lama di depan
  function rapikanSim(s, t){
    var all = [];
    [s, t].forEach(function(x){ x.c.stacks.forEach(function(st){ st.units.forEach(function(u){ all.push(u); }); }); });
    all.sort(function(a, b){ return (a.tg||"") < (b.tg||"") ? -1 : ((a.tg||"") > (b.tg||"") ? 1 : 0); });
    var nc = { mat:t.c.mat, gap:0, stacks:[] }, d = t.m.d, depth = t.L.depth;
    for(var i=0;i<all.length;i++) if(!placeUnit(nc, d, all[i], depth)) return null;
    return { col:nc, moves:s.ids + t.ids, fa:colFillMat(nc, depth) };
  }
  function doRapikan(r){
    var sim = rapikanSim(r.s, r.t); if(!sim) return { ok:false, err:"Sudah tidak muat." };
    clearNew();
    var from = colLabel(r.s.b, r.s.ci), to = colLabel(r.t.b, r.t.ci), moved = [];
    r.s.c.stacks.forEach(function(st){ st.units.forEach(function(u){ moved.push(u); }); });
    r.t.b.cols[r.t.ci] = sim.col;
    r.s.b.cols.splice(r.s.ci, 1);
    moved.forEach(function(u){ u.isNew = true; ID_SEQ++; TASKS.push({ kind:"move", seq:Date.now()+ID_SEQ, id:"MV"+String(ID_SEQ).padStart(4,"0"), su:u.id||"", mat:r.t.c.mat, n:u.n, from:from, bin:to, why:"Rapikan: gabung "+from+" ke "+to, status:"pindah", ts:Date.now(), note:"" }); });
    return { ok:true, from:from, to:to, n:moved.length };
  }

  /* ================= tugas rapikan untuk petugas (urutan scan sudah ditentukan) ================= */
  function rapiJobs(){ return TASKS.filter(function(t){ return t.kind==="rapi"; }); }
  function rapiBusy(){ var r = {}; rapiJobs().forEach(function(j){ if(j.status==="open"){ r[j.fromBin.line+j.fromBin.no] = 1; r[j.toBin.line+j.toBin.no] = 1; } }); return r; }
  function newRapi(r){
    var items = [];
    // urutan ambil di bin asal: tumpukan paling depan dulu, dari atas ke bawah
    r.s.c.stacks.forEach(function(st){ for(var k=st.units.length-1;k>=0;k--){ var u = st.units[k]; items.push({ su:u.id||"", n:u.n, tg:u.tg||"", done:false }); } });
    ID_SEQ++;
    var j = { kind:"rapi", seq:Date.now(), id:"RP"+String(ID_SEQ).padStart(4,"0"), mat:r.s.c.mat, from:colLabel(r.s.b, r.s.ci), to:colLabel(r.t.b, r.t.ci), fromBin:{ line:r.s.L.id, no:r.s.b.no }, toBin:{ line:r.t.L.id, no:r.t.b.no }, items:items, oldT:r.t.ids, status:"open", ts:Date.now() };
    TASKS.push(j); return j;
  }
  function rapiById(id){ var a = rapiJobs(); for(var i=0;i<a.length;i++) if(a[i].id===id) return a[i]; return null; }
  function rapiNext(j){ for(var i=0;i<j.items.length;i++) if(!j.items[i].done) return j.items[i]; return null; }
  // gambar susunan akhir bin tujuan (semua ID tujuan + ID asal yang belum dipindah), paling lama di depan
  function rapiPreview(j){
    var t = rapiTargetCol(j); if(!t) return null;
    var units = []; t.c.stacks.forEach(function(st){ st.units.forEach(function(u){ units.push(u); }); });
    j.items.forEach(function(x){ if(x.done) return; var l = locateSU(x.su); if(l) units.push(l.u); });
    var c = repackFifo(units, j.mat, t.b.line.depth);
    return c ? { b:t.b, c:c } : null;
  }
  function rapiTargetCol(j){ var b = binOf(j.toBin.line, j.toBin.no); if(!b) return null; for(var ci=0;ci<b.cols.length;ci++) if(b.cols[ci].mat===j.mat) return { b:b, ci:ci, c:b.cols[ci] }; return null; }
  function repackFifo(units, code, depth){
    var all = units.slice().sort(function(a, b){ return (a.tg||"") < (b.tg||"") ? -1 : ((a.tg||"") > (b.tg||"") ? 1 : 0); });
    var nc = { mat:code, gap:0, stacks:[] }, d = mat(code).d;
    for(var i=0;i<all.length;i++) if(!placeUnit(nc, d, all[i], depth)) return null;
    return nc;
  }
  // 1 ID roll dari asal dipindah ke tujuan; tujuan disusun ulang menurut tanggal masuk (paling lama di depan)
  function rapiMove(j, l){
    var t = rapiTargetCol(j); if(!t) return { ok:false, err:"Bin tujuan "+j.to+" tidak berisi "+j.mat+" lagi." };
    var units = []; t.c.stacks.forEach(function(st){ st.units.forEach(function(u){ units.push(u); }); });
    var nc = repackFifo(units.concat([l.u]), j.mat, t.b.line.depth);
    if(!nc) return { ok:false, err:"Tidak muat lagi di "+j.to+"." };
    clearNew();
    var u = l.u, from = colLabel(l.b, l.ci);
    takeUnit(l);
    u.isNew = true; t.b.cols[t.ci] = nc;
    var it = null; j.items.forEach(function(x){ if(!it && !x.done && x.su===(u.id||"")) it = x; }); if(it){ it.done = true; it.ts = Date.now(); }
    if(!rapiNext(j)){ j.status = "done"; j.done = Date.now(); }
    ID_SEQ++;
    TASKS.push({ kind:"move", seq:Date.now(), id:"MV"+String(ID_SEQ).padStart(4,"0"), su:u.id||"", mat:j.mat, n:u.n, from:from, bin:colLabel(t.b, t.ci), why:"Rapikan "+j.id, status:"pindah", ts:Date.now(), note:"" });
    return { ok:true, from:from, to:colLabel(t.b, t.ci), u:u, last:j.status==="done" };
  }
  function stillValid(o, m){
    var b = o.b;
    if(o.kind==="empty" || o.kind==="other" || o.kind==="lineA") return !b.cols.length;
    if(o.kind==="split") return b.cols.length===1 && b.cols[0].mat!==m.code;
    return o.colsUse.every(function(ci){ return b.cols[ci] && b.cols[ci].mat===m.code; }) && (!o.colsNew || b.cols.length===1);
  }
  function applyOption(o, st, remaining){
    var b = o.b, L = b.line, m = st.m, moved = 0, geser = "", used0 = layout(L).used, gap0 = L.gap;
    var targets = [];
    o.colsUse.forEach(function(ci){ targets.push(b.cols[ci]); });
    for(var k=0;k<o.colsNew;k++){ var nc = { mat:m.code, gap:0, stacks:[] }; b.cols.push(nc); targets.push(nc); }
    targets.forEach(function(c){ if(c.gap>EPS){ moved += c.gap; c.gap = 0; } });
    var fresh = remaining.map(function(u){ return { n:u.n, nw:u.nw, h:u.h, id:u.id, tg:u.tg||todayStr(), isNew:true }; });
    var before = targets.map(function(c){ return c.stacks.length; });
    var got = placeList(targets, m.d, fresh, L.depth, o.qty);
    // disusun dari belakang: tumpukan baru yang penuh ditaruh paling belakang, yang belum penuh di depannya
    targets.forEach(function(c, k){ var nw = c.stacks.slice(before[k]); if(nw.length>1) c.stacks = c.stacks.slice(0, before[k]).concat(nw.reverse()); });
    if(!got.length) moved = 0;
    b.cols = b.cols.filter(function(c){ return c.stacks.length; });
    if(binContentW(b) > b.w+EPS) b.w = binContentW(b);
    var lay = layout(L);
    if(lay.used > L.len+EPS && lay.nGaps) L.gap = Math.max(P.GAPMIN, L.gap-(lay.used-L.len)/lay.nGaps);
    if(L.gap < gap0-EPS) geser = "jarak pasangan line "+L.id+" jadi "+Math.round(L.gap*100)+" cm";
    else if(lay.used > used0+EPS) geser = "bin sesudahnya digeser "+Math.round((lay.used-used0)*100)+" cm";
    var rolls = 0; got.forEach(function(u){ rolls += u.n; });
    return { placed:got.length, rolls:rolls, moved:moved, geser:geser, ids:got.map(function(u){ return u.id; }), units:got };
  }
  function clearNew(){ LINES.forEach(function(L){ L.bins.forEach(function(b){ b.cols.forEach(function(c){ c.stacks.forEach(function(s){ s.units.forEach(function(u){ u.isNew = false; }); }); }); }); }); }

  /* ================= gambar tampak samping 1 kolom ================= */
  function sideSvg(b, c, hl, hlText){
    var L = b.line, k = 34, H = P.HMAX, padL = 30, padT = 16, w = L.depth*k, h = H*k;
    var s = '<svg viewBox="0 0 '+(w+padL+12)+' '+(h+padT+30)+'" width="'+(w+padL+12)+'" font-family="IBM Plex Mono, monospace">';
    s += '<line x1="'+padL+'" y1="'+(padT+h)+'" x2="'+(padL+w)+'" y2="'+(padT+h)+'" stroke="var(--pillar)" stroke-width="2"/>';
    s += '<line x1="'+padL+'" y1="'+padT+'" x2="'+(padL+w)+'" y2="'+padT+'" stroke="var(--crit)" stroke-dasharray="4 3"/><text x="'+(padL+w)+'" y="'+(padT-4)+'" text-anchor="end" font-size="9" fill="var(--crit)">batas '+fm(H,1)+' m</text>';
    s += '<line x1="'+(padL+w)+'" y1="'+padT+'" x2="'+(padL+w)+'" y2="'+(padT+h)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
    for(var y=0;y<=Math.floor(H);y+=2) s += '<text x="'+(padL-5)+'" y="'+(padT+h-y*k+3)+'" text-anchor="end" font-size="8" fill="var(--ink-dim)">'+y+'m</text>';
    // roll disusun dari belakang (rapat ke batas belakang); ruang kosong selalu di depan
    var m = mat(c.mat), z = colFront(c, L.depth), hlAbove = [];
    if(hl && !hlText) c.stacks.forEach(function(st){ var k0 = st.units.indexOf(hl); if(k0>=0) hlAbove = st.units.slice(k0+1); });
    if(z>EPS && c.stacks.length) s += '<rect x="'+padL+'" y="'+(padT+h-8)+'" width="'+(z*k)+'" height="8" fill="none" stroke="var(--line)" stroke-dasharray="3 2"/><text x="'+(padL+z*k/2)+'" y="'+(padT+h-12)+'" text-anchor="middle" font-size="8" fill="var(--ink-dim)">kosong '+fm(z,2)+' m</text>';
    c.stacks.forEach(function(st, si){
      var x = padL + z*k, yb = padT+h;
      st.units.forEach(function(u){
        var uh = u.h*k;
        if(u.pending){
          var me = hl && u===hl;
          s += '<rect x="'+(x+1)+'" y="'+(yb-uh+0.5)+'" width="'+(st.d*k-2)+'" height="'+(uh-1)+'" rx="2" fill="color-mix(in srgb, var(--info) '+(me?30:10)+'%, transparent)" stroke="var(--info)" stroke-width="'+(me?2.5:1)+'" stroke-dasharray="4 3"/>';
          if(uh>14) s += '<text x="'+(x+st.d*k/2)+'" y="'+(yb-uh/2+3)+'" text-anchor="middle" font-size="8" fill="var(--info)">'+(me?"SU ini":"booking")+'</text>';
          yb -= uh; return;
        }
        var isHl = hl && u===hl, isUp = hl && hlAbove.indexOf(u)>=0;
        s += '<rect x="'+(x+1)+'" y="'+(yb-uh+0.5)+'" width="'+(st.d*k-2)+'" height="'+(uh-1)+'" rx="2" fill="var(--roll)" stroke="'+(isHl?"var(--accent)":(isUp?"var(--warn)":(u.isNew?"var(--ok)":"color-mix(in srgb, var(--ink) 25%, transparent)")))+'" stroke-width="'+(isHl?3.5:(isUp?2:(u.isNew?2:1)))+'"'+(isUp?' stroke-dasharray="4 2"':'')+'/>';
        if(isHl && uh>12) s += '<text x="'+(x+st.d*k/2)+'" y="'+(yb-uh/2+3)+'" text-anchor="middle" font-size="9" font-weight="600" fill="var(--accent)">'+(hlText||"AMBIL")+'</text>';
        if(isUp && uh>12) s += '<text x="'+(x+st.d*k/2)+'" y="'+(yb-uh/2+3)+'" text-anchor="middle" font-size="8" fill="var(--warn)">pindah dulu</text>';
        s += '<rect x="'+(x+1)+'" y="'+(yb-uh+0.5+Math.min(uh*0.18, u.nw*k*0.3))+'" width="'+(st.d*k-2)+'" height="'+Math.max(2, Math.min(5, u.nw*k*0.18))+'" fill="'+m.color+'"/>';
        for(var r=1;r<u.n;r++) s += '<line x1="'+(x+2)+'" x2="'+(x+st.d*k-2)+'" y1="'+(yb-r*u.nw*k)+'" y2="'+(yb-r*u.nw*k)+'" stroke="color-mix(in srgb, var(--ink) 30%, transparent)" stroke-width="0.8"/>';
        if(u.n>1) s += '<rect x="'+(x+0.5)+'" y="'+(yb-uh)+'" width="'+(st.d*k-1)+'" height="'+uh+'" rx="3" fill="none" stroke="var(--info)" stroke-opacity=".5" stroke-dasharray="2 2"/>';
        yb -= uh;
      });
      s += '<text x="'+(x+st.d*k/2)+'" y="'+(padT+h+11)+'" text-anchor="middle" font-size="8" fill="var(--ink-dim)">'+(function(){ var u0 = st.units.filter(function(u){ return !u.pending && u.tg; })[0]; return u0 ? tgLbl(u0.tg) : (si+1); })()+'</text>';
      z += st.d;
    });
    s += '<text x="'+padL+'" y="'+(padT+h+24)+'" font-size="9" fill="var(--ink-dim)">&larr; depan (pintu forklift)</text><text x="'+(padL+w)+'" y="'+(padT+h+24)+'" text-anchor="end" font-size="9" fill="var(--ink-dim)">belakang '+fm(L.depth,1)+' m &rarr;</text></svg>';
    return s;
  }
  /* ================= tugas petugas (logika, tanpa UI) ================= */
  var TASKS = [], ID_SEQ = 0;
  function newId(){ ID_SEQ++; return "P2E"+String(5100400+ID_SEQ); }
  function findUnit(pred){
    for(var li=0; li<LINES.length; li++){ var L = LINES[li];
      for(var bi=0; bi<L.bins.length; bi++){ var b = L.bins[bi];
        for(var ci=0; ci<b.cols.length; ci++){ var c = b.cols[ci];
          for(var si=0; si<c.stacks.length; si++){ var s = c.stacks[si];
            for(var k=0; k<s.units.length; k++) if(pred(s.units[k])) return { b:b, ci:ci, c:c, si:si, s:s, k:k, u:s.units[k] }; } } } }
    return null;
  }
  // urutan taruh dari belakang: booking yang posisinya lebih belakang (atau di bawahnya) harus ditaruh dulu
  function placeBlocker(l){
    var b = null;
    for(var si=l.c.stacks.length-1; si>l.si && !b; si--){ var s = l.c.stacks[si]; for(var k=0;k<s.units.length;k++) if(s.units[k].pending){ b = s.units[k]; break; } }
    if(!b) for(var k2=0;k2<l.k;k2++) if(l.s.units[k2].pending){ b = l.s.units[k2]; break; }
    return b;
  }
  function placeOrder(t){ var l = locateTask(t); return l ? [l.b.line.id, l.b.no, l.ci, -l.si, l.k] : ["~", 0, 0, 0, 0]; }
  function locateTask(t){ return findUnit(function(u){ return u.pending && u.id===t.id; }); }
  function removeAt(l){
    l.s.units.splice(l.k, 1);
    if(!l.s.units.length) l.c.stacks.splice(l.si, 1);
    if(!l.c.stacks.length) l.b.cols.splice(l.ci, 1);
  }
  function taskLabel(t){ var l = locateTask(t); return l ? colLabel(l.b, l.ci) : (t.bin || t.label); }
  function taskByIdCode(code){ code = String(code||"").trim().toUpperCase(); for(var i=0;i<TASKS.length;i++) if(!TASKS[i].kind && String(TASKS[i].id).toUpperCase()===code) return TASKS[i]; return null; }
  function learnRef(m, kg, n){ var per = kg/n; m.kg = m.kg ? Math.round((m.kg*m.refN + per)/(m.refN+1)) : Math.round(per); m.refN = (m.refN||0)+1; }
  function closeTask(t, res){ t.status = res.diff ? "beda" : "done"; t.n = res.n; t.bin = res.bin; t.why = res.why || ""; t.note = res.note || ""; t.ts = Date.now(); learnRef(mat(t.mat), t.kg, res.n); }
  // petugas menaruh di bin booking
  function placeSame(t, n){
    var l = locateTask(t), m = mat(t.mat), newH = n*m.w;
    if(!l) return { ok:false, err:"Booking SU ini tidak ditemukan di map." };
    clearNew();
    var u = l.u;
    if(stackH(l.s) - u.h + newH <= P.HMAX+EPS){
      u.n = n; u.h = newH; u.nw = m.w; u.pending = false; u.isNew = true;
      var res = { ok:true, n:n, bin:colLabel(l.b, l.ci), line:l.b.line.id, no:l.b.no, diff:false, note:(n!==t.nEst ? "isi diganti "+t.nEst+" → "+n+" roll" : "") };
      closeTask(t, res); return res;
    }
    var b = l.b; removeAt(l);
    var targets = b.cols.filter(function(c){ return c.mat===m.code; });
    if(!targets.length){ var nc = { mat:m.code, gap:0, stacks:[] }; b.cols.push(nc); targets = [nc]; }
    var fresh = { id:t.id, n:n, nw:m.w, h:newH, tg:t.tg||u.tg, isNew:true };
    if(placeList(targets, m.d, [fresh], b.line.depth).length){
      var l2 = findUnit(function(x){ return x===fresh; });
      var res2 = { ok:true, n:n, bin:colLabel(b, l2.ci), line:b.line.id, no:b.no, diff:false, note:"isi "+n+" roll lebih tinggi dari perkiraan, ditaruh di posisi belakang" };
      closeTask(t, res2); return res2;
    }
    b.cols = b.cols.filter(function(c){ return c.stacks.length; });
    var back = b.cols.filter(function(c){ return c.mat===m.code; })[0];
    if(!(back && placeUnit(back, m.d, u, b.line.depth))){ var nc2 = { mat:m.code, gap:0, stacks:[] }; b.cols.push(nc2); placeUnit(nc2, m.d, u, b.line.depth); }
    return { ok:false, err:"Isi "+n+" roll tidak muat lagi di bin booking. Taruh di bin lain." };
  }
  // opsi bin lain untuk 1 SU (dipakai saat petugas scan lokasi yang beda dari booking)
  function optionsForTask(t, n){
    var m = mat(t.mat), u = { id:t.id, n:n, nw:m.w, h:n*m.w, kg:t.kg, tg:t.tg||todayStr() };
    return findOptions({ m:m, units:[u], qty:1, rolls:n }, {}, true);
  }
  function placeOther(t, n, o, why){
    var m = mat(t.mat); clearNew();
    var l = locateTask(t); if(l) removeAt(l);
    var u = { id:t.id, n:n, nw:m.w, h:n*m.w, kg:t.kg, tg:t.tg||todayStr() };
    o.qty = 1;
    var r = applyOption(o, { m:m, units:[u], qty:1, rolls:n }, [u]);
    if(!r.placed){ return { ok:false, err:"Tidak muat di bin itu." }; }
    var l2 = findUnit(function(x){ return x===r.units[0]; });
    var res = { ok:true, n:n, bin:colLabel(l2.b, l2.ci), line:l2.b.line.id, no:l2.b.no, diff:true, why:why, note:"booking "+t.label+" → ditaruh di "+colLabel(l2.b, l2.ci) };
    closeTask(t, res); return res;
  }
  // kode label bin: "B13", "B13A", "BIN-B13A"
  function parseBinCode(code){
    var m = String(code||"").trim().toUpperCase().replace(/^BIN[-\s]*/, "").match(/^([A-H])\s*0*(\d{1,3})([AB])?$/);
    if(!m) return null;
    var b = binOf(m[1], +m[2]); if(!b) return null;
    return { b:b, sub:m[3]||"" };
  }

  /* ================= simpan & sinkron (Firestore kalau online, localStorage kalau offline) ================= */
  function r3(x){ return Math.round(x*1000)/1000; }
  function serLine(L){ return { gap:r3(L.gap), pref:L.pref, bins:L.bins.map(function(b){ return { no:b.no, w:r3(b.w), cols:b.cols.map(function(c){ return { m:c.mat, g:r3(c.gap), s:c.stacks.map(function(s){ return { d:s.d, u:s.units.map(function(u){ return [u.n, r3(u.h), (u.pending?1:0)|(u.isNew?2:0), u.id||"", u.tg||""]; }) }; }) }; }) }; }) }; }
  function deserLine(L, o){
    L.gap = o.gap; L.pref = normPref(o.pref);
    L.bins = o.bins.map(function(b){ return { line:L, no:b.no, w:b.w, cols:b.cols.map(function(c){ return { mat:c.m, gap:c.g, stacks:c.s.map(function(s){ return { d:s.d, units:s.u.map(function(a){ var u = { n:a[0], h:a[1], nw:a[1]/a[0], pending:!!(a[2]&1), isNew:!!(a[2]&2) }; if(a[3]) u.id = a[3]; if(a[4]) u.tg = a[4]; return u; }) }; }) }; }) }; });
  }
  function serMeta(){ var mk = {}; MATS.forEach(function(m){ mk[m.code] = [m.kg||0, m.refN||0]; }); return { v:3, P:{ HMAX:P.HMAX, GAP:P.GAP, GAPMIN:P.GAPMIN, RHO:P.RHO, FE:P.FILL_EASY, FM:P.FILL_MAX, CE:P.C_EMPTY, CT:P.C_TANG, CS:P.C_SPLIT }, mats:mk, seq:ID_SEQ }; }
  function deserMeta(o){
    if(o.P){ P.HMAX = o.P.HMAX; P.GAP = o.P.GAP; P.GAPMIN = o.P.GAPMIN; P.RHO = o.P.RHO; if(o.P.FE) P.FILL_EASY = o.P.FE; if(o.P.FM) P.FILL_MAX = o.P.FM; if(o.P.CE) P.C_EMPTY = o.P.CE; if(o.P.CT!==undefined) P.C_TANG = o.P.CT; if(o.P.CS!==undefined) P.C_SPLIT = o.P.CS; }
    MATS.forEach(function(m){ var a = o.mats && o.mats[m.code]; if(a){ m.kg = a[0] || null; m.refN = a[1]||0; } });
    ID_SEQ = Math.max(ID_SEQ, o.seq||0);
  }
  function snapshotAll(){
    var o = { meta:JSON.stringify(serMeta()), lines:{}, tasks:{} };
    LINES.forEach(function(L){ o.lines[L.id] = JSON.stringify(serLine(L)); });
    TASKS.forEach(function(t){ o.tasks[t.id] = JSON.stringify(t); });
    return o;
  }
  function importAll(o){
    deserMeta(JSON.parse(o.meta));
    LINES.forEach(function(L){ if(o.lines[L.id]) deserLine(L, JSON.parse(o.lines[L.id])); });
    TASKS = Object.keys(o.tasks).map(function(k){ return JSON.parse(o.tasks[k]); }).sort(function(a,b){ return (a.seq||0)-(b.seq||0); });
  }
  var IN_FRAME = true; try{ IN_FRAME = window.self !== window.top; }catch(e){ IN_FRAME = true; }
  var LS_KEY = "jrt-sim-v3";
  var FB_CONFIG = { apiKey:"AIzaSyBBRo7tTq25VAaES42pEbTlH1_9jvhAm4Y", authDomain:"packaging-wms.firebaseapp.com", projectId:"packaging-wms", storageBucket:"packaging-wms.firebasestorage.app", messagingSenderId:"808365853689", appId:"1:808365853689:web:4171dfd98ce30776a40b28" };
  var STORE = { mode:"local", state:"off", msg:"", db:null, synced:{ meta:"", lines:{}, tasks:{} }, raw:{ meta:null, lines:{}, tasks:{} }, ready:{}, onChange:null, booted:false };
  function lsGet(){ try{ var j = localStorage.getItem(LS_KEY); return j ? JSON.parse(j) : null; }catch(e){ return null; } }
  function lsSet(o){ try{ localStorage.setItem(LS_KEY, JSON.stringify(o)); }catch(e){} }
  function saveState(){
    var snap = snapshotAll();
    if(STORE.mode!=="fb"){ lsSet(snap); STORE.synced = snap; return; }
    var db = STORE.db, ops = [];
    if(snap.meta!==STORE.synced.meta) ops.push(["set", db.collection("jrt_meta").doc("state"), { j:snap.meta, t:Date.now() }]);
    Object.keys(snap.lines).forEach(function(k){ if(snap.lines[k]!==STORE.synced.lines[k]) ops.push(["set", db.collection("jrt_line").doc(k), { j:snap.lines[k], t:Date.now() }]); });
    Object.keys(snap.tasks).forEach(function(k){ if(snap.tasks[k]!==STORE.synced.tasks[k]) ops.push(["set", db.collection("jrt_task").doc(k), { j:snap.tasks[k], t:Date.now() }]); });
    Object.keys(STORE.synced.tasks).forEach(function(k){ if(!snap.tasks[k]) ops.push(["del", db.collection("jrt_task").doc(k)]); });
    STORE.synced = snap;
    for(var i=0;i<ops.length;i+=400){ (function(chunk){ var b = db.batch(); chunk.forEach(function(o){ if(o[0]==="set") b.set(o[1], o[2]); else b.delete(o[1]); }); b.commit().catch(function(e){ setStoreState("err", (e && (e.code||e.message)) || String(e)); }); })(ops.slice(i, i+400)); }
  }
  function resetAll(){ resetWarehouse(); saveState(); }
  function setStoreState(st, msg){ STORE.state = st; STORE.msg = msg||""; if(STORE.onChange) STORE.onChange("status"); }
  function storeBadge(){
    var t = { on:["ok","Online · tersinkron"], wait:["warn","Menyambung…"], off:["","Offline · data di perangkat ini"], err:["crit","Offline · gagal tersambung"] }[STORE.state] || ["","Offline"];
    return '<span class="fbst '+t[0]+'" title="'+esc(STORE.msg||"")+'">'+t[1]+'</span>';
  }
  function bootLocal(){
    STORE.mode = "local";
    var o = lsGet();
    if(o && o.meta && o.lines){ try{ importAll(o); STORE.synced = o; }catch(e){ resetAll(); } } else resetAll();
    window.addEventListener("storage", function(e){ if(e.key!==LS_KEY || !e.newValue) return; var o2; try{ o2 = JSON.parse(e.newValue); importAll(o2); STORE.synced = o2; }catch(x){ console.error("jrt import", x); return; } if(STORE.onChange) STORE.onChange("remote"); });
  }
  function fbRemote(){
    if(!(STORE.ready.m && STORE.ready.l && STORE.ready.t)) return;
    var raw = STORE.raw;
    var oldV = false; try{ oldV = raw.meta && (JSON.parse(raw.meta).v||0) < 3; }catch(e){ oldV = true; }
    // data versi lama (belum ada tanggal masuk untuk FIFO) diisi ulang sekali
    if(!raw.meta || oldV || Object.keys(raw.lines).length < LINES.length){
      if(!STORE.booted){ STORE.booted = true; resetWarehouse(); saveState(); setStoreState("on"); if(STORE.onChange) STORE.onChange("remote"); }
      return;
    }
    var o = { meta:raw.meta, lines:raw.lines, tasks:raw.tasks };
    var same = o.meta===STORE.synced.meta && JSON.stringify(o.lines)===JSON.stringify(STORE.synced.lines) && JSON.stringify(o.tasks)===JSON.stringify(STORE.synced.tasks);
    STORE.booted = true;
    if(!same){ try{ importAll(o); STORE.synced = { meta:o.meta, lines:Object.assign({}, o.lines), tasks:Object.assign({}, o.tasks) }; }catch(e){} if(STORE.onChange) STORE.onChange("remote"); }
    if(STORE.state!=="on") setStoreState("on");
  }
  function initStore(onChange){
    STORE.onChange = onChange;
    // tampilkan dulu dari data lokal supaya halaman langsung terisi
    bootLocal();
    if(IN_FRAME || !window.firebase || !window.firebase.initializeApp){ setStoreState("off"); return; }
    setStoreState("wait");
    try{
      if(!(window.firebase.apps && window.firebase.apps.length)) window.firebase.initializeApp(FB_CONFIG);
      window.firebase.auth().signInAnonymously().then(function(){
        STORE.db = window.firebase.firestore(); STORE.mode = "fb";
        STORE.synced = { meta:"", lines:{}, tasks:{} };
        function fail(e){ STORE.mode = "local"; setStoreState("err", (e && (e.code || e.message)) || String(e)); }
        STORE.db.collection("jrt_meta").doc("state").onSnapshot(function(d){ STORE.raw.meta = d.exists ? d.data().j : null; STORE.ready.m = true; fbRemote(); }, fail);
        STORE.db.collection("jrt_line").onSnapshot(function(snap){ var r = {}; snap.forEach(function(d){ r[d.id] = d.data().j; }); STORE.raw.lines = r; STORE.ready.l = true; fbRemote(); }, fail);
        STORE.db.collection("jrt_task").onSnapshot(function(snap){ var r = {}; snap.forEach(function(d){ r[d.id] = d.data().j; }); STORE.raw.tasks = r; STORE.ready.t = true; fbRemote(); }, fail);
      }).catch(function(e){ var c = (e && e.code) || String(e); setStoreState("err", c==="auth/network-request-failed" ? "Tidak ada koneksi internet." : "Login anonim gagal ("+c+")."); });
    }catch(e){ setStoreState("err", String(e && e.message || e)); }
  }

  /* ================= pindah stok (seperti LT10) ================= */
  // Forklift mengambil dari depan: yang bisa dipindah = SU paling atas di tumpukan paling depan tiap kolom.
  function frontUnits(b){ var r = []; b.cols.forEach(function(c, ci){ var s = c.stacks[0]; if(!s) return; var k = s.units.length-1, u = s.units[k]; r.push({ b:b, ci:ci, c:c, si:0, s:s, k:k, u:u, pending:!!u.pending }); }); return r; }
  function isFront(l){ return l.si===0 && l.k===l.s.units.length-1; }
  function locateSU(code){ code = String(code||"").trim().toUpperCase(); return findUnit(function(u){ return !u.pending && u.id && String(u.id).toUpperCase()===code; }); }
  // urutan diambil (FIFO dari depan): tumpukan paling depan dulu, dari atas ke bawah
  function pickSeq(c){ var r = []; c.stacks.forEach(function(st){ for(var k=st.units.length-1;k>=0;k--) r.push(st.units[k]); }); return r; }
  // sisipkan 1 ID roll ke kolom sesuai tanggal masuk: diambil setelah semua yang lebih lama / sama tanggalnya.
  // Tumpukan di belakang posisi itu tidak disentuh; yang di depan / di atasnya dikeluarkan dulu lalu disusun kembali dari belakang.
  function fifoInsert(c, u, depth, d){
    var seq = pickSeq(c), p = 0;
    while(p<seq.length && (seq[p].tg||"") <= (u.tg||"")) p++;
    var S = c.stacks.length-1, idx = 0;
    if(p<seq.length){ for(var si=0; si<c.stacks.length; si++){ var n = c.stacks[si].units.length; if(p<idx+n){ S = si; break; } idx += n; } }
    var keep = c.stacks.slice(S+1), front = [];
    for(var a=0;a<=S;a++){ var st = c.stacks[a]; for(var k=st.units.length-1;k>=0;k--) front.push(st.units[k]); }
    front.splice(p, 0, u);
    var avail = depth; keep.forEach(function(st){ avail -= st.d; });
    var built = [], cur = null, used = 0;
    front.slice().reverse().forEach(function(x){ if(cur && stackH(cur)+x.h <= P.HMAX+EPS) cur.units.push(x); else { cur = { d:d, units:[x] }; built.push(cur); used += d; } });
    if(used > avail+EPS) return null;
    built.reverse();
    return { col:{ mat:c.mat, gap:0, stacks:built.concat(keep) }, moves:p };
  }
  function moveOptions(l){
    var m = mat(l.c.mat), u = l.u, unit = { id:u.id, n:u.n, nw:m.w, h:u.h, tg:u.tg }, out = [];
    findOptions({ m:m, units:[unit], qty:1, rolls:u.n }, {}, true).forEach(function(o, oi){
      if(o.b===l.b) return;
      o.ord = oi; o.moves = 0; o.fifo = null;
      if(o.colsUse.length){
        var best = null;
        o.colsUse.forEach(function(ci){ var c = o.b.cols[ci]; if(!colUniformD(c, m.d) || colHasPending(c)) return; var fi = fifoInsert(c, unit, o.b.line.depth, m.d); if(fi && (!best || fi.moves < best.moves)){ best = fi; best.ci = ci; } });
        if(!best){ if(!o.colsNew) return; }       // tidak muat sesuai urutan tanggal -> pakai kolom baru (A/B) kalau ada
        else { o.fifo = best; o.moves = best.moves; }
      }
      out.push(o);
    });
    out.sort(function(a, b){ return a.moves-b.moves || a.ord-b.ord; });
    return out;
  }
  function moveUnit(l, o, why){
    var m = mat(l.c.mat), u = l.u, from = colLabel(l.b, l.ci), unit = { id:u.id, n:u.n, nw:m.w, h:u.h, tg:u.tg };
    // cek dulu di tujuan sebelum diangkat dari asal
    var fi = null;
    if(o.fifo){ fi = fifoInsert(o.b.cols[o.fifo.ci], unit, o.b.line.depth, m.d); if(!fi) return { ok:false, err:"Tidak muat lagi di bin tujuan." }; }
    else if(!simGot(o, m, [unit]).length) return { ok:false, err:"Tidak muat di bin tujuan." };
    l.s.units.splice(l.k, 1);
    if(!l.s.units.length) l.c.stacks.splice(l.si, 1);
    if(!l.c.stacks.length) l.b.cols.splice(l.ci, 1);
    clearNew();
    var to, line, no, note = "";
    if(fi){
      unit.isNew = true; o.b.cols[o.fifo.ci] = fi.col; to = colLabel(o.b, o.fifo.ci); line = o.b.line.id; no = o.b.no;
      if(fi.moves) note = fi.moves+" ID roll di depan / di atasnya dikeluarkan lalu disusun kembali";
    } else {
      o.qty = 1;
      var r = applyOption(o, { m:m, units:[unit], qty:1, rolls:u.n }, [unit]);
      var l2 = findUnit(function(x){ return x===r.units[0]; }); to = colLabel(l2.b, l2.ci); line = l2.b.line.id; no = l2.b.no; note = r.geser||"";
      r.units[0].tg = u.tg; if(!u.id) delete r.units[0].id;
    }
    ID_SEQ++;
    var mv = { kind:"move", seq:Date.now(), id:"MV"+String(ID_SEQ).padStart(4,"0"), su:u.id||"", mat:m.code, n:u.n, from:from, bin:to, why:why, status:"pindah", ts:Date.now(), note:note };
    TASKS.push(mv);
    return { ok:true, from:from, to:to, line:line, no:no, mv:mv };
  }



  /* ================= ambil untuk produksi (TP 9061 -> 9051) ================= */
  // Permintaan = reservasi produksi: no material + jumlah SU + mesin tujuan (dipilih admin, tidak discan). Petugas scan SU paling lama yang bisa dijangkau (FIFO) lalu konfirmasi.
  var MESIN = ["MESIN-01","MESIN-02","MESIN-03","MESIN-04","MESIN-05","MESIN-06"];
  function picks(){ return TASKS.filter(function(t){ return t.kind==="pick"; }); }
  function newPick(code, qty, mesin){
    ID_SEQ++;
    var p = { kind:"pick", seq:Date.now(), id:"TP"+String(ID_SEQ).padStart(4,"0"), mat:code, qty:qty, mesin:mesin, items:[], status:"open", ts:Date.now() };
    TASKS.push(p); return p;
  }
  // kandidat yang bisa diambil sekarang: SU paling atas di tumpukan paling depan, no material sama, bukan booking
  // FIFO saat keluar: semua SU di blok (tumpukan) paling depan tiap kolom bisa diambil; SU di atasnya cukup dipindah sementara lalu ditaruh kembali
  function unitsAbove(s, k){ var r = []; for(var i=k+1;i<s.units.length;i++) if(!s.units[i].pending) r.push(s.units[i]); return r; }
  function pickCandidates(code){
    var out = [];
    LINES.forEach(function(L){ L.bins.forEach(function(b){ b.cols.forEach(function(c, ci){
      if(c.mat!==code || !c.stacks[0]) return; var s = c.stacks[0];
      s.units.forEach(function(u, k){ if(u.pending) return; out.push({ b:b, ci:ci, c:c, si:0, s:s, k:k, u:u, above:unitsAbove(s, k) }); });
    }); }); });
    // tanggal masuk paling lama dulu; tanggal sama -> yang paling sedikit SU di atasnya, lalu kolom yang isinya paling sedikit
    out.sort(function(a, b){ var ta = a.u.tg||"", tb = b.u.tg||""; if(ta!==tb) return ta<tb ? -1 : 1; return a.above.length-b.above.length || colIDs(a.c)-colIDs(b.c) || lineIdx(a.b.line)-lineIdx(b.b.line) || a.b.no-b.b.no; });
    return out;
  }
  // stok paling lama per no material (termasuk yang tertahan di belakang) untuk cek FIFO
  function oldestOf(code){ var best = null; LINES.forEach(function(L){ L.bins.forEach(function(b){ b.cols.forEach(function(c, ci){ if(c.mat!==code) return; c.stacks.forEach(function(s){ s.units.forEach(function(u){ if(u.pending || !u.tg) return; if(!best || u.tg<best.tg) best = { tg:u.tg, b:b, ci:ci }; }); }); }); }); }); return best; }
  // cari no material dengan input bebas: kode persis, atau potongan kode / nama
  function matSearch(q){ q = String(q||"").trim().toLowerCase(); if(!q) return []; var code = q.split(/\s/)[0];
    var ex = MATS.filter(function(m){ return m.code===code; }); if(ex.length) return ex;
    return MATS.filter(function(m){ return (m.code+" "+m.name+" "+dLbl(m.d)).toLowerCase().indexOf(q)>=0; }); }
  function takeUnit(l){
    l.s.units.splice(l.k, 1);
    if(!l.s.units.length){ if(l.si===0){ l.c.stacks.shift(); l.c.gap += l.s.d; } else l.c.stacks.splice(l.si, 1); }
    if(!l.c.stacks.length) l.b.cols.splice(l.ci, 1);
  }
  function pickUnit(p, l){
    var from = colLabel(l.b, l.ci), u = l.u;
    takeUnit(l);
    p.items.push({ su:u.id||"", from:from, n:u.n, tg:u.tg||"", ts:Date.now() });
    if(p.items.length >= p.qty) p.status = "done";
    return { from:from, su:u.id||"", n:u.n };
  }
