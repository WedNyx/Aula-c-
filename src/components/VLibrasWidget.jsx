import { useEffect } from "react";

// Widget oficial do governo federal para tradução em Libras (vlibras.gov.br).
// Injeta o script oficial só uma vez, mesmo que o componente monte/desmonte várias vezes.
export default function VLibrasWidget() {
  useEffect(() => {
    if (document.getElementById("vlibras-script")) {
      if (window.VLibras) new window.VLibras.Widget("https://vlibras.gov.br/app");
      return;
    }
    const script = document.createElement("script");
    script.id = "vlibras-script";
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    script.onload = () => {
      if (window.VLibras) new window.VLibras.Widget("https://vlibras.gov.br/app");
    };
    document.body.appendChild(script);
  }, []);

  return (
    <div vw="true" className="enabled">
      {/* fallback visual só pra demo local, caso o script oficial não carregue (ex: rede bloqueada) —
          o widget de verdade substitui esse estilo assim que o script injeta o dele. !important força
          o canto superior direito mesmo se o CSS oficial (que por padrão usa o canto inferior) carregar
          depois do nosso */}
      <style>{`
        [vw-access-button] { position: fixed !important; top: 20px !important; right: 20px !important;
          bottom: auto !important; width: 56px; height: 56px; border-radius: 50%; background: #1a237e;
          color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26px;
          box-shadow: 0 4px 14px rgba(0,0,0,.35); z-index: 9999; cursor: pointer; }
        [vw-access-button]::after { content: "🤟"; }
      `}</style>
      <div vw-access-button="true" className="active"></div>
      <div vw-plugin-wrapper="true">
        <div className="vw-plugin-top-wrapper"></div>
      </div>
    </div>
  );
}
