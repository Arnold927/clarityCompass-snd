module.exports=[59934,a=>{"use strict";var b=a.i(45056);let c=0,d=new Map,e=[],f={toasts:[]};function g(a){f=((a,b)=>{switch(b.type){case"ADD_TOAST":return{...a,toasts:[b.toast,...a.toasts].slice(0,1)};case"UPDATE_TOAST":return{...a,toasts:a.toasts.map(a=>a.id===b.toast.id?{...a,...b.toast}:a)};case"DISMISS_TOAST":{let{toastId:c}=b;return c&&d.set(c,setTimeout(()=>{d.delete(c),g({type:"REMOVE_TOAST",toastId:c})},1e6)),{...a,toasts:a.toasts.map(a=>a.id===c?{...a,open:!1}:a)}}case"REMOVE_TOAST":return b.toastId&&d.delete(b.toastId),{...a,toasts:a.toasts.filter(a=>a.id!==b.toastId)}}})(f,a),e.forEach(a=>{a(f)})}function h({...a}){let b=(c=(c+1)%Number.MAX_SAFE_INTEGER).toString(),d=()=>g({type:"DISMISS_TOAST",toastId:b});return g({type:"ADD_TOAST",toast:{...a,id:b,open:!0,onOpenChange:a=>{a||d()}}}),{id:b,dismiss:d,update:a=>g({type:"UPDATE_TOAST",toast:{...a,id:b}})}}a.s(["useToast",0,function(){let[a,c]=b.useState(f);return b.useEffect(()=>(e.push(c),()=>{let a=e.indexOf(c);a>-1&&e.splice(a,1)}),[a]),{...a,toast:h,dismiss:a=>g({type:"DISMISS_TOAST",toastId:a})}}])},89292,a=>{"use strict";let b=(0,a.i(31261).default)("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);a.s(["Home",0,b],89292)},83979,a=>{"use strict";let b=(0,a.i(31261).default)("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);a.s(["default",0,b])},78807,a=>{"use strict";let b=(0,a.i(31261).default)("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);a.s(["Clock",0,b],78807)},51600,a=>{"use strict";let b=(0,a.i(31261).default)("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);a.s(["RefreshCw",0,b],51600)},58320,a=>{"use strict";let b=(0,a.i(31261).default)("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);a.s(["default",0,b])},90869,a=>{"use strict";let b=(0,a.i(31261).default)("ArrowUpDown",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);a.s(["ArrowUpDown",0,b],90869)},21138,a=>{"use strict";let b=(0,a.i(31261).default)("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);a.s(["Pencil",0,b],21138)},62157,81781,a=>{"use strict";var b=a.i(31261);let c=(0,b.default)("CircleChevronRight",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m10 8 4 4-4 4",key:"1wy4r4"}]]);a.s(["ChevronRightCircle",0,c],62157);var d=a.i(57850),e=a.i(45056),f=a.i(20283);let g=(0,b.default)("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]),h=(0,b.default)("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);var i=a.i(90869);a.s(["SortableTableHead",0,function({label:a,sortKey:b,activeKey:c,direction:e,onSort:j,className:k}){let l=c===b;return(0,d.jsx)(f.TableHead,{className:k,children:(0,d.jsxs)("button",{type:"button",onClick:()=>j(b),className:"flex items-center gap-1 hover:text-foreground transition-colors","aria-label":`Sort by ${a}${l?"asc"===e?", currently ascending":", currently descending":""}`,children:[a,l?"asc"===e?(0,d.jsx)(g,{className:"h-3 w-3"}):(0,d.jsx)(h,{className:"h-3 w-3"}):(0,d.jsx)(i.ArrowUpDown,{className:"h-3 w-3 opacity-30"})]})})},"useSortableData",0,function(a,b=null,c="asc"){let[d,f]=(0,e.useState)(b),[g,h]=(0,e.useState)(c);return{sortedItems:(0,e.useMemo)(()=>{if(!d)return a;let b=a.map((a,b)=>({item:a,index:b}));return b.sort((a,b)=>{let c,e=a.item[d],f=b.item[d],h=null==e||""===e,i=null==f||""===f;return h&&i?a.index-b.index:h?1:i?-1:0===(c="number"==typeof e&&"number"==typeof f?e-f:String(e).localeCompare(String(f)))?a.index-b.index:"asc"===g?c:-c}),b.map(a=>a.item)},[a,d,g]),sortKey:d,direction:g,requestSort:a=>{d===a?h(a=>"asc"===a?"desc":"asc"):(f(a),h("asc"))}}}],81781)},49174,21665,a=>{"use strict";var b=a.i(57850),c=a.i(45056),d=a.i(2979),e=a.i(5273),f=a.i(37897);a.s(["PaginationControls",0,function({page:a,totalPages:c,totalItems:g,pageSize:h,onPrev:i,onNext:j,onPage:k,itemLabel:l="items"}){if(c<=1)return null;let m=Math.min(a*h,g),n=[],o=Math.max(1,a-2),p=Math.min(c,o+4);o=Math.max(1,p-4);for(let a=o;a<=p;a++)n.push(a);return(0,b.jsxs)("div",{className:"flex items-center justify-between flex-wrap gap-2 mt-3 text-sm",children:[(0,b.jsxs)("span",{className:"text-muted-foreground text-xs",children:["Showing ",(a-1)*h+1,"–",m," of ",g," ",l]}),(0,b.jsxs)("div",{className:"flex items-center gap-1",children:[(0,b.jsx)(d.Button,{size:"icon",variant:"outline",disabled:a<=1,onClick:i,"aria-label":"Previous page",title:"Previous page",children:(0,b.jsx)(e.ChevronLeft,{className:"h-4 w-4"})}),n.map(c=>(0,b.jsx)(d.Button,{size:"icon",variant:c===a?"default":"outline",style:c===a?{backgroundColor:"#C8793A",color:"white"}:void 0,onClick:()=>k(c),"aria-label":`Page ${c}`,"aria-current":c===a?"page":void 0,children:c},c)),(0,b.jsx)(d.Button,{size:"icon",variant:"outline",disabled:a>=c,onClick:j,"aria-label":"Next page",title:"Next page",children:(0,b.jsx)(f.ChevronRight,{className:"h-4 w-4"})})]})]})},"usePagination",0,function(a,b=10){let[d,e]=(0,c.useState)(1),f=Math.max(1,Math.ceil(a.length/b));return(0,c.useEffect)(()=>{d>f&&e(f)},[d,f]),{pageItems:(0,c.useMemo)(()=>{let c=(d-1)*b;return a.slice(c,c+b)},[a,d,b]),page:Math.min(d,f),totalPages:f,totalItems:a.length,setPage:e,nextPage:()=>e(a=>Math.min(a+1,f)),prevPage:()=>e(a=>Math.max(a-1,1))}}],49174);var g=a.i(78184),h=a.i(44932),i=a.i(37637);a.s(["TableFilterBar",0,function({search:a,onSearchChange:c,searchPlaceholder:d="Search...",searchLabel:e="Search",statusOptions:f,statusValue:j,onStatusChange:k,statusLabel:l="Status",extra:m}){return(0,b.jsxs)("div",{className:"flex flex-wrap items-end gap-3 mb-3",children:[(0,b.jsxs)("div",{className:"relative flex-1 min-w-[180px] max-w-xs",children:[(0,b.jsx)(i.Search,{className:"absolute left-2.5 top-[calc(50%+2px)] -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"}),(0,b.jsx)(g.Input,{value:a,onChange:a=>c(a.target.value),placeholder:d,"aria-label":e,className:"pl-8 h-9"})]}),f&&(0,b.jsx)("div",{className:"min-w-[150px]",children:(0,b.jsxs)(h.Select,{value:j??"ALL",onValueChange:a=>k?.(a),children:[(0,b.jsx)(h.SelectTrigger,{className:"h-9","aria-label":l,children:(0,b.jsx)(h.SelectValue,{})}),(0,b.jsxs)(h.SelectContent,{children:[(0,b.jsxs)(h.SelectItem,{value:"ALL",children:["All ",l]}),f.map(a=>(0,b.jsx)(h.SelectItem,{value:a.value,children:a.label},a.value))]})]})}),m]})}],21665)},2603,a=>{"use strict";var b=a.i(45056);a.s(["useConfirmDiscard",0,function(){let a=(0,b.useRef)(null);return{capture:b=>{a.current=JSON.parse(JSON.stringify(b))},confirmClose:(b,c=!1)=>!((b,c=!1)=>!!c||null!==a.current&&JSON.stringify(b)!==JSON.stringify(a.current))(b,c)||window.confirm("You have unsaved changes. Discard them?")}}])},17876,a=>{"use strict";let b=null;async function c(){if(null!==b)return b;try{let a=await fetch("/logo.png"),c=await a.blob(),d=await new Promise((a,b)=>{let d=new FileReader;d.onloadend=()=>a(d.result),d.onerror=b,d.readAsDataURL(c)});return b=d,d}catch{return b="",""}}function d(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function e(a){let b=window.open("","_blank");if(!b)return;let e=await c(),f=(a.metaItems??[]).filter(a=>null!==a.value&&void 0!==a.value&&""!==a.value).map(a=>`<b>${d(a.label)}:</b> ${d(String(a.value))}`).join("&nbsp;&nbsp;·&nbsp;&nbsp;"),g=a.kpis&&a.kpis.length>0?`
    <div class="kpis">
      ${a.kpis.map(a=>`<div class="kpi"><b>${d(String(a.value))}</b>${d(a.label)}</div>`).join("")}
    </div>`:"",h=(a.tables??[]).map(a=>`
    <h2>${d(a.title)}</h2>
    <table>
      <thead><tr>${a.columns.map(a=>`<th>${d(a)}</th>`).join("")}</tr></thead>
      <tbody>
        ${0===a.rows.length?`<tr><td colspan="${a.columns.length}" class="empty-row">No data yet.</td></tr>`:a.rows.map(a=>`<tr>${a.map(a=>`<td>${d(String(a))}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `).join(""),i=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});b.document.open(),b.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${d(a.title)} — SND Africa MEAL Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Source Sans 3', Arial, sans-serif;
    color: #3D1A08;
  }
  .report-header {
    display: flex; align-items: center; gap: 16px;
    background: #1E1004; padding: 20px 32px;
    border-bottom: 4px solid #C8793A;
  }
  .report-header img { height: 44px; width: auto; display: block; }
  .report-header .org-name { font-family: 'Lora', Georgia, serif; font-weight: 700; font-size: 18px; color: #F5E6C8; margin: 0; }
  .report-header .org-sub { font-size: 12px; color: #E8C97A; margin: 2px 0 0; }
  .report-body { padding: 28px 32px; }
  .module-label {
    display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: #C8793A; background: #C8793A22; padding: 3px 10px; border-radius: 999px; margin-bottom: 10px;
  }
  h1 { font-family: 'Lora', Georgia, serif; margin: 0 0 6px; color: #3D1A08; font-size: 24px; }
  .subtitle { color: #5A3010; opacity: 0.85; margin: 0 0 8px; max-width: 680px; line-height: 1.4; }
  .meta { font-size: 13px; color: #8B6A4A; margin: 0 0 22px; }
  .note { font-size: 12px; font-style: italic; color: #8B6A4A; margin: 0 0 10px; }
  h2 { font-family: 'Lora', Georgia, serif; margin-top: 30px; border-bottom: 2px solid #C8793A; padding-bottom: 6px; font-size: 16px; color: #3D1A08; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #E8C97A66; padding: 8px 10px; font-size: 13px; text-align: left; }
  th { background: #FBF7F2; color: #5A3010; font-weight: 600; }
  tr:nth-child(even) td { background: #FBF7F2; }
  .empty-row { text-align: center; color: #8B6A4A; padding: 16px !important; }
  .kpis { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
  .kpi { border: 1px solid #E8C97A66; border-radius: 10px; padding: 12px 18px; min-width: 110px; background: #fff; }
  .kpi b { font-size: 22px; display: block; color: #C8793A; font-family: 'Lora', Georgia, serif; }
  .report-footer {
    margin-top: 40px; padding: 16px 32px; border-top: 1px solid #E8C97A66;
    font-size: 11px; color: #8B6A4A; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;
  }
  @media print {
    @page { margin: 0.4in; }
    .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="report-header">
    ${e?`<img src="${e}" alt="SND Africa" />`:""}
    <div>
      <p class="org-name">SND Africa</p>
      <p class="org-sub">Monitoring, Evaluation, Accountability and Learning</p>
    </div>
  </div>
  <div class="report-body">
    <span class="module-label">${d(a.moduleLabel)}</span>
    <h1>${d(a.title)}</h1>
    ${a.subtitle?`<p class="subtitle">${d(a.subtitle)}</p>`:""}
    ${a.note?`<p class="note">${d(a.note)}</p>`:""}
    ${f?`<p class="meta">${f}</p>`:""}
    ${g}
    ${h}
  </div>
  <div class="report-footer">
    <span>Confronting crisis&nbsp;\xb7&nbsp;Building Resilience&nbsp;\xb7&nbsp;Transforming lives</span>
    <span>Generated ${i} &middot; SND Africa MEAL Portal</span>
  </div>
</body>
</html>`),b.document.close(),b.focus(),setTimeout(()=>{try{b.print()}catch{}},350)}a.s(["openBrandedReport",0,e])},72245,a=>{"use strict";let b=(0,a.i(31261).default)("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]]);a.s(["Building2",0,b],72245)},7473,a=>{"use strict";let b=(0,a.i(31261).default)("Landmark",[["line",{x1:"3",x2:"21",y1:"22",y2:"22",key:"j8o0r"}],["line",{x1:"6",x2:"6",y1:"18",y2:"11",key:"10tf0k"}],["line",{x1:"10",x2:"10",y1:"18",y2:"11",key:"54lgf6"}],["line",{x1:"14",x2:"14",y1:"18",y2:"11",key:"380y"}],["line",{x1:"18",x2:"18",y1:"18",y2:"11",key:"1kevvc"}],["polygon",{points:"12 2 20 7 4 7",key:"jkujk7"}]]);a.s(["Landmark",0,b],7473)}];

//# sourceMappingURL=frontend_0rurpoh._.js.map