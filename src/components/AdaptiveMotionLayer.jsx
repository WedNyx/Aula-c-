import { useEffect } from "react";
import gsap from "gsap";

const TARGETS = ".cardfx,.dashboard-sidebar-group,.teacher-student-tile,.student-quick-action";
const canUseFullMotion = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  return !connection?.saveData && (navigator.hardwareConcurrency||4)>=4;
};

export function AdaptiveMotionLayer() {
  useEffect(()=>{
    if(!canUseFullMotion()){document.documentElement.dataset.motion="reduced";return undefined;}
    document.documentElement.dataset.motion="full";
    const seen=new WeakSet();
    const reveal=element=>{
      if(seen.has(element)||element.closest("[aria-hidden='true']"))return;
      seen.add(element);element.dataset.motionReady="true";
      gsap.fromTo(element,{autoAlpha:0,y:18,scale:.985},{autoAlpha:1,y:0,scale:1,duration:.42,ease:"power2.out",clearProps:"transform,opacity,visibility"});
    };
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){reveal(entry.target);observer.unobserve(entry.target);}}),{rootMargin:"0px 0px -5% 0px",threshold:.08});
    const watch=root=>{if(root.nodeType!==1)return;if(root.matches?.(TARGETS))observer.observe(root);root.querySelectorAll?.(TARGETS).forEach(element=>observer.observe(element));};
    watch(document.body);
    const mutations=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(watch)));
    mutations.observe(document.body,{childList:true,subtree:true});
    const press=event=>{const button=event.target.closest("button,[role='button']");if(!button||button.disabled)return;gsap.fromTo(button,{scale:.97},{scale:1,duration:.22,ease:"back.out(2)",overwrite:true,clearProps:"transform"});};
    document.addEventListener("pointerdown",press,{passive:true});
    return()=>{observer.disconnect();mutations.disconnect();document.removeEventListener("pointerdown",press);delete document.documentElement.dataset.motion;};
  },[]);
  return null;
}
