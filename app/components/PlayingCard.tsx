'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
export default function PlayingCard({n,index=0,delay=0,revealDelay=0,animated=false}:{n:number;index?:number;delay?:number;revealDelay?:number;animated?:boolean}){
 const outer=useRef<HTMLDivElement>(null),previous=useRef(n);
 const [revealed,setRevealed]=useState(!animated&&n>=0);
 const rank=['A','2','3','4','5','6','7','8','9','10','J','Q','K'][n%13];
 const suit=['♠','♥','♣','♦'][Math.floor(n/13)];
 useEffect(()=>{
  const node=outer.current;if(!node)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animation:Animation|undefined;
  const frame=requestAnimationFrame(()=>{
   if(!animated||reduced){setRevealed(n>=0);return;}
   const deck=node.closest('.table-scene')?.querySelector('.dealer-shoe');
   if(deck){
    const start=deck.getBoundingClientRect(),end=node.getBoundingClientRect();
    animation=node.animate([
     {transform:'translate('+(start.left+start.width/2-end.left-end.width/2)+'px,'+(start.top+start.height/2-end.top-end.height/2)+'px) rotate(-35deg) scale(.72)',opacity:0,filter:'drop-shadow(0 12px 6px #0008)'},
     {opacity:1,offset:.12},
     {transform:'translate(0,-9px) rotate(3deg) scale(1.04)',opacity:1,offset:.82},
     {transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1,filter:'drop-shadow(0 3px 3px #0004)'}
    ],{duration:680,delay,easing:'cubic-bezier(.19,.72,.25,1)',fill:'backwards'});
   }
  });
  const timer=setTimeout(()=>setRevealed(n>=0),animated&&!reduced?delay+590:0);
  return()=>{cancelAnimationFrame(frame);clearTimeout(timer);animation?.cancel()};
 },[]);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  if(previous.current<0&&n>=0)timer=setTimeout(()=>setRevealed(true),revealDelay);
  if(n<0)setRevealed(false);
  previous.current=n;
  return()=>clearTimeout(timer);
 },[n,revealDelay]);
 return <div ref={outer} className="card-shell" style={{'--fan':((index-.5)*8)+'deg'} as CSSProperties} aria-label={n>=0&&revealed?rank+suit:'ไพ่คว่ำ'}><div className={'card-rotator '+(revealed?'is-revealed':'')}><div className="card card-face card-back-face"><span className="back-ornament"><i>♠</i><small>EMERALD</small></span></div><div className={'card card-face card-front-face '+(Math.floor(n/13)%2?'red':'')}><b>{rank}<small>{suit}</small></b><em>{suit}</em><b className="corner">{rank}<small>{suit}</small></b></div></div></div>;
}
