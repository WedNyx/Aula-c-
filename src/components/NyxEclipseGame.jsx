import { useEffect, useRef, useState } from "react";

const W = 960;
const H = 540;
const GROUND = 454;
const SAVE_KEY = "nyx_ecos_eclipse_progress_v1";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function makeGame(saved = {}) {
  return {
    player: { x: saved.checkpoint || 110, y: 370, vx: 0, vy: 0, w: 34, h: 48, hp: 5, maxHp: 5, face: 1, grounded: false, attack: 0, dash: 0, dashCd: 0, hurt: 0 },
    camera: 0,
    fragments: saved.fragments || 0,
    collected: new Set(saved.collected || []),
    checkpoint: saved.checkpoint || 110,
    message: "Explore o Santuário Lunar",
    messageTime: 220,
    won: !!saved.won,
    paused: false,
    particles: [],
    enemies: [
      { id: "echo-1", x: 690, y: GROUND - 34, w: 40, h: 34, hp: 2, maxHp: 2, min: 620, max: 790, dir: 1, dead: false },
      { id: "echo-2", x: 1290, y: GROUND - 34, w: 40, h: 34, hp: 2, maxHp: 2, min: 1200, max: 1430, dir: -1, dead: false },
      { id: "echo-3", x: 1780, y: GROUND - 34, w: 40, h: 34, hp: 3, maxHp: 3, min: 1690, max: 1890, dir: 1, dead: false },
    ],
    boss: { x: 2290, y: GROUND - 124, w: 86, h: 124, hp: saved.won ? 0 : 12, maxHp: 12, dir: -1, cooldown: 80, active: false, dead: !!saved.won },
    pickups: [420, 860, 1110, 1510, 1940].map((x, i) => ({ id: `f-${i}`, x, y: i % 2 ? 330 : 395 })),
  };
}

