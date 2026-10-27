import React from 'react';
import {createRoot} from 'react-dom/client';
import Switch from '@mui/material/Switch';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import ToolTipEx from '../src/pipedal/ToolTipEx';
const log: unknown[]=[];
for(const type of ['pointerdown','pointerup','pointercancel','touchstart','touchend','touchcancel','click','change']) {
 document.addEventListener(type,e=>{
  const target=e.target as HTMLElement; const test=target.closest('[data-test]')?.getAttribute('data-test');
  if(!test)return;
  queueMicrotask(()=>{
   const record={type,test,target:target.tagName,cls:target.className,prevented:e.defaultPrevented,time:Math.round(performance.now()),checked:(target as HTMLInputElement).checked,pointer:(e as PointerEvent).pointerType};
   log.push(record);console.log(record);
   document.getElementById('events')!.textContent=JSON.stringify(log.slice(-8),null,1);
  });
 },{capture:true,passive:true});
}
function Test({id,label,kind}:{id:string,label:string,kind:number}) {
 const [checked,setChecked]=React.useState(false);const [count,setCount]=React.useState(0);
 const change=(e:React.ChangeEvent<HTMLInputElement>)=>{setChecked(e.target.checked);setCount(n=>n+1);console.log({test:id,type:"react-change",checked:e.target.checked})};
 const sw=<Switch color="secondary" checked={checked} onChange={change}/>;
 return <section data-test={id}><strong>{label}</strong><div>{kind===0?<input aria-label={label} style={{width:42,height:42}} type="checkbox" checked={checked} onChange={change}/>:kind===1?sw:<ToolTipEx title="Bypass">{sw}</ToolTipEx>}</div><span>{checked?'ON':'OFF'} · changes: {count}</span></section>;
}
createRoot(document.getElementById('root')!).render(<ThemeProvider theme={createTheme({palette:{mode:'dark'}})}><h2>Touch diagnostics — dummy controls, no audio changes</h2><p>Tap each switch once, left to right. Then tap each again.</p><main>{['Native checkbox','MUI switch','MUI + PiPedal tooltip'].map((label,i)=><Test key={i} id={String(i+1)} label={label} kind={i}/>)}</main><pre id="events"/></ThemeProvider>);
