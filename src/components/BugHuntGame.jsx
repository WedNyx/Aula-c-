import { useEffect, useRef, useState } from "react";
import { mountNyxGame, phaserApi } from "../lib/gameEngine.js";
import { playSound } from "../lib/sound.ts";

const BUGS = [
  'Console.WriteLine("Olá")',
  "int pontos = ;",
  "if (vida > 0",
  "string nome = 42;",
  "for (int i = 0; i < 5; i--)",
  "Console.ReadLine(",
  "bool ativo = "sim";",
];

const VALID = [
  'Console.WriteLine("Olá");',
  "int pontos = 10;",
  "if (vida > 0) { }",
  "string nome = "Nyx";",
  "for (int i = 0; i < 5; i++) { }",
  "Console.ReadLine();",
  "bool ativo = true;",
];

function createBugScene(Phaser, { onStats, onComplete, reducedMotion }) {
  return class BugHuntScene extends Phaser.Scene {
    create() {
      this.score = 0;
      this.combo = 0;
      this.lives = 3;
      this.remaining = 30;
      this.finished = false;
      this.add.rectangle(480, 270, 960, 540, 0x0c0718);
      for (let i = 0; i < 45; i += 1) {
        this.add.circle(Math.random() * 960, Math.random() * 540, 1 + Math.random() * 2, 0x7c3aed, 0.35);
      }
      this.add.text(28, 22, "🐛 CAÇA AOS BUGS", { fontFamily:"Arial", fontSize:"24px", fontStyle:"bold", color:"#fbbf24" });
      this.hud = this.add.text(28, 58, "", { fontFamily:"Arial", fontSize:"18px", color:"#f0e9fb" });
      this.tip = this.add.text(480, 500, "Clique apenas nos códigos com erro", { fontFamily:"Arial", fontSize:"15px", color:"#a99ac9" }).setOrigin(0.5);
      this.timer = this.time.addEvent({ delay:1000, loop:true, callback:()=>{
        if (this.finished) return;
        this.remaining -= 1;
        this.updateHud();
        if (this.remaining <= 0) this.finish();
      }});
      this.spawner = this.time.addEvent({ delay:900, loop:true, callback:()=>this.spawnCard() });
      this.updateHud();
      this.spawnCard();
    }

    updateHud() {
      this.hud.setText(`Pontos: ${this.score}   Combo: x${Math.max(1, this.combo)}   Vidas: ${"❤".repeat(this.lives)}   Tempo: ${this.remaining}s`);
      onStats({ score:this.score, combo:this.combo, lives:this.lives, remaining:this.remaining });
    }

    spawnCard() {
      if (this.finished) return;
      const isBug = Math.random() < 0.62;
      const pool = isBug ? BUGS : VALID;
      const value = pool[Math.floor(Math.random() * pool.length)];
      const x = 145 + Math.random() * 670;
      const card = this.add.text(x, -30, value, {
        fontFamily:"monospace", fontSize:"17px", color:"#f0e9fb",
        backgroundColor:"#231636", padding:{ x:14, y:10 },
        fixedWidth:Math.min(620, Math.max(250, value.length * 11)),
        align:"center",
      }).setOrigin(0.5).setInteractive({ useHandCursor:true });
      card.setData("bug", isBug);
      card.setData("handled", false);
      card.on("pointerdown", () => this.choose(card));
      const duration = Math.max(3600, 6800 - this.score * 4);
      this.tweens.add({
        targets:card, y:455, duration, ease:"Linear",
        onComplete:()=>{
          if (card.getData("handled")) return;
          card.setData("handled", true);
          if (card.getData("bug")) this.miss(card, "Bug escapou!");
          else card.destroy();
        },
      });
    }

    choose(card) {
      if (this.finished || card.getData("handled")) return;
      card.setData("handled", true);
      if (card.getData("bug")) {
        this.combo += 1;
        this.score += 100 + Math.min(400, (this.combo - 1) * 25);
        playSound(this.combo >= 4 ? "combo" : "correct");
        card.setStyle({ backgroundColor:"#065f46", color:"#d1fae5" }).setText(`✓ BUG CORRIGIDO  +${100 + Math.min(400, (this.combo - 1) * 25)}`);
        this.tweens.add({ targets:card, alpha:0, scale:1.12, duration:reducedMotion?80:260, onComplete:()=>card.destroy() });
      } else {
        this.miss(card, "Esse código estava certo!");
      }
      this.updateHud();
    }

    miss(card, message) {
      this.combo = 0;
      this.lives -= 1;
      playSound("wrong");
      if (card?.active) {
        card.setStyle({ backgroundColor:"#7f1d1d", color:"#fee2e2" }).setText(`✕ ${message}`);
        this.tweens.add({ targets:card, alpha:0, duration:reducedMotion?80:350, onComplete:()=>card.destroy() });
      }
      if (!reducedMotion) this.cameras.main.shake(130, 0.007);
      this.updateHud();
      if (this.lives <= 0) this.finish();
    }

    finish() {
      if (this.finished) return;
      this.finished = true;
      this.timer?.remove();
      this.spawner?.remove();
      this.children.list.filter(item=>item?.input).forEach(item=>item.disableInteractive());
      const won = this.score >= 500;
      playSound(won ? "achievement" : "wrong");
      this.add.rectangle(480, 270, 640, 230, 0x171026, 0.96).setStrokeStyle(2, won?0x34d399:0xfbbf24);
      this.add.text(480, 220, won?"MISSÃO CONCLUÍDA!":"FIM DA RODADA", { fontFamily:"Arial", fontSize:"30px", fontStyle:"bold", color:won?"#34d399":"#fbbf24" }).setOrigin(0.5);
      this.add.text(480, 278, `${this.score} pontos\n${won?"Você encontrou os bugs!":"Faça 500 pontos para vencer."}`, { fontFamily:"Arial", fontSize:"21px", color:"#f0e9fb", align:"center" }).setOrigin(0.5);
      onComplete({ score:this.score, won });
    }
  };
}

