import { DF_REGION_GEO } from "../lib/dfRegions.ts";

const BOUNDS={north:-15.48,south:-16.12,west:-48.32,east:-47.48};
const ZOOM=10;
const TILES=2**ZOOM;
const worldX=lng=>(lng+180)/360;
const worldY=lat=>(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2;
const VIEW={left:worldX(BOUNDS.west),right:worldX(BOUNDS.east),top:worldY(BOUNDS.north),bottom:worldY(BOUNDS.south)};
const point=geo=>({
  x:(worldX(geo.lng)-VIEW.left)/(VIEW.right-VIEW.left)*100,
  y:(worldY(geo.lat)-VIEW.top)/(VIEW.bottom-VIEW.top)*100,
});

function mapTiles(){
  const minX=Math.floor(VIEW.left*TILES),maxX=Math.floor(VIEW.right*TILES);
  const minY=Math.floor(VIEW.top*TILES),maxY=Math.floor(VIEW.bottom*TILES);
  const out=[];
  for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)out.push({
    x,y,
    left:(x/TILES-VIEW.left)/(VIEW.right-VIEW.left)*100,
    top:(y/TILES-VIEW.top)/(VIEW.bottom-VIEW.top)*100,
    width:(1/TILES)/(VIEW.right-VIEW.left)*100,
    height:(1/TILES)/(VIEW.bottom-VIEW.top)*100,
  });
  return out;
}
const TILES_IN_VIEW=mapTiles();

export function JourneyMap({ mapped=[], currentRegion, currentCity }) {
  const route=mapped.flatMap(entry=>{
    const geo=DF_REGION_GEO[entry.region];
    return geo?[{...entry,...point(geo)}]:[];
  });
  const currentGeo=currentRegion?DF_REGION_GEO[currentRegion]:null;
  const current=currentGeo?point(currentGeo):null;

  return <div className="journey-real-map" aria-label="Mapa real da jornada da carreta pelo Distrito Federal">
    <div className="journey-map-canvas">
      {TILES_IN_VIEW.map(tile=><img key={`${tile.x}-${tile.y}`} src={`https://tile.openstreetmap.org/${ZOOM}/${tile.x}/${tile.y}.png`} alt="" loading="lazy" referrerPolicy="no-referrer" style={{left:`${tile.left}%`,top:`${tile.top}%`,width:`${tile.width}%`,height:`${tile.height}%`}}/>)}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {route.length>1&&<polyline points={route.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#7c3aed" strokeWidth="1.15" strokeDasharray="2.4 1.5" vectorEffect="non-scaling-stroke"/>}
      </svg>
      {route.map(entry=><button className="journey-map-marker visited" key={entry.order} style={{left:`${entry.x}%`,top:`${entry.y}%`}} title={`${entry.order}. ${entry.city} — ${entry.totalStudents||0} aluno(s), ${entry.totalClasses||0} aula(s)`} aria-label={`Parada ${entry.order}: ${entry.city}`}>{entry.order}</button>)}
      {current&&<span className="journey-map-marker current" style={{left:`${current.x}%`,top:`${current.y}%`}} title={`A carreta está agora em ${currentCity}`} aria-label={`Localização atual: ${currentCity}`}>🚌</span>}
    </div>
    <div className="journey-map-footer"><span><i className="visited-dot"/> cidades visitadas</span>{current&&<span><i className="current-dot"/> localização atual</span>}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></div>
  </div>;
}
