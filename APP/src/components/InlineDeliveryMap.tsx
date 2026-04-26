import React, { useMemo, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

interface Props {
  mode: "dual_address" | "three_point" | "shipper_to_customer";
  destAddress: string;
  destName: string;
  destCoord?: [number, number] | null;
  secondAddress?: string;
  secondName?: string;
  secondCoord?: [number, number] | null;
  shipperAddress?: string;
  shipperName?: string;
  shipperCoord?: [number, number] | null;
  height?: number;
}

const PRIMARY = "#EE4D2D";
const DN_LAT = 16.0544;
const DN_LNG = 108.2022;

function buildHTML(
  mode: string,
  destName: string, destAddr: string, destCoord: [number, number] | null,
  secName: string,  secAddr: string,  secCoord:  [number, number] | null,
  shipCoord: [number, number] | null,
): string {
  type Pt = { lat: number | null; lng: number | null; name: string; addr: string; color: string; label: string };
  const pts: Pt[] =
    mode === "dual_address" ? [
      { lat: destCoord?.[1] ?? null, lng: destCoord?.[0] ?? null, name: destName, addr: destAddr, color: "#F59E0B", label: "Q" },
      { lat: secCoord?.[1]  ?? null, lng: secCoord?.[0]  ?? null, name: secName,  addr: secAddr,  color: "#EF4444", label: "K" },
    ] : mode === "three_point" ? [
      { lat: shipCoord?.[1] ?? null, lng: shipCoord?.[0] ?? null, name: "Vi tri ban", addr: "", color: "#3B82F6", label: "S" },
      { lat: destCoord?.[1] ?? null, lng: destCoord?.[0] ?? null, name: destName, addr: destAddr, color: "#F59E0B", label: "Q" },
      { lat: secCoord?.[1]  ?? null, lng: secCoord?.[0]  ?? null, name: secName,  addr: secAddr,  color: "#EF4444", label: "K" },
    ] : [
      { lat: shipCoord?.[1] ?? null, lng: shipCoord?.[0] ?? null, name: "Vi tri ban", addr: "", color: "#3B82F6", label: "S" },
      { lat: secCoord?.[1]  ?? null, lng: secCoord?.[0]  ?? null, name: secName,  addr: secAddr,  color: "#EF4444", label: "K" },
    ];

  const cfg = JSON.stringify(pts)
    .replace(/</g, "\\u003C").replace(/>/g, "\\u003E").replace(/&/g, "\\u0026");

  return `<!DOCTYPE html><html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#e8edf2;font-family:sans-serif}
#map{position:relative;width:100%;height:100%;overflow:hidden;background:#e8edf2}
#tiles{position:absolute;top:0;left:0;width:100%;height:100%}
#tiles img{position:absolute;width:256px;height:256px;display:block}
#route-svg{position:absolute;top:0;left:0;pointer-events:none}
#markers{position:absolute;top:0;left:0;pointer-events:none}
#info{
  position:absolute;top:8px;left:8px;right:8px;z-index:100;display:none;
  background:rgba(255,255,255,0.97);border-radius:12px;padding:10px 14px;
  box-shadow:0 2px 12px rgba(0,0,0,0.18);
  flex-direction:row;align-items:center;justify-content:center;gap:14px
}
.chip{display:flex;align-items:center;gap:7px}
.cv{font-size:15px;font-weight:700;color:#1E293B}
.cl{font-size:10px;color:#94A3B8}
.divv{width:1px;height:32px;background:#E2E8F0}
#loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#e8edf2;z-index:200}
.spin{width:36px;height:36px;border:3px solid #dde3eb;border-top-color:#3B82F6;border-radius:50%;animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div id="map">
  <div id="tiles"></div>
  <svg id="route-svg"></svg>
  <div id="markers"></div>
  <div id="info">
    <div class="chip">
      <span style="font-size:20px">&#128205;</span>
      <div><div class="cv" id="km">--</div><div class="cl">Quang duong</div></div>
    </div>
    <div class="divv"></div>
    <div class="chip">
      <span style="font-size:20px">&#9201;</span>
      <div><div class="cv" id="tm">--</div><div class="cl">Du kien</div></div>
    </div>
  </div>
  <div id="loading"><div class="spin"></div></div>
</div>
<script>
var PTS=${cfg};
var Z=14, CLng=${DN_LNG}, CLat=${DN_LAT};
var W=window.innerWidth, H=window.innerHeight;
var TS=256;

var tilesDiv=document.getElementById('tiles');
var svg=document.getElementById('route-svg');
var markerDiv=document.getElementById('markers');
svg.setAttribute('width',W); svg.setAttribute('height',H); svg.setAttribute('style','position:absolute;top:0;left:0;pointer-events:none');

// Mercator world pixel from lng/lat at zoom Z
function wx(lng){return((lng+180)/360)*Math.pow(2,Z)*TS;}
function wy(lat){var s=Math.sin(lat*Math.PI/180);return(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*Math.pow(2,Z)*TS;}

// Screen coords
function toScr(lng,lat){return{x:W/2+(wx(lng)-wx(CLng)),y:H/2+(wy(lat)-wy(CLat))};}

var tileEls={};
function redraw(){
  var wcx=wx(CLng),wcy=wy(CLat);
  var tx0=Math.floor((wcx-W/2)/TS)-1, ty0=Math.floor((wcy-H/2)/TS)-1;
  var tx1=Math.ceil((wcx+W/2)/TS)+1,  ty1=Math.ceil((wcy+H/2)/TS)+1;
  var n=Math.pow(2,Z);

  // Remove stale tiles
  Object.keys(tileEls).forEach(function(k){
    var p=k.split('/'); if(+p[0]!==Z||+p[1]<tx0||+p[1]>tx1||+p[2]<ty0||+p[2]>ty1){tilesDiv.removeChild(tileEls[k]);delete tileEls[k];}
  });

  // Add new tiles
  for(var tx=tx0;tx<=tx1;tx++){
    for(var ty=ty0;ty<=ty1;ty++){
      if(ty<0||ty>=n)continue;
      var ttx=((tx%n)+n)%n;
      var k=Z+'/'+ttx+'/'+ty;
      if(!tileEls[k]){
        var img=document.createElement('img');
        img.src='https://a.basemaps.cartocdn.com/rastertiles/voyager/'+Z+'/'+ttx+'/'+ty+'.png';
        tilesDiv.appendChild(img);
        tileEls[k]=img;
      }
      tileEls[k].style.left=Math.round(W/2+(tx*TS-wcx))+'px';
      tileEls[k].style.top=Math.round(H/2+(ty*TS-wcy))+'px';
    }
  }

  // Route SVG
  svg.innerHTML='';
  if(window.routeCoords&&window.routeCoords.length>1){
    var pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    var pts=window.routeCoords.map(function(c){var p=toScr(c[0],c[1]);return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');
    pl.setAttribute('points',pts);
    pl.setAttribute('stroke','#3B82F6');
    pl.setAttribute('stroke-width','5');
    pl.setAttribute('fill','none');
    pl.setAttribute('stroke-linecap','round');
    pl.setAttribute('stroke-linejoin','round');
    pl.setAttribute('opacity','0.85');
    svg.appendChild(pl);
  }

  // Markers
  markerDiv.innerHTML='';
  PTS.forEach(function(pt){
    if(pt.lat==null||pt.lng==null)return;
    var p=toScr(pt.lng,pt.lat);
    var d=document.createElement('div');
    d.style.cssText='position:absolute;width:30px;height:38px;margin-left:-15px;margin-top:-38px;left:'+p.x+'px;top:'+p.y+'px';
    d.innerHTML='<svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">'+
      '<path d="M15 0C6.72 0 0 6.72 0 15c0 9.33 15 23 15 23S30 24.33 30 15C30 6.72 23.28 0 15 0z" fill="'+pt.color+'"/>'+
      '<circle cx="15" cy="15" r="8" fill="white"/>'+
      '<text x="15" y="19" text-anchor="middle" font-size="10" font-weight="bold" fill="'+pt.color+'">'+pt.label+'</text>'+
    '</svg>';
    markerDiv.appendChild(d);
  });
}

// Touch drag
var drag=false,lx=0,ly=0;
document.addEventListener('touchstart',function(e){if(e.touches.length===1){drag=true;lx=e.touches[0].clientX;ly=e.touches[0].clientY;}});
document.addEventListener('touchmove',function(e){
  if(!drag||e.touches.length!==1)return;
  e.preventDefault();
  var dx=e.touches[0].clientX-lx, dy=e.touches[0].clientY-ly;
  lx=e.touches[0].clientX; ly=e.touches[0].clientY;
  var n=Math.pow(2,Z)*TS;
  var wcx=wx(CLng)-dx, wcy=wy(CLat)-dy;
  CLng=wcx/n*360-180;
  CLat=(Math.atan(Math.sinh(Math.PI*(1-2*wcy/n)))*180/Math.PI);
  redraw();
},{passive:false});
document.addEventListener('touchend',function(){drag=false;});

// Pinch zoom
var lpd=0;
document.addEventListener('touchstart',function(e){if(e.touches.length===2)lpd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);});
document.addEventListener('touchmove',function(e){
  if(e.touches.length!==2)return;
  var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
  if(d>lpd+30&&Z<18){Z++;tileEls={};tilesDiv.innerHTML='';redraw();}
  else if(d<lpd-30&&Z>10){Z--;tileEls={};tilesDiv.innerHTML='';redraw();}
  lpd=d;
},{passive:false});

// Geocode: chỉ dùng địa chỉ (addr), KHÔNG dùng tên người (name) để tìm đúng vị trí
// Ưu tiên NDAMaps (tốt cho VN), fallback Nominatim
var NDA_KEY='qrm8fXPZ7HM4nqYZVrEhFepxgxnzarmG';
async function geocode(name,addr){
  // Chỉ geocode bằng địa chỉ, bỏ qua tên người nhận
  var query = addr && addr.trim() ? addr.trim() : (name && name.trim() ? name.trim() : null);
  if(!query) return null;

  // Bước 1: Thử NDAMaps (chính xác hơn cho địa chỉ VN)
  try{
    var url1='https://mapapis.ndamaps.vn/v1/geocode/forward?text='+encodeURIComponent(query)+'&apikey='+NDA_KEY;
    var r1=await fetch(url1,{headers:{'User-Agent':'FoodBeeApp'}});
    var d1=await r1.json();
    if(d1&&d1.features&&d1.features[0]){
      var c=d1.features[0].geometry.coordinates;
      return{lat:c[1],lng:c[0]};
    }
  }catch(e){}

  // Bước 2: Fallback Nominatim
  try{
    var q=encodeURIComponent(query+', Vietnam');
    var r2=await fetch('https://nominatim.openstreetmap.org/search?q='+q+'&format=json&limit=1&countrycodes=vn',{headers:{'Accept-Language':'vi','User-Agent':'FoodBeeApp'}});
    var d2=await r2.json();
    if(d2&&d2[0])return{lat:+d2[0].lat,lng:+d2[0].lon};
  }catch(e){}

  return null;
}

// OSRM route
async function getRoute(vld){
  try{
    var cs=vld.map(function(p){return p.lng+','+p.lat;}).join(';');
    var r=await fetch('https://router.project-osrm.org/route/v1/driving/'+cs+'?overview=full&geometries=geojson');
    var d=await r.json();
    if(d.code==='Ok'&&d.routes&&d.routes[0]){
      var rt=d.routes[0];
      window.routeCoords=rt.geometry.coordinates;
      var km=rt.distance>=1000?(rt.distance/1000).toFixed(1)+' km':Math.round(rt.distance)+' m';
      var mn=Math.round(rt.duration/60);
      var tm=mn<60?mn+' phut':Math.floor(mn/60)+' gio '+(mn%60?mn%60+' phut':'');
      document.getElementById('km').textContent=km;
      document.getElementById('tm').textContent=tm;
      document.getElementById('info').style.display='flex';
      // Fit map to route
      var lngs=rt.geometry.coordinates.map(function(c){return c[0];});
      var lats=rt.geometry.coordinates.map(function(c){return c[1];});
      CLng=(Math.min.apply(null,lngs)+Math.max.apply(null,lngs))/2;
      CLat=(Math.min.apply(null,lats)+Math.max.apply(null,lats))/2;
      var span=Math.max(Math.max.apply(null,lngs)-Math.min.apply(null,lngs),Math.max.apply(null,lats)-Math.min.apply(null,lats));
      Z=span>0.1?12:span>0.04?13:span>0.015?14:15;
    }
  }catch(e){}
}

// Main
(async function(){
  for(var i=0;i<PTS.length;i++){
    var p=PTS[i];
    if(p.lat==null||p.lng==null){
      var gc=await geocode(p.name,p.addr);
      if(gc){p.lat=gc.lat;p.lng=gc.lng;}else{p.lat=${DN_LAT};p.lng=${DN_LNG};}
    }
  }
  var vld=PTS.filter(function(p){return p.lat!==null;});
  if(vld.length>0){CLng=vld[0].lng;CLat=vld[0].lat;}
  if(vld.length>=2)await getRoute(vld);
  else if(vld.length===1){CLng=vld[0].lng;CLat=vld[0].lat;Z=15;}
  document.getElementById('loading').style.display='none';
  redraw();
})();
</script>
</body></html>`;
}

const InlineDeliveryMap: React.FC<Props> = ({
  mode, destAddress, destName,
  destCoord = null, secondAddress = "", secondName = "",
  secondCoord = null, shipperCoord = null, height,
}) => {
  const mapHeight = height ?? hp("42%");
  const [loading, setLoading] = useState(true);

  const html = useMemo(() => buildHTML(
    mode,
    destName, destAddress, destCoord ?? null,
    secondName, secondAddress, secondCoord ?? null,
    shipperCoord ?? null,
  ), [mode, destName, destAddress, destCoord, secondName, secondAddress, secondCoord, shipperCoord]);

  return (
    <View style={[styles.container, { height: mapHeight }]}>
      <WebView
        source={{ html, baseUrl: "https://openstreetmap.org" }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        originWhitelist={["*"]}
        allowUniversalAccessFromFileURLs
        allowFileAccess
        allowFileAccessFromFileURLs
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%", overflow: "hidden", backgroundColor: "#F0F4F8" },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F4F8" },
});

export default InlineDeliveryMap;
