import { useEffect, useState } from "react";
const glyphs="ABCDEFGHJKLMNPQRSTUVWXYZ23456789@#$%&";
export default function ScrambleLines({ text, className="" }: { text: string; className?: string }) {
  const [shown,setShown]=useState(text);
  useEffect(()=>{
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setShown(text);return;}
    let frame=0;let step=0;let active=true;
    const total=text.length;
    const tick=()=>{
      if(!active)return;
      step=Math.min(total,step+1);
      setShown(text.split("").map((char,index)=>char===" "||index<step?char:glyphs[(index*7+step*11+frame*3)%glyphs.length]).join(""));
      frame++;
      if(step<total)window.setTimeout(tick,24);
      else setShown(text);
    };
    setShown(text.split("").map((char,index)=>char===" "? " ":glyphs[(index*5+3)%glyphs.length]).join(""));
    const timer=window.setTimeout(tick,80);
    return()=>{active=false;window.clearTimeout(timer);};
  },[text]);
  return <span className={className} aria-label={text}>{shown}</span>;
}
