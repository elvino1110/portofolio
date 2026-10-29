/* sp-core.js — inti POC katalog sparepart: data contoh, pencarian, history mesin, order, sinkron, dan CLIP */
var $ = function(s){ return document.querySelector(s); };
function esc(s){ return String(s==null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
var BLN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function todayStr(){ return ymd(new Date()); }
function addDays(s, k){ var a = s.split("-"); var d = new Date(+a[0], +a[1]-1, +a[2]); d.setDate(d.getDate()+k); return ymd(d); }
function tgFull(s){ if(!s) return "-"; var a = s.split("-"); return (+a[2])+" "+BLN[+a[1]-1]+" "+a[0]; }
function ago(s){ if(!s) return ""; var a = s.split("-"), t = todayStr().split("-"); var n = Math.round((new Date(+t[0],+t[1]-1,+t[2]) - new Date(+a[0],+a[1]-1,+a[2]))/864e5); if(n<=0) return "hari ini"; if(n<31) return n+" hari lalu"; if(n<365) return Math.round(n/30)+" bulan lalu"; return (n/365).toFixed(1).replace(".",",")+" tahun lalu"; }
function nowTime(ts){ var d = new Date(ts); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }

/* ================= keluarga barang (dipakai CLIP untuk menebak dari bentuk) ================= */
var FAMS = [
  { id:"bb", name:"Bearing bola",        en:["a photo of a ball bearing","a steel deep groove ball bearing","a ball bearing with balls in a cage"] },
  { id:"re", name:"Rod end",             en:["a photo of a rod end bearing with a threaded shaft","a rod end joint with a ball eye and male thread"] },
  { id:"pot",name:"Potensiometer",       en:["a photo of a rotary potentiometer","a cylindrical metal potentiometer with solder terminals","an electronic potentiometer in a plastic bag"] },
  { id:"pb", name:"Bearing unit / insert (UC, UK)", en:["a photo of a pillow block bearing housing","a cast iron bearing unit with bolt holes","an insert ball bearing with set screws on the inner ring"] },
  { id:"vb", name:"V-belt",              en:["a photo of a rubber v-belt","a black v belt loop"] },
  { id:"tb", name:"Timing belt",         en:["a photo of a toothed timing belt","a rubber synchronous belt with teeth"] },
  { id:"os", name:"Oil seal",            en:["a photo of an oil seal","a rubber shaft seal ring"] },
  { id:"or", name:"O-ring",              en:["a photo of a rubber o-ring","a black rubber ring gasket"] },
  { id:"ch", name:"Rantai",              en:["a photo of a roller chain","a metal drive chain"] },
  { id:"sk", name:"Sprocket",            en:["a photo of a sprocket","a metal chain sprocket gear wheel"] },
  { id:"cp", name:"Coupling",            en:["a photo of a shaft coupling","a jaw coupling with rubber spider"] },
  { id:"kn", name:"Pisau / blade",       en:["a photo of a circular saw blade","a sharp cutting knife blade","an industrial slitter knife"] },
  { id:"sv", name:"Solenoid valve",      en:["a photo of a pneumatic solenoid valve","a solenoid valve with coil and connector"] },
  { id:"cy", name:"Silinder pneumatik",  en:["a photo of a pneumatic cylinder","an aluminium air cylinder with piston rod"] },
  { id:"pf", name:"Fitting pneumatik",   en:["a photo of a push-in pneumatic fitting","a small air hose connector fitting"] },
  { id:"px", name:"Sensor proximity",    en:["a photo of an inductive proximity sensor","a cylindrical threaded sensor with cable"] },
  { id:"mt", name:"Motor listrik",       en:["a photo of an electric motor","an industrial induction motor"] },
  { id:"kt", name:"Kontaktor",           en:["a photo of an electrical contactor","a magnetic contactor relay"] },
  { id:"hc", name:"Hose clamp",          en:["a photo of a stainless steel hose clamp","a metal worm gear hose clamp band"] },
  { id:"sb", name:"Sealing belt",        en:["a photo of a brown PTFE coated sealing belt with stitched edges","a brown teflon heat resistant flat belt loop"] },
  { id:"cb", name:"Conveyor belt",       en:["a photo of a green rubber conveyor belt with white fabric backing","a flat green conveyor belt loop"] },
  { id:"sc", name:"Baut / screw",        en:["a photo of a steel bolt screw","a hex socket screw with thread"] },
  { id:"gr", name:"Gear",                en:["a photo of a spur gear","a white nylon plastic gear wheel"] },
  { id:"ad", name:"Adapter sleeve",      en:["a photo of a bearing adapter sleeve with lock nut","a tapered steel sleeve with a slotted nut"] },
  { id:"gs", name:"Grease / pelumas",    en:["a photo of a grease container","a tube or tin of lubricating grease"] },
  { id:"tu", name:"Selang pneumatik (PU)",en:["a photo of a coil of polyurethane air tubing","a blue plastic pneumatic hose"] },
  { id:"sr", name:"Snap ring",           en:["a photo of a circlip snap ring","a steel retaining ring with two holes"] },
  { id:"rg", name:"Regulator & flow control",en:["a photo of a pneumatic air pressure regulator with gauge","a small pneumatic flow control valve"] },
  { id:"gb", name:"Gearbox",             en:["a photo of a worm gearbox","an industrial gear reducer housing"] },
  { id:"dw", name:"Part drawing (custom)",en:["a photo of a custom machined metal part","a machined steel component made by a workshop"] }
];
function famById(id){ for(var i=0;i<FAMS.length;i++) if(FAMS[i].id===id) return FAMS[i]; return null; }

/* ================= mesin ================= */
// struktur seperti SAP PM: mesin (functional location level 1) -> bagian (fun loc level 2) -> komponen (BOM)
// struktur mengikuti functional location SAP PM (contoh dari export BOM 27 Okt 2026): plant UVD5 -> mesin -> bagian -> BOM
var FAC_SECS = [["UNW00","Unwind 01","UNW"],["UNW01","Unwind 02","UNW"],["DCR00","Dancer roll","DCR"],["MBS00","Emboss","EMB"],["FLD00","Folding","FLD"],["LGS00","Log saw","LSW"],["ABSW0","Auto bandsaw","SAW"],["APCKL","Auto pack kiloan","PCK"],["MTR00","Motor","DRV"],["VCP00","Vacuum pump A","VCP"]];
var IFD_SECS = [["UNW00","Unwind 01","UNW"],["UNW01","Unwind 02","UNW"],["MBS00","Emboss","EMB"],["FLD00","Interfolder","FLD"],["CUT00","Cutting","CUT"],["STK00","Stacker / counter","STK"],["MTR00","Motor","DRV"]];
var OTH_SECS = [["UNW00","Unwind 01","UNW"],["MBS00","Emboss","EMB"],["FLD00","Folding","FLD"],["STK00","Stacker / counter","STK"],["PCK00","Packing","WRAP"],["MTR00","Motor","DRV"]];
var MACHINES = [
  { id:"FCI26", name:"Facial 26", fl:"UVD5-FCI26", secs:[["UNW00","Unwind 01","UNW"],["UNW01","Unwind 02","UNW"],["UNW02","Unwind 03","UNW"],["UNW03","Unwind 04","UNW"],["DCR00","Dancer roll","DCR"],["MBS00","Emboss","EMB"],["FLD00","Folding","FLD26"],["LGS00","Log saw","LSW"],["ABSW0","Auto bandsaw","SAW"],["MBSW0","Bandsaw manual","SAW"],["APCKL","Auto pack kiloan","PCK"],["MTR00","Motor","DRV"],["PNL00","Panel control folding","PNL"],["PNLCT","Panel cutting auto bandsaw","PNL"],["PNLPC","Panel packing kiloan","PNL"],["VCP00","Vacuum pump A","VCP"],["VCP01","Vacuum pump B","VCP"]] },
  { id:"FCI28", name:"Facial 28", fl:"UVD5-FCI28", secs:FAC_SECS },
  { id:"FCI29", name:"Facial 29", fl:"UVD5-FCI29", secs:FAC_SECS },
  { id:"FCI30", name:"Facial 30", fl:"UVD5-FCI30", secs:FAC_SECS },
  { id:"FCI31", name:"Facial Interfold 31", fl:"UVD5-FCI31", secs:IFD_SECS },
  { id:"FCI33", name:"Facial Interfold 33", fl:"UVD5-FCI33", secs:IFD_SECS },
  { id:"NAP",   name:"Napkin machine", fl:"UVD5-NAP", secs:OTH_SECS },
  { id:"MTF",   name:"M fold machine", fl:"UVD5-MTF", secs:OTH_SECS },
  { id:"HKY",   name:"Handkerchief machine", fl:"UVD5-HKY", secs:OTH_SECS },
  { id:"POC",   name:"Pocket machine", fl:"UVD5-POC", secs:OTH_SECS }
];
// komponen per jenis bagian: [no material, qty terpasang]
var SEC_TPL = {
  UNW:{ name:"Unwind",          bom:[["2001012",2],["2001005",4],["2001081",2],["2001102",3],["2001061",1],["2001321",2],["2001280",1],["2001141",2]] },
  EMB:{ name:"Embosser",        bom:[["2001014",2],["2001011",4],["2001013",2],["2001220",1],["2001221",1],["2001120",1],["2001060",1],["2001080",2]] },
  FLD:{ name:"Folding",         bom:[["2001015",4],["2001302",6],["2001441",8],["2001041",4],["2001040",2],["2001007",6],["2001003",4],["2001121",2],["2001260",3],["2001300",8],["2001140",2]] },
  REW:{ name:"Rewinder",        bom:[["2001041",2],["2001005",4],["2001120",1],["2001061",1],["2001320",3],["2001340",1],["2001004",2]] },
  LSW:{ name:"Log saw",         bom:[["2001240",1],["2001012",2],["2001007",2],["2001100",3],["2001101",3],["2001142",2],["2001340",1]] },
  PCK:{ name:"Packing",         bom:[["2001400",1],["2001420",1],["2001303",4],["2001261",4],["2001281",2],["2001301",8],["2001320",4],["2001360",3],["2001180",1],["2001200",2]] },
  TAIL:{ name:"Tail sealer",    bom:[["2001261",2],["2001281",1],["2001301",4],["2001160",4],["2001062",1]] },
  FEED:{ name:"Infeed",         bom:[["2001181",1],["2001200",2],["2001201",1],["2001001",4],["2001002",4],["2001320",2]] },
  SAW:{ name:"Saw head",        bom:[["2001240",1],["2001012",2],["2001007",2],["2001100",4],["2001101",4],["2001142",2],["2001340",1],["2001010",2]] },
  OUT:{ name:"Outfeed",         bom:[["2001181",1],["2001201",2],["2001002",4],["2001321",2],["2001103",2]] },
  STK:{ name:"Stacker / counter",bom:[["2001181",1],["2001200",2],["2001201",2],["2001320",3],["2001161",2],["2001043",2]] },
  CUT:{ name:"Cutting",         bom:[["2001242",2],["2001241",1],["2001002",4],["2001001",2],["2001122",1]] },
  WRAP:{ name:"Wrapping / sealer",bom:[["2001400",1],["2001420",2],["2001303",6],["2001380",2],["2001442",8],["2001260",3],["2001280",2],["2001300",6],["2001160",4],["2001361",2],["2001062",1],["2001042",2]] },
  DCR:{ name:"Dancer roll",     bom:[["2001061",1],["2001005",4],["2001280",1],["2001041",2],["2001321",1]] },
  VCP:{ name:"Vacuum pump",     bom:[["2001010",2],["2001161",2],["2001341",1],["2001104",2],["2001140",2]] },
  PNL:{ name:"Panel",           bom:[["2001360",4],["2001361",2],["2001260",1],["2001320",2]] },
  FLD26:{ name:"Folding",       bom:[["2005001",4],["2005002",2],["2005003",8],["2005004",2],["2005005",6],["2005006",6],["2005007",1],["2005008",128],["2005009",100],["2005010",4],["2005011",8],["2005012",1],["2005013",5],["2005014",1],["2005015",8],["2005016",24],["2005017",4],["2005018",40],["2005019",60],["2005020",1],["2005021",8],["2005022",100],["2005023",4],["2005024",64],["2005025",4],["2005026",4],["2005027",24],["2005028",2],["2005029",3],["2005030",20],["2005031",2],["2005032",2],["2005033",3],["2005034",1],["2005035",1],["2005036",4],["2005037",8],["2005038",3],["2005039",4],["2005040",2],["2005041",6],["2005042",3],["2005043",64],["2005044",2],["2005045",64],["2005046",8],["2005047",34],["2005048",8],["2005049",2]] },
  DRV:{ name:"Drive",           bom:[["2001202",1],["2001123",1],["2001460",1],["2001440",4],["2001341",1],["2001104",3],["2001182",1],["2001080",2],["2001361",1],["2001103",2]] }
};
var SECTIONS = [];
(function(){
  var seed = 3; function rnd(){ seed = (seed*1103515245+12345)%2147483648; return seed/2147483648; }
  var keep = { "2001041":1, "2001007":1, "2001012":1, "2001061":1 };
  MACHINES.forEach(function(m){
    m.secs.forEach(function(sx){
      var code = sx[0], t = SEC_TPL[sx[2]], real = sx[2]==="FLD26";
      var bom = t.bom.filter(function(b, i){ return real || i<3 || keep[b[0]] || rnd()<0.8; }).map(function(b){ return { mat:b[0], q:b[1] }; });
      SECTIONS.push({ m:m.id, code:code, name:sx[1], fl:m.fl+"-"+code, bom:bom, real:real });
    });
  });
})();
// part drawing hanya untuk mesin tertentu (dibuat workshop atas request user)
(function(){ var x = SECTIONS.filter(function(z){ return z.m==="FCI28" && z.code==="MBS00"; })[0]; if(x) x.bom.unshift({ mat:"2001480", q:1 }); })();
function sectionsOf(machine){ return SECTIONS.filter(function(x){ return x.m===machine; }); }
function sectionOf(machine, code){ for(var i=0;i<SECTIONS.length;i++) if(SECTIONS[i].m===machine && SECTIONS[i].code===code) return SECTIONS[i]; return null; }
// komponen BOM: 1 bagian, atau semua bagian 1 mesin
function bomOf(machine, code){
  var out = {}, list = [];
  (code ? [sectionOf(machine, code)] : sectionsOf(machine)).forEach(function(sc){ if(!sc) return; sc.bom.forEach(function(b){ if(!out[b.mat]){ out[b.mat] = { mat:b.mat, q:0, secs:[] }; list.push(out[b.mat]); } out[b.mat].q += b.q; out[b.mat].secs.push(sc.code); }); });
  return list;
}
function inBom(machine, code, mat){ var sc = code ? [sectionOf(machine, code)] : sectionsOf(machine); return sc.some(function(x){ return x && x.bom.some(function(b){ return b.mat===mat; }); }); }
// where-used: no material ini ada di BOM mesin / bagian mana saja
function whereUsed(mat){ return SECTIONS.filter(function(x){ return x.bom.some(function(b){ return b.mat===mat; }); }); }
function secName(machine, code){ var x = sectionOf(machine, code); return x ? x.name : (code||""); }
function machineById(id){ for(var i=0;i<MACHINES.length;i++) if(MACHINES[i].id===id) return MACHINES[i]; return null; }

/* ================= katalog contoh (no material fiktif) ================= */
// foto asli dari gudang: seluruhnya dipakai sebagai foto katalog (pencarian foto = foto ke foto)
var BASE_PHOTOS = {
  "2001041": ["sp-img/rodend-1.jpg","sp-img/rodend-2.jpg","sp-img/rodend-3.jpg"],
  "2001007": ["sp-img/bearing-1.jpg","sp-img/bearing-2.jpg","sp-img/bearing-3.jpg"],
  "2001012": ["sp-img/timken6309-1.jpg"],
  "2001061": ["sp-img/pot-1.jpg","sp-img/pot-2.jpg","sp-img/pot-3.jpg"],
  "2001202": ["sp-img/2001202-1.jpg", "sp-img/2001202-2.jpg"],
  "2001460": ["sp-img/2001460-1.jpg", "sp-img/2001460-2.jpg", "sp-img/2001460-3.jpg"],
  "2001442": ["sp-img/2001442-1.jpg", "sp-img/2001442-2.jpg"],
  "2001441": ["sp-img/2001441-1.jpg", "sp-img/2001441-2.jpg"],
  "2001440": ["sp-img/2001440-1.jpg", "sp-img/2001440-2.jpg"],
  "2001303": ["sp-img/2001303-1.jpg", "sp-img/2001303-2.jpg", "sp-img/2001303-3.jpg"],
  "2001302": ["sp-img/2001303-1.jpg", "sp-img/2001302-2.jpg", "sp-img/2001302-3.jpg"],
  "2001420": ["sp-img/2001420-1.jpg", "sp-img/2001420-2.jpg", "sp-img/shot-cb.jpg"],
  "2001123": ["sp-img/2001123-1.jpg", "sp-img/2001123-2.jpg"],
  "2001400": ["sp-img/2001400-1.jpg", "sp-img/2001400-2.jpg", "sp-img/2001400-3.jpg", "sp-img/shot-sb.jpg"],
  "2001015": ["sp-img/2001015-1.jpg", "sp-img/2001015-2.jpg"],
  "2001380": ["sp-img/2001380-1.jpg", "sp-img/2001380-2.jpg", "sp-img/shot-hc.jpg"]
};
var SAMPLE_SHOTS = [];
var ITEMS_SRC = [
  // mat, fam, nama, brand, spesifikasi, kata kunci ukuran
  ["2001001","bb","Bearing 6203-2RS","SKF","17 × 40 × 12 mm, seal karet 2 sisi","6203"],
  ["2001002","bb","Bearing 6204-2RS","SKF","20 × 47 × 14 mm, seal karet 2 sisi","6204"],
  ["2001003","bb","Bearing 6205-2RS","NSK","25 × 52 × 15 mm, seal karet 2 sisi","6205"],
  ["2001004","bb","Bearing 6205-ZZ","NSK","25 × 52 × 15 mm, tutup besi 2 sisi","6205"],
  ["2001005","bb","Bearing 6206-ZZ","FAG","30 × 62 × 16 mm, tutup besi 2 sisi","6206"],
  ["2001006","bb","Bearing 6006 terbuka","NACHI","30 × 55 × 13 mm, tanpa seal","6006"],
  ["2001007","bb","Bearing 6007 terbuka","NACHI","35 × 62 × 14 mm, tanpa seal","6007"],
  ["2001008","bb","Bearing 6008 terbuka","NACHI","40 × 68 × 15 mm, tanpa seal","6008"],
  ["2001010","bb","Bearing 6305-2RS","SKF","25 × 62 × 17 mm, seal karet 2 sisi","6305"],
  ["2001011","bb","Bearing 6308-ZZ","TIMKEN","40 × 90 × 23 mm, tutup besi 2 sisi","6308"],
  ["2001012","bb","Bearing 6309-ZZ","TIMKEN","45 × 100 × 25 mm, tutup besi 2 sisi","6309"],
  ["2001013","bb","Bearing 6310-ZZ","TIMKEN","50 × 110 × 27 mm, tutup besi 2 sisi","6310"],
  ["2001040","re","Rod end male M10","IKO","Ulir luar M10 kanan, lubang 10 mm, nipple gemuk","M10"],
  ["2001041","re","Rod end male M12","IKO","Ulir luar M12 kanan, lubang 12 mm, nipple gemuk","M12"],
  ["2001042","re","Rod end male M16","IKO","Ulir luar M16 kanan, lubang 16 mm, nipple gemuk","M16"],
  ["2001043","re","Rod end female M12","IKO","Ulir dalam M12 kanan, lubang 12 mm","M12"],
  ["2001060","pot","Potensiometer 5 kΩ","Bourns","Rotary 10 putaran, poros 6 mm","5K"],
  ["2001061","pot","Potensiometer 10 kΩ","Bourns","Rotary 10 putaran, poros 6 mm, terminal solder","10K"],
  ["2001062","pot","Potensiometer 1 kΩ","Vishay","Rotary 1 putaran, poros 6 mm","1K"],
  ["2001080","pb","Pillow block UCP205","Asahi","Poros 25 mm, housing besi tuang","UCP205"],
  ["2001081","pb","Pillow block UCP208","Asahi","Poros 40 mm, housing besi tuang","UCP208"],
  ["2001100","vb","V-belt B-52","Gates","Penampang B (17 mm), panjang dalam 52 inci","B52"],
  ["2001101","vb","V-belt B-54","Gates","Penampang B (17 mm), panjang dalam 54 inci","B54"],
  ["2001102","vb","V-belt B-60","Bando","Penampang B (17 mm), panjang dalam 60 inci","B60"],
  ["2001103","vb","V-belt A-40","Bando","Penampang A (13 mm), panjang dalam 40 inci","A40"],
  ["2001104","vb","V-belt SPA 1250","Optibelt","Penampang SPA, panjang 1.250 mm","SPA1250"],
  ["2001120","tb","Timing belt 8M-1200-30","Gates","Pitch 8 mm, panjang 1.200 mm, lebar 30 mm","8M1200"],
  ["2001121","tb","Timing belt 5M-800-25","Gates","Pitch 5 mm, panjang 800 mm, lebar 25 mm","5M800"],
  ["2001122","tb","Timing belt T10-1010","Optibelt","Pitch 10 mm, panjang 1.010 mm, lebar 25 mm","T10"],
  ["2001140","os","Oil seal 35 × 52 × 7","NOK","TC, karet NBR","35x52x7"],
  ["2001141","os","Oil seal 40 × 62 × 8","NOK","TC, karet NBR","40x62x8"],
  ["2001142","os","Oil seal 45 × 65 × 10","NOK","TC, karet NBR","45x65x10"],
  ["2001160","or","O-ring 50 × 3","NOK","NBR 70 shore","50x3"],
  ["2001161","or","O-ring 80 × 5","NOK","NBR 70 shore","80x5"],
  ["2001180","ch","Rantai RS50","Tsubaki","Pitch 5/8\", 1 rol = 10 ft","RS50"],
  ["2001181","ch","Rantai RS60","Tsubaki","Pitch 3/4\", 1 rol = 10 ft","RS60"],
  ["2001182","ch","Rantai RS80","Tsubaki","Pitch 1\", 1 rol = 10 ft","RS80"],
  ["2001200","sk","Sprocket RS60 18T","Tsubaki","18 gigi, bore pilot","RS60-18"],
  ["2001201","sk","Sprocket RS60 24T","Tsubaki","24 gigi, bore pilot","RS60-24"],
  ["2001220","cp","Jaw coupling L-100","Lovejoy","Dengan spider karet","L100"],
  ["2001221","cp","Spider coupling L-100","Lovejoy","Karet pengganti L-100","L100"],
  ["2001240","kn","Blade log saw Ø610 mm","Lokal (drawing)","Ø610 × 3 mm, bore 60 mm; batas pakai 50 cm","610"],
  ["2001241","kn","Pisau perforasi 300 mm","Lokal (drawing)","Panjang 300 mm, 24 gigi","PERF300"],
  ["2001242","kn","Pisau slitter Ø150 mm","Lokal (drawing)","Ø150 × 1,5 mm","SLIT150"],
  ["2001260","sv","Solenoid valve 5/2 24 VDC","SMC","Port 1/4\", single coil","5/2"],
  ["2001261","sv","Solenoid valve 3/2 24 VDC","Festo","Port 1/8\", NC","3/2"],
  ["2001280","cy","Silinder Ø50 × 100","SMC","Double acting, ISO 15552","50x100"],
  ["2001281","cy","Silinder Ø32 × 50","Festo","Double acting, ISO 15552","32x50"],
  ["2001300","pf","Fitting PC8-02","SMC","Selang 8 mm, ulir 1/4\"","PC8-02"],
  ["2001301","pf","Fitting PC10-03","SMC","Selang 10 mm, ulir 3/8\"","PC10-03"],
  ["2001320","px","Proximity M12 jarak 4 mm","Omron","PNP NO, kabel 2 m","M12"],
  ["2001321","px","Proximity M18 jarak 8 mm","Omron","PNP NO, kabel 2 m","M18"],
  ["2001340","mt","Motor 1,5 kW 4P","Siemens","380 V, flange B5","1.5KW"],
  ["2001341","mt","Motor 0,75 kW 4P","Siemens","380 V, kaki B3","0.75KW"],
  ["2001360","kt","Kontaktor 9 A 220 VAC","Schneider","LC1D09, 1NO+1NC","9A"],
  ["2001361","kt","Kontaktor 25 A 220 VAC","Schneider","LC1D25, 1NO+1NC","25A"],
  // dari list lapangan 29 Okt 2026 (foto sebagian sudah ada; 6305-ZZ & 6205-ZZ belum); 6205-ZZ sudah ada di atas (2001004)
  ["2001014","bb","Bearing 6305-ZZ","–","25 × 62 × 17 mm, tutup besi 2 sisi (seri 63, lebih tebal dari 6205)","6305"],
  ["2001015","bb","Bearing 61807-ZZ","–","35 × 47 × 7 mm, seri tipis (thin section), tutup besi 2 sisi","61807"],
  ["2001380","hc","Hose clamp HLB 3\" SUS 304","HLB","Klem selang Ø3\" (±76 mm), bahan stainless SUS 304","3IN"],
  ["2001400","sb","Sealing belt 140 × 1183","–","Lebar × panjang 140 × 1.183 mm (urutan ukuran perlu dicek), untuk mesin sealer","140x1183"],
  ["2001420","cb","Conveyor belt 80W × 685L","–","Lebar 80 mm, panjang keliling 685 mm","80x685"],
  ["2001123","tb","Timing belt 196-XL-039","–","Profil XL (pitch 5,08 mm), panjang pitch 19,6\" (497,8 mm, 98 gigi), lebar 0,39\" (9,5 mm)","196XL"],
  ["2001302","pf","Push in fit 1/4 - 6","–","Lurus, ulir R1/4, untuk selang Ø6 mm","1/4-6"],
  ["2001303","pf","Push in fit 1/4 - 8 elbow","–","Siku 90°, ulir R1/4, untuk selang Ø8 mm","1/4-8"],
  ["2001440","sc","Socket cap screw STH M10 × 60 PRFL","–","Baut L kepala silinder (STH), M10 pitch 1,5, panjang 60 mm, ulir sebagian (PRFL); dibaca dari pola deskripsi BOM","M10x60"],
  ["2001441","sc","Screw M10 × 20","–","Ulir M10, panjang 20 mm","M10x20"],
  ["2001442","sc","Screw M6 × 35","–","Ulir M6, panjang 35 mm","M6x35"],
  ["2001460","gr","Spur gear MC nylon M2,5 26W 30D","–","Bahan MC nylon, modul 2,5, lebar gigi 26 mm, 30D (jumlah gigi / diameter, perlu dicek)","M2.5"],
  ["2001202","sk","Sprocket RS40 28T 1R B SS41","–","Rantai RS40 (pitch 1/2\" = 12,7 mm), 28 gigi, 1 baris, tipe B (hub satu sisi), baja SS41","RS40-28"],
  ["2001480","dw","Drawing DWG 02.08 HL Gear Set","Workshop (drawing)","Gear set sesuai gambar DWG 02.08; dibuat atas request user","DWG0208"],
  // contoh dari BOM Folding Facial 26 (export SAP 27 Okt 2026); no material fiktif, nama & spesifikasi mengikuti deskripsi BOM
  ["2005001","pb","Bearing UK211","FYH","Insert bearing lubang tirus, dipasang dengan adapter H2311 (poros 50 mm)","UK211"],
  ["2005002","kn","Cutter knife SKD11 2T 35W 2920L UP","–","Bahan SKD11, tebal 2 mm, lebar 35 mm, panjang 2.920 mm, posisi atas","2920UP"],
  ["2005003","bb","Bearing 6006-2Z-C3","SKF","30 × 55 × 13 mm, tutup besi 2 sisi, clearance C3","6006"],
  ["2005004","bb","Bearing 6004-2Z","SKF","20 × 42 × 12 mm, tutup besi 2 sisi","6004"],
  ["2005005","kn","Cutter knife SKH9 6.5T 18.5W 1462L LOW L","–","Bahan SKH9, tebal 6,5 mm, lebar 18,5 mm, panjang 1.462 mm, bawah kiri","1462L"],
  ["2005006","kn","Cutter knife SKH9 6.5T 18.5W 1462L LOW R","–","Bahan SKH9, tebal 6,5 mm, lebar 18,5 mm, panjang 1.462 mm, bawah kanan","1462R"],
  ["2005007","gs","Grease Berulit WR 400","BECHEM","Grease bearing, satuan kg","WR400"],
  ["2005008","dw","DWG.180801 Adjuster knife","Workshop (drawing)","Penyetel pisau sesuai gambar 180801","180801"],
  ["2005009","dw","DWG.180802 Adjuster bolt","Workshop (drawing)","Baut penyetel sesuai gambar 180802","180802"],
  ["2005010","ad","Bearing adapter H311","SKF","Adapter sleeve + lock nut untuk poros 50 mm","H311"],
  ["2005011","bb","Bearing 6216-2Z","SKF","80 × 140 × 26 mm, tutup besi 2 sisi","6216"],
  ["2005012","tb","Timing belt 3850-14M-55","–","Profil 14M, panjang 3.850 mm, lebar 55 mm, karet NBR","14M3850"],
  ["2005013","vb","V-belt B146","–","Penampang B (17 mm), panjang dalam 146 inci","B146"],
  ["2005014","kn","Slitter knife SKH9 1.5T 50ID 110OD","–","Bahan SKH9, tebal 1,5 mm, Ø dalam 50 mm, Ø luar 110 mm, tinggi 60","110OD"],
  ["2005015","bb","Bearing 22216","FAG","Spherical roller 80 × 140 × 33 mm (di SAP diarahkan ke no material pengganti)","22216"],
  ["2005016","pf","Push-in fit 6 mm 1/8\" lurus","–","Selang Ø6 mm, ulir luar 1/8\" BSPT, lurus","6-1/8"],
  ["2005017","cy","Pneumatic cylinder MCMA-11-16-25-N","MINDMAN","Ø16 mm, stroke 25 mm","MCMA16"],
  ["2005018","tu","Tube PU 4 ID × 6 OD","–","Selang polyurethane ID 4 / OD 6 mm, per meter","4x6"],
  ["2005019","tu","Tube PU 5 ID × 8 OD","–","Selang polyurethane ID 5 / OD 8 mm, per meter","5x8"],
  ["2005020","cb","Conveyor belt 40W 945L 4T","Habasit","Lebar 40 mm, panjang 945 mm, tebal 4 mm, endless, tipe SP330/40","40x945"],
  ["2005021","pb","Bearing UCFC210","FYH","Unit flange bulat, poros 50 mm","UCFC210"],
  ["2005022","sc","Hex bolt M10 × 50 + mur","–","M10 pitch 1,5, panjang 50 mm, S45C, ulir penuh, dengan mur","M10x50"],
  ["2005023","vb","V-belt SPB3750","–","Penampang SPB, panjang 3.750 mm","SPB3750"],
  ["2005024","or","O-ring 20 × 25 × 2,5","–","Karet, ID 20 mm, OD 25 mm, tebal 2,5 mm","20x25"],
  ["2005025","sr","Snap ring H-type 30 mm","–","Internal (untuk lubang Ø30), baja","H30"],
  ["2005026","sr","Snap ring S-type 30 mm","–","External (untuk poros Ø30), baja","S30"],
  ["2005027","sc","Socket cap screw STH M8 × 30 FRFL","–","M8 pitch 1,5, panjang 30 mm, SS41, black oxide, ulir penuh","M8x30"],
  ["2005028","re","Rod end PHS-16A","IKO","Rod end ulir dalam (female) M16, lubang 16 mm","PHS16"],
  ["2005029","pb","Bearing SER207","ASAHI","Insert bearing dengan set screw, poros 35 mm","SER207"],
  ["2005030","sc","Socket cap screw STH M10 × 80 PRFL","–","M10 pitch 1,5, panjang 80 mm, SS41, ulir sebagian","M10x80"],
  ["2005031","bb","Bearing 6205-2Z-C3","SKF","25 × 52 × 15 mm, tutup besi 2 sisi, clearance C3","6205"],
  ["2005032","dw","DWG.3320 V pulley B","Workshop (drawing)","Pulley V-belt penampang B, besi cor (FC)","3320"],
  ["2005033","sv","Solenoid valve MVSC-260-4E1 AC220","MINDMAN","5/2, coil 220 VAC","MVSC260"],
  ["2005034","tb","Timing belt 1184-8M-25","–","Profil 8M, panjang 1.184 mm, lebar 25 mm, karet NBR","8M1184"],
  ["2005035","gb","Gearbox HMW-50-10 i=10","LIMING","Worm gearbox rasio 1:10","HMW50"],
  ["2005036","dw","DWG.3921 Bushing folding","Workshop (drawing)","Bushing unit folding sesuai gambar 3921","3921"],
  ["2005037","bb","Bearing 6006-ZZ-C3","TIMKEN","30 × 55 × 13 mm, tutup besi 2 sisi, clearance C3","6006"],
  ["2005038","rg","Air regulator 1/4\" R07-200-RNKB","NORGREN","Regulator tekanan udara, port 1/4\"","R07"],
  ["2005039","bb","Bearing 6201-ZZ","TIMKEN","12 × 32 × 10 mm, tutup besi 2 sisi","6201"],
  ["2005040","bb","Bearing 6205-ZZ-C3","TIMKEN","25 × 52 × 15 mm, tutup besi 2 sisi, clearance C3","6205"],
  ["2005041","pf","Push-in fit 10 mm 3/8\" elbow","–","Siku 90°, selang Ø10 mm, ulir 3/8\"","10-3/8"],
  ["2005042","rg","Flow control LRLL-3/8-QS-10","FESTO","Port 3/8\", selang 10 mm","LRLL"],
  ["2005043","bb","Bearing 6905-ZZ","NIS","25 × 42 × 9 mm, seri tipis, tutup besi 2 sisi","6905"],
  ["2005044","cy","Pneumatic cylinder U-100-50-CA","DYNEX","Ø100 mm, stroke 50 mm","U100"],
  ["2005045","dw","DWG.3024 Side embos 108D","Workshop (drawing)","Side emboss Ø108 sesuai gambar 3024","3024"],
  ["2005046","kn","Cutter knife SKH9 6.5T 18W 2908L LOW","–","Bahan SKH9, tebal 6,5 mm, lebar 18 mm, panjang 2.908 mm, bawah","2908"],
  ["2005047","dw","DWG.26B2 Finger folding","Workshop (drawing)","Jari folding sesuai gambar 26B2","26B2"],
  ["2005048","pb","Bearing UC210","SKF","Insert bearing dengan set screw, poros 50 mm","UC210"],
  ["2005049","cy","Pneumatic cylinder DSNU-16-25-P-A","FESTO","Ø16 mm, stroke 25 mm","DSNU16"]
];
var UNIT26 = {"2005001": "pcs", "2005002": "pcs", "2005003": "pcs", "2005004": "pcs", "2005005": "pcs", "2005006": "pcs", "2005007": "kg", "2005008": "pcs", "2005009": "pcs", "2005010": "pcs", "2005011": "pcs", "2005012": "pcs", "2005013": "pcs", "2005014": "pcs", "2005015": "pcs", "2005016": "pcs", "2005017": "pcs", "2005018": "m", "2005019": "m", "2005020": "pcs", "2005021": "pcs", "2005022": "set", "2005023": "pcs", "2005024": "pcs", "2005025": "pcs", "2005026": "pcs", "2005027": "pcs", "2005028": "pcs", "2005029": "pcs", "2005030": "pcs", "2005031": "pcs", "2005032": "pcs", "2005033": "pcs", "2005034": "pcs", "2005035": "unit", "2005036": "pcs", "2005037": "pcs", "2005038": "pcs", "2005039": "pcs", "2005040": "pcs", "2005041": "pcs", "2005042": "pcs", "2005043": "pcs", "2005044": "pcs", "2005045": "pcs", "2005046": "pcs", "2005047": "pcs", "2005048": "pcs", "2005049": "pcs"};
var ITEMS = [], ITEM_BY = {};
(function(){
  var seed = 7; function rnd(){ seed = (seed*1103515245+12345)%2147483648; return seed/2147483648; }
  ITEMS_SRC.forEach(function(r, i){
    var st = rnd(), status = st<0.55 ? "VM" : (st<0.85 ? "VB" : "S1");
    var it = { mat:r[0], fam:r[1], name:r[2], brand:r[3], spec:r[4], key:r[5], status:status,
      bin:"R"+String(1+Math.floor(i/6)).padStart(2,"0")+"-"+"ABCD"[Math.floor(rnd()*4)]+(1+Math.floor(rnd()*6)),
      stock0: status==="S1" ? 0 : (rnd()<0.12 ? 0 : 1+Math.floor(rnd()*(r[1]==="kn"||r[1]==="mt" ? 4 : 18))),
      unit: UNIT26[r[0]] || (r[1]==="ch" ? "rol" : "pcs") };
    if(r[0]==="2001041") { it.stock0 = 6; it.status = "VM"; }
    if(r[0]==="2001007") { it.stock0 = 4; it.status = "VM"; }
    if(r[0]==="2001012") { it.stock0 = 5; it.status = "VB"; }
    if(r[0]==="2001061") { it.stock0 = 2; it.status = "VB"; }
    if(r[0]==="2001006") { it.stock0 = 0; it.status = "VM"; }
    if(r[0]==="2001003") { it.stock0 = 7; it.status = "VM"; }
    if(r[0]==="2001040") { it.stock0 = 3; it.status = "VM"; }
    if(r[0]==="2001042") { it.stock0 = 2; it.status = "VB"; }
    var LAP = { "2001004":[8,"VM"], "2001014":[6,"VM"], "2001015":[4,"VB"], "2001380":[12,"VM"], "2001400":[3,"VB"], "2001420":[2,"VB"], "2001123":[5,"VM"], "2001302":[40,"VM"], "2001303":[35,"VM"], "2001440":[20,"VM"], "2001441":[50,"VM"], "2001442":[60,"VM"], "2001460":[2,"VB"], "2001202":[3,"VB"], "2001480":[0,"S1"] };
    if(LAP[r[0]]){ it.stock0 = LAP[r[0]][0]; it.status = LAP[r[0]][1]; it.lap = true; }
    ITEMS.push(it); ITEM_BY[it.mat] = it;
  });
})();
function item(mat){ return ITEM_BY[mat] || null; }

/* ================= history pemakaian per mesin & bagian (contoh, seperti ZM148 / MB51) ================= */
function seedHistory(){
  var seed = 11; function rnd(){ seed = (seed*1103515245+12345)%2147483648; return seed/2147483648; }
  var h = [], t = todayStr(), must = { "2001041":1, "2001007":1, "2001012":1, "2001061":1 };
  SECTIONS.forEach(function(sc){
    sc.bom.forEach(function(b, k){
      if(!(must[b.mat] || rnd()<0.6)) return;
      var n = 1+Math.floor(rnd()*3), d = -(8+Math.floor(rnd()*70)+k*7);
      for(var i=0;i<n;i++){ h.push({ m:sc.m, s:sc.code, mat:b.mat, d:addDays(t, d), q:1+(rnd()<0.2 ? 1 : 0), by:"seed" }); d -= 40+Math.floor(rnd()*140); }
    });
  });
  return h;
}

/* ================= state ================= */
var S = { stock:{}, hist:[], seq:0, v:4 }, ORDERS = [], PHOTOS = {};   // PHOTOS: mat -> [dataURL] (foto tambahan dari master data)
function resetState(){ S = { stock:{}, hist:seedHistory(), seq:0, v:4 }; ITEMS.forEach(function(it){ S.stock[it.mat] = it.stock0; }); ORDERS = []; PHOTOS = {}; }
function stockOf(mat){ var s = S.stock[mat]; return s==null ? 0 : s; }
// stok yang sudah dipesan tapi belum diserahkan
function reservedOf(mat){ var n = 0; ORDERS.forEach(function(o){ if(o.status==="selesai" || o.status==="batal") return; o.items.forEach(function(x){ if(x.mat===mat && !x.res) n += x.q; }); }); return n; }
function photosOf(mat){ return (BASE_PHOTOS[mat]||[]).concat(PHOTOS[mat]||[]); }
function lastUse(machine, mat, code){ var best = null; S.hist.forEach(function(h){ if(h.m===machine && h.mat===mat && (!code || h.s===code) && (!best || h.d>best.d)) best = h; }); return best; }
function machineHistory(machine){
  var by = {};
  S.hist.forEach(function(h){ if(h.m!==machine) return; var x = by[h.mat] || (by[h.mat] = { mat:h.mat, n:0, q:0, last:"" }); x.n++; x.q += h.q; if(h.d>x.last) x.last = h.d; });
  return Object.keys(by).map(function(k){ return by[k]; }).sort(function(a, b){ return a.last<b.last ? 1 : -1; });
}
function usedOn(mat){ var r = {}; S.hist.forEach(function(h){ if(h.mat===mat){ if(!r[h.m] || h.d>r[h.m]) r[h.m] = h.d; } }); return r; }

/* ================= pencarian teks ================= */
function norm(s){ return String(s||"").toLowerCase().replace(/[×x]/g,"x").replace(/[^a-z0-9.,x ]+/g," ").replace(/\s+/g," ").trim(); }
function searchText(q, machine){
  q = norm(q); if(!q) return [];
  var words = q.split(" ");
  var out = [];
  ITEMS.forEach(function(it){
    var f = famById(it.fam), hay = norm([it.mat, it.name, it.brand, it.spec, it.key, f.name, it.bin].join(" ")), hayc = hay.replace(/\s/g,"");
    var sc = 0, ok = true;
    words.forEach(function(w){ if(hay.indexOf(w)>=0) sc += w.length; else if(hayc.indexOf(w.replace(/\s/g,""))>=0) sc += w.length*0.8; else ok = false; });
    if(!ok) return;
    if(it.mat===q) sc += 50;
    if(machine && inBom(machine, null, it.mat)) sc += 15;
    if(machine && lastUse(machine, it.mat)) sc += 20;
    out.push({ it:it, score:sc });
  });
  out.sort(function(a, b){ return b.score-a.score; });
  return out.map(function(x){ return x.it; });
}
// urutan kandidat: ada di BOM bagian ini, lalu BOM mesin ini, lalu pernah dipakai, lalu kemiripan foto, lalu stok
function rankFamily(famIds, machine, photoSim, code){
  var list = ITEMS.filter(function(it){ return famIds.indexOf(it.fam)>=0; });
  function tier(it){ if(!machine) return 3; if(code && inBom(machine, code, it.mat)) return 0; if(inBom(machine, null, it.mat)) return 1; if(lastUse(machine, it.mat)) return 2; return 3; }
  // ada hasil foto: kemiripan foto tetap paling berpengaruh, BOM / history jadi tambahan nilai
  function score(it){ var p = (photoSim && photoSim[it.mat]) || 0, t = tier(it); return p + (t===0 ? 0.25 : t===1 ? 0.12 : t===2 ? 0.06 : 0); }
  var hasPhoto = photoSim && Object.keys(photoSim).length;
  list.sort(function(a, b){
    if(hasPhoto){ var sa = score(a), sb = score(b); if(Math.abs(sa-sb)>0.005) return sb-sa; }
    var ta = tier(a), tb = tier(b); if(ta!==tb) return ta-tb;
    var ua = machine && lastUse(machine, a.mat, code), ub = machine && lastUse(machine, b.mat, code);
    if(!!ua!==!!ub) return ua ? -1 : 1;
    if(ua && ub && ua.d!==ub.d) return ua.d<ub.d ? 1 : -1;
    var pa = (photoSim && photoSim[a.mat]) || 0, pb = (photoSim && photoSim[b.mat]) || 0;
    if(Math.abs(pa-pb)>0.005) return pb-pa;
    var fa = famIds.indexOf(a.fam), fb = famIds.indexOf(b.fam); if(fa!==fb) return fa-fb;
    return (stockOf(b.mat)>0) - (stockOf(a.mat)>0) || a.name.localeCompare(b.name);
  });
  return list;
}

/* ================= order ================= */
function newOrder(o){
  S.seq++;
  var ord = { id:"SPO-"+todayStr().slice(5).replace("-","")+"-"+String(S.seq).padStart(3,"0"), ts:Date.now(), name:o.name, machine:o.machine, sec:o.sec||"", note:o.note||"", urgent:!!o.urgent,
    items:o.items.map(function(x){ return { mat:x.mat, q:x.q, cand:!!x.cand, res:null }; }), status:"baru", log:[{ t:Date.now(), s:"baru" }] };
  ORDERS.push(ord); return ord;
}
function orderById(id){ for(var i=0;i<ORDERS.length;i++) if(ORDERS[i].id===id) return ORDERS[i]; return null; }
function setOrderStatus(o, s){ o.status = s; o.log.push({ t:Date.now(), s:s }); }
// serah terima: barang yang cocok dipakai (stok berkurang, masuk history mesin), kandidat yang tidak cocok kembali ke rak
function closeOrder(o){
  o.items.forEach(function(x){
    if(x.res==="pakai"){ S.stock[x.mat] = Math.max(0, stockOf(x.mat)-x.q); S.hist.push({ m:o.machine, s:o.sec||"", mat:x.mat, d:todayStr(), q:x.q, by:o.id }); }
  });
  setOrderStatus(o, "selesai");
}
var STATUS_LBL = { baru:["Menunggu disiapkan","warn"], siapkan:["Sedang disiapkan","info"], siap:["Siap diambil","ok"], selesai:["Selesai","dim"], batal:["Dibatalkan","dim"] };

/* ================= gambar ilustrasi per keluarga (dipakai kalau belum ada foto) ================= */
function famSvg(fam, size){
  var s = size||64, c = "currentColor", g = "";
  switch(fam){
    case "bb": g = '<circle cx="32" cy="32" r="26" fill="none" stroke="'+c+'" stroke-width="5"/><circle cx="32" cy="32" r="12" fill="none" stroke="'+c+'" stroke-width="4"/>'+[0,1,2,3,4,5,6,7].map(function(i){ var a = i*Math.PI/4; return '<circle cx="'+(32+19*Math.cos(a)).toFixed(1)+'" cy="'+(32+19*Math.sin(a)).toFixed(1)+'" r="3.4" fill="'+c+'"/>'; }).join(""); break;
    case "re": g = '<circle cx="32" cy="20" r="15" fill="none" stroke="'+c+'" stroke-width="4"/><circle cx="32" cy="20" r="6" fill="none" stroke="'+c+'" stroke-width="3"/><rect x="27" y="34" width="10" height="26" fill="none" stroke="'+c+'" stroke-width="3"/>'+[38,43,48,53].map(function(y){ return '<line x1="27" y1="'+y+'" x2="37" y2="'+(y+3)+'" stroke="'+c+'" stroke-width="1.6"/>'; }).join(""); break;
    case "pot": g = '<rect x="12" y="22" width="40" height="26" rx="4" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="29" y="6" width="6" height="16" fill="'+c+'"/><line x1="20" y1="48" x2="20" y2="58" stroke="'+c+'" stroke-width="3"/><line x1="32" y1="48" x2="32" y2="58" stroke="'+c+'" stroke-width="3"/><line x1="44" y1="48" x2="44" y2="58" stroke="'+c+'" stroke-width="3"/>'; break;
    case "pb": g = '<path d="M8 50 H56 V44 H46 A16 16 0 1 0 18 44 H8 Z" fill="none" stroke="'+c+'" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="30" r="7" fill="none" stroke="'+c+'" stroke-width="3"/>'; break;
    case "vb": g = '<rect x="6" y="14" width="52" height="36" rx="18" fill="none" stroke="'+c+'" stroke-width="7"/>'; break;
    case "tb": g = '<rect x="6" y="14" width="52" height="36" rx="18" fill="none" stroke="'+c+'" stroke-width="4"/>'+[14,20,26,32,38,44,50].map(function(x){ return '<rect x="'+(x-1.5)+'" y="17" width="3" height="4" fill="'+c+'"/><rect x="'+(x-1.5)+'" y="43" width="3" height="4" fill="'+c+'"/>'; }).join(""); break;
    case "os": g = '<circle cx="32" cy="32" r="24" fill="none" stroke="'+c+'" stroke-width="8"/><circle cx="32" cy="32" r="13" fill="none" stroke="'+c+'" stroke-width="2"/>'; break;
    case "or": g = '<circle cx="32" cy="32" r="22" fill="none" stroke="'+c+'" stroke-width="5"/>'; break;
    case "ch": g = [0,1,2].map(function(i){ return '<rect x="'+(4+i*19)+'" y="22" width="22" height="20" rx="10" fill="none" stroke="'+c+'" stroke-width="3.5"/><circle cx="'+(15+i*19)+'" cy="32" r="3" fill="'+c+'"/>'; }).join(""); break;
    case "sk": g = '<circle cx="32" cy="32" r="20" fill="none" stroke="'+c+'" stroke-width="5"/><circle cx="32" cy="32" r="6" fill="none" stroke="'+c+'" stroke-width="3"/>'+[0,1,2,3,4,5,6,7,8,9,10,11].map(function(i){ var a = i*Math.PI/6; return '<circle cx="'+(32+25*Math.cos(a)).toFixed(1)+'" cy="'+(32+25*Math.sin(a)).toFixed(1)+'" r="3" fill="'+c+'"/>'; }).join(""); break;
    case "cp": g = '<rect x="6" y="20" width="22" height="24" rx="3" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="36" y="20" width="22" height="24" rx="3" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="28" y="24" width="8" height="16" fill="'+c+'"/>'; break;
    case "kn": g = '<circle cx="32" cy="32" r="24" fill="none" stroke="'+c+'" stroke-width="3"/>'+[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(function(i){ var a = i*Math.PI/8, b = a+0.2; return '<line x1="'+(32+24*Math.cos(a)).toFixed(1)+'" y1="'+(32+24*Math.sin(a)).toFixed(1)+'" x2="'+(32+29*Math.cos(b)).toFixed(1)+'" y2="'+(32+29*Math.sin(b)).toFixed(1)+'" stroke="'+c+'" stroke-width="2.4"/>'; }).join("")+'<circle cx="32" cy="32" r="7" fill="none" stroke="'+c+'" stroke-width="3"/>'; break;
    case "sv": g = '<rect x="8" y="34" width="48" height="18" rx="2" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="22" y="10" width="20" height="24" rx="2" fill="none" stroke="'+c+'" stroke-width="4"/><circle cx="16" cy="43" r="3" fill="'+c+'"/><circle cx="48" cy="43" r="3" fill="'+c+'"/>'; break;
    case "cy": g = '<rect x="6" y="22" width="36" height="20" rx="3" fill="none" stroke="'+c+'" stroke-width="4"/><line x1="42" y1="32" x2="60" y2="32" stroke="'+c+'" stroke-width="4"/><rect x="10" y="18" width="5" height="4" fill="'+c+'"/><rect x="32" y="18" width="5" height="4" fill="'+c+'"/>'; break;
    case "pf": g = '<rect x="22" y="6" width="20" height="16" rx="3" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="26" y="22" width="12" height="14" fill="none" stroke="'+c+'" stroke-width="3"/>'+[38,44,50].map(function(y){ return '<line x1="26" y1="'+y+'" x2="38" y2="'+(y+3)+'" stroke="'+c+'" stroke-width="2"/>'; }).join("")+'<rect x="26" y="36" width="12" height="20" fill="none" stroke="'+c+'" stroke-width="3"/>'; break;
    case "px": g = '<rect x="20" y="6" width="24" height="40" rx="2" fill="none" stroke="'+c+'" stroke-width="4"/>'+[14,20,26,32,38].map(function(y){ return '<line x1="20" y1="'+y+'" x2="44" y2="'+(y+2)+'" stroke="'+c+'" stroke-width="1.6"/>'; }).join("")+'<path d="M32 46 C32 54 44 56 52 60" fill="none" stroke="'+c+'" stroke-width="3"/>'; break;
    case "mt": g = '<rect x="8" y="16" width="36" height="32" rx="6" fill="none" stroke="'+c+'" stroke-width="4"/><line x1="44" y1="32" x2="58" y2="32" stroke="'+c+'" stroke-width="5"/>'+[22,28,34,40].map(function(y){ return '<line x1="12" y1="'+y+'" x2="40" y2="'+y+'" stroke="'+c+'" stroke-width="1.6"/>'; }).join("")+'<rect x="12" y="48" width="28" height="6" fill="'+c+'"/>'; break;
    case "kt": g = '<rect x="12" y="8" width="40" height="48" rx="3" fill="none" stroke="'+c+'" stroke-width="4"/>'+[20,32,44].map(function(x){ return '<circle cx="'+x+'" cy="16" r="3" fill="'+c+'"/><circle cx="'+x+'" cy="48" r="3" fill="'+c+'"/>'; }).join("")+'<rect x="22" y="26" width="20" height="12" fill="none" stroke="'+c+'" stroke-width="3"/>'; break;
    case "hc": g = '<circle cx="32" cy="34" r="20" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="22" y="6" width="20" height="10" rx="2" fill="none" stroke="'+c+'" stroke-width="3"/><line x1="26" y1="11" x2="38" y2="11" stroke="'+c+'" stroke-width="2"/>'+[0,1,2,3,4,5].map(function(i){ var a = 1.2+i*0.55; return '<line x1="'+(32+16*Math.cos(a)).toFixed(1)+'" y1="'+(34+16*Math.sin(a)).toFixed(1)+'" x2="'+(32+19*Math.cos(a)).toFixed(1)+'" y2="'+(34+19*Math.sin(a)).toFixed(1)+'" stroke="'+c+'" stroke-width="1.6"/>'; }).join(""); break;
    case "sb": g = '<rect x="4" y="22" width="56" height="20" rx="10" fill="none" stroke="'+c+'" stroke-width="3"/><rect x="10" y="27" width="44" height="10" rx="5" fill="none" stroke="'+c+'" stroke-width="1.5" stroke-dasharray="3 2"/>'; break;
    case "cb": g = '<rect x="4" y="18" width="56" height="28" rx="14" fill="none" stroke="'+c+'" stroke-width="4"/><circle cx="18" cy="32" r="6" fill="none" stroke="'+c+'" stroke-width="2.5"/><circle cx="46" cy="32" r="6" fill="none" stroke="'+c+'" stroke-width="2.5"/>'; break;
    case "sc": g = '<rect x="22" y="6" width="20" height="12" rx="2" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="27" y="18" width="10" height="40" fill="none" stroke="'+c+'" stroke-width="3"/>'+[24,30,36,42,48].map(function(y){ return '<line x1="27" y1="'+y+'" x2="37" y2="'+(y+3)+'" stroke="'+c+'" stroke-width="1.6"/>'; }).join(""); break;
    case "gr": g = '<circle cx="32" cy="32" r="18" fill="none" stroke="'+c+'" stroke-width="4"/><circle cx="32" cy="32" r="6" fill="none" stroke="'+c+'" stroke-width="3"/>'+[0,1,2,3,4,5,6,7,8,9].map(function(i){ var a = i*Math.PI/5; return '<rect x="'+(32+21*Math.cos(a)-3).toFixed(1)+'" y="'+(32+21*Math.sin(a)-3).toFixed(1)+'" width="6" height="6" fill="'+c+'" transform="rotate('+(i*36)+' '+(32+21*Math.cos(a)).toFixed(1)+' '+(32+21*Math.sin(a)).toFixed(1)+')"/>'; }).join(""); break;
    case "dw": g = '<rect x="8" y="8" width="48" height="48" rx="3" fill="none" stroke="'+c+'" stroke-width="3"/><circle cx="26" cy="30" r="9" fill="none" stroke="'+c+'" stroke-width="2.5"/><line x1="26" y1="18" x2="26" y2="42" stroke="'+c+'" stroke-width="1" stroke-dasharray="2 2"/><line x1="14" y1="30" x2="38" y2="30" stroke="'+c+'" stroke-width="1" stroke-dasharray="2 2"/><line x1="40" y1="44" x2="52" y2="44" stroke="'+c+'" stroke-width="2"/><line x1="40" y1="49" x2="50" y2="49" stroke="'+c+'" stroke-width="2"/>'; break;
    case "ad": g = '<path d="M14 20 L50 24 L50 40 L14 44 Z" fill="none" stroke="'+c+'" stroke-width="3.5" stroke-linejoin="round"/><line x1="30" y1="22" x2="30" y2="42" stroke="'+c+'" stroke-width="2"/><rect x="50" y="18" width="8" height="28" rx="2" fill="none" stroke="'+c+'" stroke-width="3"/>'; break;
    case "gs": g = '<rect x="16" y="16" width="32" height="40" rx="4" fill="none" stroke="'+c+'" stroke-width="4"/><rect x="20" y="8" width="24" height="8" rx="2" fill="'+c+'"/><path d="M24 34 q8 -8 16 0 q-8 8 -16 0" fill="'+c+'"/>'; break;
    case "tu": g = [0,1,2].map(function(i){ return '<ellipse cx="32" cy="32" rx="'+(24-i*7)+'" ry="'+(16-i*4)+'" fill="none" stroke="'+c+'" stroke-width="3.5"/>'; }).join(""); break;
    case "sr": g = '<path d="M20 50 A20 20 0 1 1 44 50" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round"/><circle cx="18" cy="52" r="3.5" fill="none" stroke="'+c+'" stroke-width="2"/><circle cx="46" cy="52" r="3.5" fill="none" stroke="'+c+'" stroke-width="2"/>'; break;
    case "rg": g = '<rect x="22" y="28" width="20" height="26" rx="2" fill="none" stroke="'+c+'" stroke-width="4"/><circle cx="32" cy="16" r="10" fill="none" stroke="'+c+'" stroke-width="3.5"/><line x1="32" y1="16" x2="37" y2="11" stroke="'+c+'" stroke-width="2.5"/><line x1="8" y1="40" x2="22" y2="40" stroke="'+c+'" stroke-width="4"/><line x1="42" y1="40" x2="56" y2="40" stroke="'+c+'" stroke-width="4"/>'; break;
    case "gb": g = '<rect x="10" y="18" width="34" height="32" rx="4" fill="none" stroke="'+c+'" stroke-width="4"/><circle cx="27" cy="34" r="8" fill="none" stroke="'+c+'" stroke-width="3"/><line x1="44" y1="34" x2="58" y2="34" stroke="'+c+'" stroke-width="5"/><rect x="18" y="8" width="18" height="10" fill="none" stroke="'+c+'" stroke-width="3"/>'; break;
    default: g = '<rect x="10" y="10" width="44" height="44" rx="6" fill="none" stroke="'+c+'" stroke-width="4"/>';
  }
  return '<svg viewBox="0 0 64 64" width="'+s+'" height="'+s+'" aria-hidden="true">'+g+'</svg>';
}
function thumbHtml(it, cls){
  var ph = photosOf(it.mat);
  return ph.length ? '<img class="'+(cls||"thumb")+'" src="'+esc(ph[0])+'" alt="'+esc(it.name)+'" loading="lazy">' : '<span class="'+(cls||"thumb")+' ill" aria-hidden="true">'+famSvg(it.fam)+'</span>';
}

/* ================= simpan & sinkron (Firestore kalau online, localStorage kalau offline) ================= */
var IN_FRAME = true; try{ IN_FRAME = window.self !== window.top; }catch(e){ IN_FRAME = true; }
var LS_KEY = "sp-sim-v4";
var FB_CONFIG = { apiKey:"AIzaSyBBRo7tTq25VAaES42pEbTlH1_9jvhAm4Y", authDomain:"packaging-wms.firebaseapp.com", projectId:"packaging-wms", storageBucket:"packaging-wms.firebasestorage.app", messagingSenderId:"808365853689", appId:"1:808365853689:web:4171dfd98ce30776a40b28" };
var STORE = { mode:"local", state:"off", msg:"", db:null, synced:{ meta:"", orders:{}, photos:{} }, raw:{ meta:null, orders:{}, photos:{} }, ready:{}, onChange:null, booted:false };
function snapshotAll(){
  var o = { meta:JSON.stringify(S), orders:{}, photos:{} };
  ORDERS.forEach(function(x){ o.orders[x.id] = JSON.stringify(x); });
  Object.keys(PHOTOS).forEach(function(k){ if(PHOTOS[k] && PHOTOS[k].length) o.photos[k] = JSON.stringify(PHOTOS[k]); });
  return o;
}
function importAll(o){
  var m = JSON.parse(o.meta); if(!m || m.v!==4) throw new Error("versi");
  S = m;
  ORDERS = Object.keys(o.orders||{}).map(function(k){ return JSON.parse(o.orders[k]); }).sort(function(a, b){ return a.ts-b.ts; });
  PHOTOS = {}; Object.keys(o.photos||{}).forEach(function(k){ PHOTOS[k] = JSON.parse(o.photos[k]); });
}
function lsGet(){ try{ var j = localStorage.getItem(LS_KEY); return j ? JSON.parse(j) : null; }catch(e){ return null; } }
function lsSet(o){ try{ localStorage.setItem(LS_KEY, JSON.stringify(o)); }catch(e){} }
function saveState(){
  var snap = snapshotAll();
  if(STORE.mode!=="fb"){ lsSet(snap); STORE.synced = snap; return; }
  var db = STORE.db, b = db.batch(), n = 0;
  if(snap.meta!==STORE.synced.meta){ b.set(db.collection("sp_meta").doc("state"), { j:snap.meta, t:Date.now() }); n++; }
  Object.keys(snap.orders).forEach(function(k){ if(snap.orders[k]!==STORE.synced.orders[k]){ b.set(db.collection("sp_order").doc(k), { j:snap.orders[k], t:Date.now() }); n++; } });
  Object.keys(STORE.synced.orders).forEach(function(k){ if(!snap.orders[k]){ b.delete(db.collection("sp_order").doc(k)); n++; } });
  Object.keys(snap.photos).forEach(function(k){ if(snap.photos[k]!==STORE.synced.photos[k]){ b.set(db.collection("sp_photo").doc(k), { j:snap.photos[k], t:Date.now() }); n++; } });
  Object.keys(STORE.synced.photos).forEach(function(k){ if(!snap.photos[k]){ b.delete(db.collection("sp_photo").doc(k)); n++; } });
  STORE.synced = snap;
  if(n) b.commit().catch(function(e){ setStoreState("err", (e && (e.code||e.message)) || String(e)); });
}
function resetAll(){ resetState(); saveState(); }
function setStoreState(st, msg){ STORE.state = st; STORE.msg = msg||""; if(STORE.onChange) STORE.onChange("status"); }
function storeBadge(){
  var t = { on:["ok","Online · tersinkron"], wait:["warn","Menyambung…"], off:["","Offline · data di perangkat ini"], err:["crit","Offline · gagal tersambung"] }[STORE.state] || ["","Offline"];
  return '<span class="fbst '+t[0]+'" title="'+esc(STORE.msg||"")+'">'+t[1]+'</span>';
}
function bootLocal(){
  STORE.mode = "local";
  var o = lsGet();
  if(o && o.meta){ try{ importAll(o); STORE.synced = o; }catch(e){ resetAll(); } } else resetAll();
  window.addEventListener("storage", function(e){ if(e.key!==LS_KEY || !e.newValue) return; try{ var o2 = JSON.parse(e.newValue); importAll(o2); STORE.synced = o2; }catch(x){ return; } if(STORE.onChange) STORE.onChange("remote"); });
}
function fbRemote(){
  if(!(STORE.ready.m && STORE.ready.o && STORE.ready.p)) return;
  var raw = STORE.raw, bad = !raw.meta;
  try{ if(raw.meta && JSON.parse(raw.meta).v!==4) bad = true; }catch(e){ bad = true; }
  if(bad){ if(!STORE.booted){ STORE.booted = true; resetState(); saveState(); setStoreState("on"); if(STORE.onChange) STORE.onChange("remote"); } return; }
  var o = { meta:raw.meta, orders:raw.orders, photos:raw.photos };
  var same = o.meta===STORE.synced.meta && JSON.stringify(o.orders)===JSON.stringify(STORE.synced.orders) && JSON.stringify(o.photos)===JSON.stringify(STORE.synced.photos);
  STORE.booted = true;
  if(!same){ try{ importAll(o); STORE.synced = { meta:o.meta, orders:Object.assign({}, o.orders), photos:Object.assign({}, o.photos) }; }catch(e){} if(STORE.onChange) STORE.onChange("remote"); }
  if(STORE.state!=="on") setStoreState("on");
}
function initStore(onChange){
  STORE.onChange = onChange;
  bootLocal();
  if(IN_FRAME || !window.firebase || !window.firebase.initializeApp){ setStoreState("off"); return; }
  setStoreState("wait");
  try{
    if(!(window.firebase.apps && window.firebase.apps.length)) window.firebase.initializeApp(FB_CONFIG);
    window.firebase.auth().signInAnonymously().then(function(){
      STORE.db = window.firebase.firestore(); STORE.mode = "fb"; STORE.synced = { meta:"", orders:{}, photos:{} };
      function fail(e){ STORE.mode = "local"; setStoreState("err", (e && (e.code || e.message)) || String(e)); }
      STORE.db.collection("sp_meta").doc("state").onSnapshot(function(d){ STORE.raw.meta = d.exists ? d.data().j : null; STORE.ready.m = true; fbRemote(); }, fail);
      STORE.db.collection("sp_order").onSnapshot(function(snap){ var r = {}; snap.forEach(function(d){ r[d.id] = d.data().j; }); STORE.raw.orders = r; STORE.ready.o = true; fbRemote(); }, fail);
      STORE.db.collection("sp_photo").onSnapshot(function(snap){ var r = {}; snap.forEach(function(d){ r[d.id] = d.data().j; }); STORE.raw.photos = r; STORE.ready.p = true; fbRemote(); }, fail);
    }).catch(function(e){ var c = (e && e.code) || String(e); setStoreState("err", c==="auth/network-request-failed" ? "Tidak ada koneksi internet." : "Login anonim gagal ("+c+")."); });
  }catch(e){ setStoreState("err", String(e && e.message || e)); }
}

/* ================= CLIP: menebak keluarga barang dari foto (jalan di browser) ================= */
// Model: Xenova/clip-vit-base-patch32 (ONNX, kuantisasi 8-bit) lewat transformers.js. Di pratinjau Claude model tidak bisa diunduh -> mode simulasi.
var CLIP = { state:IN_FRAME ? "sim" : "off", msg:"", pct:0, T:null, proc:null, vis:null, famEmb:null, imgEmb:{}, listeners:[] };
var CLIP_MODEL = "Xenova/clip-vit-base-patch32";
var CLIP_LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js";
function clipNotify(){ CLIP.listeners.forEach(function(f){ try{ f(); }catch(e){} }); }
function l2(v){ var s = 0, i; for(i=0;i<v.length;i++) s += v[i]*v[i]; s = Math.sqrt(s)||1; var o = new Float32Array(v.length); for(i=0;i<v.length;i++) o[i] = v[i]/s; return o; }
function dot(a, b){ var s = 0; for(var i=0;i<a.length;i++) s += a[i]*b[i]; return s; }
function clipLoad(){
  if(CLIP.state==="ready" || CLIP.state==="loading") return CLIP.ready;
  if(IN_FRAME){ CLIP.state = "sim"; clipNotify(); return Promise.resolve(false); }
  CLIP.state = "loading"; CLIP.msg = "Memuat pustaka…"; CLIP.pct = 0; clipNotify();
  var files = {};
  function prog(p){ if(p && p.status==="progress" && p.file){ files[p.file] = [p.loaded||0, p.total||0]; var a = 0, b = 0; Object.keys(files).forEach(function(k){ a += files[k][0]; b += files[k][1]; }); CLIP.pct = b ? Math.round(a/b*100) : 0; CLIP.msg = "Mengunduh model CLIP "+CLIP.pct+"% ("+Math.round(b/1048576)+" MB, sekali saja)"; clipNotify(); } }
  CLIP.ready = import(CLIP_LIB).then(function(T){
    CLIP.T = T; T.env.allowLocalModels = false;
    var opt = { dtype:"q8", progress_callback:prog };
    return Promise.all([ T.AutoProcessor.from_pretrained(CLIP_MODEL), T.CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL, opt) ]);
  }).then(function(r){
    CLIP.proc = r[0]; CLIP.vis = r[1];
  }).then(function(){
    CLIP.msg = "Membaca foto katalog…"; clipNotify();
    return clipIndexCatalog();
  }).then(function(){ CLIP.state = "ready"; CLIP.msg = "CLIP siap · berjalan di perangkat ini"; clipNotify(); return true; })
  .catch(function(e){ console.error("CLIP", e); CLIP.state = "error"; CLIP.msg = "CLIP gagal dimuat ("+String(e && e.message || e).slice(0,120)+"). Pakai pencarian nama atau pilih keluarga barangnya."; clipNotify(); return false; });
  return CLIP.ready;
}
function clipEmbed(src){
  return CLIP.T.RawImage.read(src).then(function(img){ return CLIP.proc(img); }).then(function(inp){ return CLIP.vis(inp); }).then(function(out){ return l2(out.image_embeds.data); });
}
// embedding semua foto katalog (foto asli + foto unggahan); disimpan di memori per sumber foto
function clipIndexCatalog(){
  var jobs = [];
  ITEMS.forEach(function(it){ photosOf(it.mat).forEach(function(src){ if(!CLIP.imgEmb[src]) jobs.push(src); }); });
  var p = Promise.resolve();
  jobs.forEach(function(src, i){ p = p.then(function(){ CLIP.msg = "Membaca foto katalog "+(i+1)+"/"+jobs.length+"…"; clipNotify(); return clipEmbed(src).then(function(v){ CLIP.imgEmb[src] = v; }).catch(function(){}); }); });
  return p;
}
// hasil: { fams:[{id, p}], photo:{mat: kemiripan 0..1}, ms }
function clipSearch(src){
  var t0 = Date.now();
  return clipIndexCatalog().then(function(){ return clipEmbed(src); }).then(function(v){
    // hanya foto ke foto: bandingkan dengan semua foto katalog (cosine similarity)
    var photo = {}, famBest = {};
    ITEMS.forEach(function(it){ var best = 0; photosOf(it.mat).forEach(function(s){ var e = CLIP.imgEmb[s]; if(e){ var c = dot(v, e); if(c>best) best = c; } }); if(best){ photo[it.mat] = best; if(!(famBest[it.fam]>best)) famBest[it.fam] = best; } });
    // keluarga = foto katalog terdekat per keluarga, diubah jadi persen dengan softmax (hanya keluarga yang punya foto)
    var ks = Object.keys(famBest), mx = Math.max.apply(null, ks.map(function(k){ return famBest[k]; }));
    var fams = ks.map(function(k){ return { id:k, p:Math.exp(50*(famBest[k]-mx)) }; }), tot = fams.reduce(function(a, b){ return a+b.p; }, 0);
    fams.forEach(function(f){ f.p /= tot; });
    fams.sort(function(a, b){ return b.p-a.p; });
    return { fams:fams, photo:photo, ms:Date.now()-t0, real:true };
  });
}
// simulasi untuk pratinjau: hasil yang sudah ditentukan untuk contoh foto
function simSearch(shot){
  var fams = FAMS.map(function(f){ return { id:f.id, p:shot.sim[f.id] || 0.003 }; }), tot = fams.reduce(function(a, b){ return a+b.p; }, 0);
  fams.forEach(function(f){ f.p /= tot; }); fams.sort(function(a, b){ return b.p-a.p; });
  var photo = {}; photo[shot.near] = 0.91;
  ITEMS.forEach(function(it){ if(it.fam===item(shot.near).fam && it.mat!==shot.near && photosOf(it.mat).length) photo[it.mat] = 0.78; });
  return { fams:fams, photo:photo, ms:0, real:false };
}
// kecilkan foto unggahan (master data / mekanik) supaya ringan disimpan
function shrinkImage(file, max, q){
  return new Promise(function(res, rej){
    var fr = new FileReader();
    fr.onload = function(){ var img = new Image(); img.onload = function(){ var k = Math.min(1, (max||420)/Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", q||0.78)); }; img.onerror = rej; img.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
