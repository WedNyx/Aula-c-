import { useEffect, useMemo } from "react";
import { useRive } from "@rive-app/react-canvas";

const ACTION_INPUTS = {
  idle: "idle",
  happy: "feliz",
  sad: "triste",
  sleep: "dormindo",
  eat: "comendo",
  walk: "andando",
  run: "correndo",
  click: "recebeu_clique",
  levelUp: "ganhou_nivel",
  equip: "equipou_acessorio",
  correct: "aluno_acertou",
  wrong: "aluno_errou",
  eclipse: "nyx_eclipse",
  lunar: "nyx_lunar",
};

export function RivePet({
  src,
  stateMachine = "Pet",
  artboard,
  action = "idle",
  className,
  style,
  fallback = null,
  onReady,
}) {
  const options = useMemo(() => ({
    src,
    stateMachines: stateMachine,
    artboard,
    autoplay: true,
    autoBind: true,
  }), [src, stateMachine, artboard]);

  const { rive, RiveComponent } = useRive(options);

  useEffect(() => {
    if (!rive || !stateMachine) return;
    onReady?.(rive);
    const inputName = ACTION_INPUTS[action] || action;
    const input = rive.stateMachineInputs(stateMachine)?.find(item => item.name === inputName);
    if (!input) return;
    if (typeof input.fire === "function") input.fire();
    else if (typeof input.value === "boolean") input.value = true;
  }, [rive, stateMachine, action, onReady]);

  if (!src) return fallback;
  return <RiveComponent className={className} style={style} aria-label="Mascote animado" />;
}

export { ACTION_INPUTS as RIVE_PET_ACTION_INPUTS };