export function BugHuntGame({ onWin, onBack }) {
  const parentRef = useRef(null);
  const [round, setRound] = useState(0);
  const [stats, setStats] = useState({ score:0, combo:0, lives:3, remaining:30 });
  const [result, setResult] = useState(null);
  const [paused, setPaused] = useState(false);

  useEffect(()=>{
    let dispose = null;
    let cancelled = false;
    const boot = async()=>{
      const Phaser = await phaserApi();
      const scene = createBugScene(Phaser, {
        reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
        onStats:value=>{ if(!cancelled) setStats(value); },
        onComplete:value=>{
          if(cancelled) return;
          setResult(value);
          if(value.won) onWin?.();
        },
      });
      dispose = await mountNyxGame({ parent:parentRef.current, width:960, height:540, scene });
    };
    boot().catch(()=>setResult({ score:0, won:false, error:true }));
    return()=>{ cancelled=true; dispose?.(); };
  },[round]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePause=()=>{
    const game=parentRef.current?.__nyxGame;
    setPaused(value=>!value);
    if(game) game.loop.sleeping ? game.loop.wake() : game.loop.sleep();
  };

  return <section className="lunar-challenge-play">
    <button className="lunar-back" onClick={onBack}>← Desafios</button>
    <h2>🐛 Caça aos Bugs</h2>
    <p>Leia os códigos que estão descendo e clique apenas nos que possuem erro. Faça 500 pontos antes de perder as três vidas.</p>
    <div aria-live="polite" style={{display:"flex",gap:12,flexWrap:"wrap",color:"#f0e9fb",fontWeight:800,marginBottom:8}}>
      <span>⭐ {stats.score}</span><span>🔥 x{Math.max(1,stats.combo)}</span><span>❤ {stats.lives}</span><span>⏱ {stats.remaining}s</span>
    </div>
    <div ref={parentRef} aria-label="Jogo Caça aos Bugs em C#" style={{width:"100%",aspectRatio:"16 / 9",minHeight:260,border:"1px solid #5a427d",borderRadius:16,overflow:"hidden",background:"#0c0718"}} />
    <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
      <button className="lunar-primary" onClick={()=>setRound(value=>value+1)}>↻ Nova rodada</button>
      <button className="lunar-back" onClick={togglePause} disabled={!!result}>{paused?"▶ Continuar":"⏸ Pausar"}</button>
    </div>
    {result?.error&&<p className="lunar-api-error">Não foi possível iniciar o jogo neste navegador. Atualize a página e tente novamente.</p>}
    {result&&!result.error&&<p style={{color:result.won?"#34d399":"#fbbf24",fontWeight:900}}>{result.won?`Missão concluída com ${result.score} pontos!`:`Você fez ${result.score} pontos. Tente outra rodada!`}</p>}
  </section>;
}