export function NyxEclipseGame({ onClose }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef(new Set());
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState({ hp: 5, fragments: 0, boss: null, won: false });

  const press = (code) => keysRef.current.add(code);
  const release = (code) => keysRef.current.delete(code);

  useEffect(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"); } catch {}
    gameRef.current = makeGame(saved);
    setStatus({ hp: 5, fragments: gameRef.current.fragments, boss: null, won: gameRef.current.won });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const down = (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) e.preventDefault();
      press(e.code);
    };
    const up = (e) => release(e.code);
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const game = gameRef.current;
    let last = performance.now();

    const save = () => {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        checkpoint: game.checkpoint,
        fragments: game.fragments,
        collected: [...game.collected],
        won: game.won,
      }));
    };

    const sparkle = (x, y, color = "#67e8f9", count = 7) => {
      for (let i = 0; i < count; i++) game.particles.push({ x, y, vx: (Math.random() - .5) * 4, vy: -Math.random() * 3 - 1, life: 35 + Math.random() * 25, color });
    };

    const hitPlayer = (damage, sourceX) => {
      const p = game.player;
      if (p.hurt > 0 || p.dash > 0) return;
      p.hp -= damage; p.hurt = 65; p.vx = sourceX < p.x ? 7 : -7; p.vy = -7;
      game.message = "O altar restaurará sua energia"; game.messageTime = 100;
      if (p.hp <= 0) {
        p.x = game.checkpoint; p.y = 340; p.vx = 0; p.vy = 0; p.hp = p.maxHp;
        game.camera = clamp(p.x - 300, 0, 1640); game.message = "Nyx despertou no último altar"; game.messageTime = 150;
      }
    };

    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const update = (dt) => {
      const p = game.player;
      const keys = keysRef.current;
      if (keys.has("Escape")) { keys.delete("Escape"); game.paused = !game.paused; }
      if (game.paused) return;
      const left = keys.has("KeyA") || keys.has("ArrowLeft");
      const right = keys.has("KeyD") || keys.has("ArrowRight");
      if (left) { p.vx -= .72 * dt; p.face = -1; }
      if (right) { p.vx += .72 * dt; p.face = 1; }
      if (!left && !right && p.dash <= 0) p.vx *= Math.pow(.78, dt);
      p.vx = clamp(p.vx, -5.3, 5.3);

      if ((keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) && p.grounded) {
        p.vy = -11.6; p.grounded = false; keys.delete("Space"); keys.delete("ArrowUp"); keys.delete("KeyW");
      }
      if ((keys.has("KeyK") || keys.has("ShiftLeft")) && p.dashCd <= 0) {
        p.dash = 12; p.dashCd = 65; p.vx = p.face * 13; sparkle(p.x + 17, p.y + 25, "#a78bfa", 10); keys.delete("KeyK"); keys.delete("ShiftLeft");
      }
      if ((keys.has("KeyJ") || keys.has("KeyX")) && p.attack <= 0) {
        p.attack = 16; keys.delete("KeyJ"); keys.delete("KeyX");
      }
      p.attack = Math.max(0, p.attack - dt); p.dash = Math.max(0, p.dash - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.hurt = Math.max(0, p.hurt - dt);
      p.vy += .58 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = clamp(p.x, 30, 2540);
      if (p.y + p.h >= GROUND) { p.y = GROUND - p.h; p.vy = 0; p.grounded = true; }

      const attackBox = { x: p.face > 0 ? p.x + p.w : p.x - 48, y: p.y + 5, w: 48, h: 40 };
      for (const e of game.enemies) {
        if (e.dead) continue;
        e.x += e.dir * 1.15 * dt;
        if (e.x < e.min || e.x > e.max) e.dir *= -1;
        if (p.attack > 8 && overlap(attackBox, e) && !e.justHit) {
          e.hp--; e.justHit = 22; sparkle(e.x + 20, e.y + 15); if (e.hp <= 0) { e.dead = true; sparkle(e.x + 20, e.y + 15, "#c4b5fd", 16); }
        }
        e.justHit = Math.max(0, (e.justHit || 0) - dt);
        if (overlap(p, e)) hitPlayer(1, e.x);
      }

      for (const f of game.pickups) {
        if (game.collected.has(f.id)) continue;
        if (Math.hypot((p.x + 17) - f.x, (p.y + 24) - f.y) < 38) {
          game.collected.add(f.id); game.fragments++; sparkle(f.x, f.y, "#fde68a", 14); game.message = `Fragmento lunar encontrado • ${game.fragments}/5`; game.messageTime = 120; save();
        }
      }

      if (Math.abs(p.x - 1030) < 44 && p.grounded) {
        if (game.checkpoint !== 1030) { game.checkpoint = 1030; p.hp = p.maxHp; game.message = "Altar Lunar ativado • progresso salvo"; game.messageTime = 140; sparkle(1030, 390, "#a78bfa", 18); save(); }
      }

      const b = game.boss;
      if (!b.dead && p.x > 2070) b.active = true;
      if (b.active && !b.dead) {
        b.cooldown -= dt;
        const dist = p.x - b.x; b.dir = dist < 0 ? -1 : 1;
        if (Math.abs(dist) > 110) b.x += Math.sign(dist) * 1.05 * dt;
        if (b.cooldown <= 0) { b.cooldown = 85; b.lunge = 20; }
        if (b.lunge > 0) { b.x += b.dir * 4.8 * dt; b.lunge -= dt; }
        if (p.attack > 8 && overlap(attackBox, b) && !b.justHit) {
          b.hp--; b.justHit = 22; sparkle(b.x + 43, b.y + 55, "#facc15", 9);
          if (b.hp <= 0) { b.dead = true; game.won = true; game.message = "Guardião Astral vencido • o caminho do Eclipse foi aberto"; game.messageTime = 9999; sparkle(b.x + 43, b.y + 55, "#facc15", 40); save(); }
        }
        b.justHit = Math.max(0, (b.justHit || 0) - dt);
        if (overlap(p, b)) hitPlayer(1, b.x);
      }

      for (const pt of game.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += .08 * dt; pt.life -= dt; }
      game.particles = game.particles.filter(pt => pt.life > 0);
      game.camera += (clamp(p.x - W * .38, 0, 1640) - game.camera) * .08 * dt;
      game.messageTime = Math.max(0, game.messageTime - dt);
      const nextStatus = { hp: p.hp, fragments: game.fragments, boss: b.active && !b.dead ? b.hp : null, won: game.won };
      const oldStatus = game.lastStatus;
      if (!oldStatus || oldStatus.hp !== nextStatus.hp || oldStatus.fragments !== nextStatus.fragments || oldStatus.boss !== nextStatus.boss || oldStatus.won !== nextStatus.won) {
        game.lastStatus = nextStatus;
        setStatus(nextStatus);
      }
    };

    const drawNyx = (p, cam, t) => {
      const x = p.x - cam, y = p.y;
      ctx.save(); ctx.translate(x + p.w / 2, y + p.h / 2); ctx.scale(p.face, 1);
      if (p.hurt > 0 && Math.floor(p.hurt / 5) % 2) ctx.globalAlpha = .35;
      ctx.shadowColor = "#7dd3fc"; ctx.shadowBlur = 14;
      const g = ctx.createLinearGradient(-20, -24, 20, 24); g.addColorStop(0, "#7c3aed"); g.addColorStop(1, "#26134f");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-16,-15); ctx.quadraticCurveTo(0,-29,18,-14); ctx.quadraticCurveTo(25,4,12,13); ctx.lineTo(17,24); ctx.lineTo(2,18); ctx.lineTo(-14,25); ctx.lineTo(-10,12); ctx.quadraticCurveTo(-24,3,-16,-15); ctx.fill();
      ctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.ellipse(7,-8,3.5,6,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(13,7); ctx.quadraticCurveTo(32,-2,34,-18); ctx.stroke();
      if (p.attack > 0) { ctx.strokeStyle = "rgba(196,181,253,.75)"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(8,0,36,-1.1,1.05); ctx.stroke(); }
      ctx.restore();
    };

    const draw = (now) => {
      const cam = game.camera, t = now / 1000;
      const sky = ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,"#070718"); sky.addColorStop(.6,"#17123b"); sky.addColorStop(1,"#291b55"); ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
      ctx.fillStyle="rgba(109,94,252,.12)"; for(let i=0;i<8;i++){ const x=((i*230-cam*.16)%1500)-120; ctx.beginPath();ctx.arc(x,120+(i%3)*55,95,0,Math.PI*2);ctx.fill(); }
      ctx.fillStyle="#dbeafe"; ctx.shadowColor="#a5b4fc"; ctx.shadowBlur=28; ctx.beginPath();ctx.arc(780-cam*.03,98,51,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#10102a";ctx.beginPath();ctx.arc(799-cam*.03,88,50,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="rgba(139,92,246,.22)";ctx.lineWidth=7; for(let i=0;i<7;i++){ const x=i*440-cam*.45;ctx.beginPath();ctx.arc(x,370,180,Math.PI,Math.PI*2);ctx.stroke(); }
      ctx.fillStyle="#171331"; for(let i=0;i<14;i++){ const x=i*210-cam*.72;ctx.fillRect(x,250+(i%3)*30,35,204);ctx.beginPath();ctx.arc(x+17,250+(i%3)*30,50,Math.PI,Math.PI*2);ctx.fill(); }
      const floor=ctx.createLinearGradient(0,GROUND,0,H);floor.addColorStop(0,"#493579");floor.addColorStop(.08,"#251b47");floor.addColorStop(1,"#0b0a1a");ctx.fillStyle=floor;ctx.fillRect(0,GROUND,W,H-GROUND);
      ctx.strokeStyle="#8b5cf6";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,GROUND);ctx.lineTo(W,GROUND);ctx.stroke();
      for(let i=0;i<34;i++){const x=i*90-cam%90;ctx.fillStyle=i%3?"#33265d":"#59418f";ctx.fillRect(x,GROUND+12+(i%2)*17,55,3);}

      for (const f of game.pickups) if (!game.collected.has(f.id)) { const x=f.x-cam,y=f.y+Math.sin(t*3+f.x)*7;ctx.save();ctx.translate(x,y);ctx.rotate(t);ctx.shadowColor="#fde68a";ctx.shadowBlur=18;ctx.fillStyle="#facc15";ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(7,0);ctx.lineTo(0,11);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.restore(); }

      const altarX=1030-cam; ctx.fillStyle="#30235e";rounded(ctx,altarX-34,GROUND-54,68,54,12);ctx.fill();ctx.strokeStyle="#a78bfa";ctx.lineWidth=3;ctx.stroke();ctx.shadowColor="#a78bfa";ctx.shadowBlur=16;ctx.fillStyle="#c4b5fd";ctx.beginPath();ctx.arc(altarX,GROUND-61,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;

      for(const e of game.enemies){if(e.dead)continue;const x=e.x-cam;ctx.save();ctx.translate(x+20,e.y+17);ctx.fillStyle=e.justHit?"#e0f2fe":"#303653";ctx.shadowColor="#38bdf8";ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(0,0,22,17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#67e8f9";ctx.fillRect(-9,-3,5,4);ctx.fillRect(5,-3,5,4);ctx.restore();}

      const b=game.boss;if(!b.dead){const x=b.x-cam,y=b.y;ctx.save();ctx.translate(x+b.w/2,y+58);ctx.fillStyle=b.justHit?"#fff7cc":"#bbb6cf";ctx.shadowColor="#facc15";ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(-34,-50);ctx.lineTo(-51,-20);ctx.lineTo(-34,-27);ctx.lineTo(-25,50);ctx.lineTo(25,50);ctx.lineTo(34,-27);ctx.lineTo(51,-20);ctx.lineTo(34,-50);ctx.lineTo(17,-31);ctx.lineTo(0,-58);ctx.lineTo(-17,-31);ctx.closePath();ctx.fill();ctx.fillStyle="#facc15";ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.restore();}
      drawNyx(game.player,cam,t);
      for(const pt of game.particles){ctx.globalAlpha=clamp(pt.life/30,0,1);ctx.fillStyle=pt.color;ctx.fillRect(pt.x-cam,pt.y,3,3);}ctx.globalAlpha=1;

      if(game.messageTime>0){ctx.fillStyle="rgba(7,7,24,.78)";rounded(ctx,W/2-240,31,480,38,14);ctx.fill();ctx.fillStyle="#e9d5ff";ctx.font="700 15px system-ui";ctx.textAlign="center";ctx.fillText(game.message,W/2,56);ctx.textAlign="left";}
      if(game.paused){ctx.fillStyle="rgba(4,3,13,.72)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#f5f3ff";ctx.font="800 34px system-ui";ctx.textAlign="center";ctx.fillText("Jogo pausado",W/2,H/2);ctx.font="15px system-ui";ctx.fillStyle="#c4b5fd";ctx.fillText("Pressione Esc para continuar",W/2,H/2+34);ctx.textAlign="left";}
    };

    const loop = (now) => { const dt = clamp((now-last)/16.67,.3,1.8);last=now;update(dt);draw(now);rafRef.current=requestAnimationFrame(loop); };
    rafRef.current=requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready]);

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    Object.assign(gameRef.current, makeGame());
    setStatus({ hp:5, fragments:0, boss:null, won:false });
  };

  return (
    <div className="nyx-eclipse-shell" role="dialog" aria-modal="true" aria-label="Nyx: Ecos do Eclipse">
      <div className="nyx-eclipse-topbar">
        <div><strong>NYX: ECOS DO ECLIPSE</strong><span>Protótipo jogável • Santuário Lunar</span></div>
        <div className="nyx-eclipse-actions">
          <button onClick={reset}>↻ Reiniciar</button>
          <button onClick={onClose}>✕ Sair</button>
        </div>
      </div>
      <div className="nyx-eclipse-stage">
        <canvas ref={canvasRef} width={W} height={H} />
        <div className="nyx-eclipse-hud">
          <div className="nyx-eclipse-hearts">{Array.from({length:5},(_,i)=><span key={i} className={i<status.hp?"on":""}>◆</span>)}</div>
          <div className="nyx-eclipse-fragments">✦ {status.fragments}/5</div>
        </div>
        {status.boss !== null && <div className="nyx-eclipse-bossbar"><span>GUARDIÃO ASTRAL</span><i><b style={{width:`${status.boss/12*100}%`}} /></i></div>}
        {status.won && <div className="nyx-eclipse-victory"><strong>O caminho do Eclipse foi aberto</strong><span>Você concluiu a primeira demonstração.</span></div>}
        <div className="nyx-eclipse-touch" aria-label="Controles por toque">
          <div><button onPointerDown={()=>press("KeyA")} onPointerUp={()=>release("KeyA")} onPointerLeave={()=>release("KeyA")}>◀</button><button onPointerDown={()=>press("KeyD")} onPointerUp={()=>release("KeyD")} onPointerLeave={()=>release("KeyD")}>▶</button></div>
          <div><button onPointerDown={()=>press("Space")} onPointerUp={()=>release("Space")}>↑</button><button onPointerDown={()=>press("KeyK")} onPointerUp={()=>release("KeyK")}>◈</button><button className="attack" onPointerDown={()=>press("KeyJ")} onPointerUp={()=>release("KeyJ")}>⚔</button></div>
        </div>
      </div>
      <div className="nyx-eclipse-help"><span>A/D mover</span><span>Espaço pular</span><span>J atacar</span><span>K ou Shift esquivar</span><span>Esc pausar</span></div>
    </div>
  );
}
