const DETAILS = {
  html:{icon:"🌐",title:"Prévia da página",text:"Abra a prévia para ver a estrutura HTML renderizada como uma página de verdade."},
  css:{icon:"🎨",title:"Prévia dos estilos",text:"Abra a prévia para ver suas cores, tamanhos e espaçamentos aplicados aos elementos de exemplo."},
  js:{icon:"⚡",title:"Executar JavaScript",text:"Abra a prévia para executar o código. As mensagens de console.log aparecem no rodapé da página."},
  php:{icon:"🐘",title:"Código PHP",text:"PHP precisa de um servidor para executar. O Nyx ainda pode analisar o arquivo aqui; a execução será feita no ambiente PHP usado pelo professor."},
};

export function LanguageRunPanel({ language, onPreview }) {
  const info=DETAILS[language?.id]||DETAILS.html;
  return <div data-tour="terminal" style={{marginTop:14,background:"linear-gradient(180deg,#1e1430,#171026)",border:"1px solid #3b2a58",borderRadius:12,padding:14}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>{info.icon}</span><div><h4 style={{color:"#f0e9fb",margin:0,fontSize:14}}>{info.title}</h4><p style={{color:"#a99ac9",fontSize:12.5,lineHeight:1.55,margin:"4px 0 0"}}>{info.text}</p></div></div>
    {language?.preview&&<button type="button" onClick={onPreview} style={{marginTop:10,width:"100%",border:0,borderRadius:9,padding:"9px 12px",background:"linear-gradient(135deg,#22d3ee,#8b5cf6)",color:"white",fontWeight:800,cursor:"pointer"}}>👁️ Abrir prévia ao vivo</button>}
  </div>;
}
