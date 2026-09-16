let PhaserModule;

async function loadPhaser() {
  PhaserModule ||= import("phaser");
  const mod = await PhaserModule;
  return mod.default || mod;
}

export async function mountNyxGame({ parent, width = 960, height = 540, scene, config = {} }) {
  if (!parent) throw new Error("mountNyxGame precisa de um elemento parent.");
  const Phaser = await loadPhaser();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#0c0718",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "matter",
      matter: { gravity: { y: 0 }, debug: false },
    },
    scene,
    ...config,
  });
  parent.__nyxGame = game;
  return () => {
    if (parent.__nyxGame === game) delete parent.__nyxGame;
    game.destroy(true);
  };
}

export async function phaserApi() {
  return loadPhaser();
}
