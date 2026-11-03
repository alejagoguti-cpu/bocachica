import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createSea} from './sea-surface.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=s=>document.querySelector(s);
const SOURCE='https://raw.githubusercontent.com/alejagoguti-cpu/tesis/808cab5c59a1746063b0b27c6e239ea70e8b6f33/public/';
const R=6378137,UNIT=.1;
const mercator=(lon,lat)=>[R*lon*Math.PI/180,R*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
const origin=mercator(-75.575,10.35);
const local=(lon,lat,height=0)=>{const m=mercator(lon,lat);return new THREE.Vector3((m[0]-origin[0])*UNIT,height*UNIT,(origin[1]-m[1])*UNIT);};
const tileLL=(x,y,z)=>[x/2**z*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y/2**z)))*180/Math.PI];
const llTile=(lon,lat,z)=>[(lon+180)/360*2**z,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z];
const image=url=>new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Recurso no disponible: '+url));img.src=url;});

export function createTerritoryModel(host,status){
 host.replaceChildren();host.style.background='#aac9ce';const VW=()=>host.clientWidth||innerWidth,VH=()=>host.clientHeight||innerHeight;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#aac9ce');
 const camera=new THREE.PerspectiveCamera(38,VW()/VH(),1,20000);
 let renderer,software=false;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(VW(),VH());renderer.setClearColor('#aac9ce');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;}catch{software=true;const canvas=document.createElement('canvas');renderer={domElement:canvas,setSize(w,h){canvas.width=w;canvas.height=h;},render:drawSoftware};renderer.setSize(VW(),VH());}
 host.append(renderer.domElement);renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;';renderer.domElement.setAttribute('aria-label','Maqueta tridimensional georreferenciada de toda Tierra Bomba');
 const dots=document.createElement('canvas');dots.className='model-dots';dots.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';host.append(dots);const pointLayers=new Map();let highlight=null;
 const labels=document.createElement('div');labels.className='model-labels';host.append(labels);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.screenSpacePanning=false;controls.minDistance=35;controls.maxDistance=3600;controls.maxPolarAngle=Math.PI*.49;controls.target.set(-120,0,0);
 scene.add(new THREE.AmbientLight('#ffffff',2));const sun=new THREE.DirectionalLight('#fff8e9',2.5);sun.position.set(-400,1000,500);scene.add(sun);
 const sea=createSea({scene,camera,host,software});
 const roadGroup=new THREE.Group();scene.add(roadGroup);const roadFaces=[];let roadsOn=true;
 const terrainGroup=new THREE.Group(),buildingGroup=new THREE.Group(),constructionGroup=new THREE.Group();buildingGroup.visible=false;scene.add(terrainGroup,constructionGroup,buildingGroup);
 const handlers={},landmarks=[],terrainFaces=[],wallFaces=[],buildingFaces=[],constructionFaces=[];
 let terrainData=null,texture=null,modelTexture=null,terrainMesh=null,terrainOn=true,base='satellite',pitch=48,bearing=-12,ready=false,reliefReady=false,buildingReady=false;
 let dirty=true,lastDraw=0,elevationAt=()=>0,constructionCount=0,revitRequested=false;
 function emit(name,data){(handlers[name]||[]).forEach(fn=>fn(data));}
 function reset(){const distance=VW()<700?1750:1450;const target=new THREE.Vector3(-20,0,40);controls.target.copy(target);const theta=-12*Math.PI/180,phi=48*Math.PI/180;camera.position.set(target.x+Math.sin(theta)*Math.cos(phi)*distance,Math.sin(phi)*distance,target.z+Math.cos(theta)*Math.cos(phi)*distance);camera.lookAt(target);dirty=true;}
 function move(opts={}){if(opts.center){controls.target.copy(local(...opts.center));}if(opts.pitch!==undefined)pitch=opts.pitch;if(opts.bearing!==undefined)bearing=opts.bearing;const distance=opts.zoom?Math.max(50,1500/2**(opts.zoom-12.8)):camera.position.distanceTo(controls.target);const theta=bearing*Math.PI/180,phi=(90-pitch)*Math.PI/180;camera.position.set(controls.target.x+Math.sin(theta)*Math.cos(phi)*distance,Math.sin(phi)*distance,controls.target.z+Math.cos(theta)*Math.cos(phi)*distance);dirty=true;}
 function resize(){const w=VW(),h=VH();if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);const r=Math.min(devicePixelRatio,2);dots.width=Math.round(w*r);dots.height=Math.round(h*r);dirty=true;}
 reset();
 controls.addEventListener('change',()=>dirty=true);controls.addEventListener('start',()=>emit('dragstart',{}));
 let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()};});renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);if(moved<7&&performance.now()-down.t<700){const box=host.getBoundingClientRect();emit('click',{x:e.clientX-box.left,y:e.clientY-box.top});}down=null;});
 new ResizeObserver(()=>resize()).observe(host);
 function updateLabels(){camera.updateMatrixWorld();landmarks.forEach(item=>{const p=item.position.clone().project(camera);item.el.style.transform=`translate(-50%,-100%) translate(${(p.x*.5+.5)*VW()}px,${(-p.y*.5+.5)*VH()}px)`;item.el.style.visibility=p.z<1&&p.z>-1?'visible':'hidden';});}
 function renderLoop(time){requestAnimationFrame(renderLoop);if(host.hidden)return;controls.update();sea.update(time,dirty);if(!software)dirty=true;if(dirty&&time-lastDraw>(software?55:12)){camera.updateMatrixWorld();renderer.render(scene,camera);updateLabels();drawDots();dirty=false;lastDraw=time;}}requestAnimationFrame(renderLoop);
 function project(v){const p=v.clone().project(camera);return{x:(p.x*.5+.5)*VW(),y:(-.5*p.y+.5)*VH(),z:p.z};}
 function drawDots(){const r=dots.width/(VW()||1),ctx=dots.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,dots.width,dots.height);ctx.setTransform(r,0,0,r,0,0);const near=Math.max(.6,Math.min(1.8,900/camera.position.distanceTo(controls.target)));
  for(const layer of pointLayers.values()){if(!layer.visible)continue;for(const pt of layer.points){if(!pt.v)continue;const p=project(pt.v);pt.sx=p.x;pt.sy=p.y;pt.on=p.z<1&&p.z>-1&&p.x>-20&&p.y>-20&&p.x<VW()+20&&p.y<VH()+20;if(!pt.on)continue;const rad=(pt.r||4)*near;ctx.beginPath();ctx.arc(p.x,p.y,rad,0,7);ctx.fillStyle=pt.color;ctx.fill();if(layer.stroke!==false){ctx.lineWidth=1.4;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.stroke();}}}
  if(highlight){for(const layer of pointLayers.values()){if(!layer.visible)continue;for(const pt of layer.points){if(!pt.on||!highlight(pt.data))continue;ctx.beginPath();ctx.arc(pt.sx,pt.sy,(pt.r||4)*near+5,0,7);ctx.lineWidth=3;ctx.strokeStyle='#113542';ctx.stroke();ctx.beginPath();ctx.arc(pt.sx,pt.sy,(pt.r||4)*near+2,0,7);ctx.lineWidth=2;ctx.strokeStyle='#ffffff';ctx.stroke();}}}}
 function placePoints(layer){for(const pt of layer.points){pt.v=local(pt.lon,pt.lat,Math.max(0,elevationAt(pt.lon,pt.lat))+(layer.lift??2));}}
 function trianglePath(ctx,a,b,c){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();}
 function drawTextureTriangle(ctx,face,screen){const [a,b,c]=screen,[u0,v0,u1,v1,u2,v2]=face.uv,den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(Math.abs(den)<.001)return;ctx.save();const mx=(a.x+b.x+c.x)/3,my=(a.y+b.y+c.y)/3,expand=p=>{const dx=p.x-mx,dy=p.y-my,len=Math.hypot(dx,dy)||1;return{x:p.x+dx/len*.65,y:p.y+dy/len*.65};};trianglePath(ctx,...[a,b,c].map(expand));ctx.clip();const A=(a.x*(v1-v2)+b.x*(v2-v0)+c.x*(v0-v1))/den,B=(a.y*(v1-v2)+b.y*(v2-v0)+c.y*(v0-v1))/den,C=(a.x*(u2-u1)+b.x*(u0-u2)+c.x*(u1-u0))/den,D=(a.y*(u2-u1)+b.y*(u0-u2)+c.y*(u1-u0))/den,E=(a.x*(u1*v2-u2*v1)+b.x*(u2*v0-u0*v2)+c.x*(u0*v1-u1*v0))/den,F=(a.y*(u1*v2-u2*v1)+b.y*(u2*v0-u0*v2)+c.y*(u0*v1-u1*v0))/den;ctx.transform(A,B,C,D,E,F);ctx.drawImage(base==='satellite'?texture:modelTexture,0,0);ctx.restore();}
 function drawSoftware(){const ctx=renderer.domElement.getContext('2d');ctx.clearRect(0,0,VW(),VH());if(!terrainData)return;const layers=[[...wallFaces,...terrainFaces],roadsOn?roadFaces:[],[...(constructionGroup.visible?constructionFaces.filter(f=>f.roof||camera.position.distanceTo(f.center)<300):[]),...(buildingGroup.visible?buildingFaces:[])]];for(const list of layers){const projected=list.map(face=>({face,p:face.v.map(project)})).filter(x=>x.p.every(p=>p.z<1&&p.z>-1));projected.sort((a,b)=>(b.p[0].z+b.p[1].z+b.p[2].z)-(a.p[0].z+a.p[1].z+a.p[2].z));for(const {face,p}of projected){if(face.uv&&texture){drawTextureTriangle(ctx,face,p);}else{trianglePath(ctx,...p);ctx.fillStyle=face.color||'#d8dfd3';ctx.fill();}}}}
 async function loadTerrain(){
  status('Cargando la isla…');
  const [sat,mask]=await Promise.all([image(SOURCE+'textures/sat_base.jpg'),image(SOURCE+'textures/isla_mascara.png')]);
  const W=software?1024:1445,H=Math.round(W*2578/1445),canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');ctx.drawImage(sat,231/2560*sat.width,1734/4352*sat.height,1445/2560*sat.width,2578/4352*sat.height,0,0,W,H);
  const maskCanvas=document.createElement('canvas');maskCanvas.width=W;maskCanvas.height=H;const mctx=maskCanvas.getContext('2d');mctx.drawImage(mask,0,0,W,H);const maskPixels=mctx.getImageData(0,0,W,H).data;
  const pixels=ctx.getImageData(0,0,W,H);for(let i=0;i<pixels.data.length;i+=4)pixels.data[i+3]=maskPixels[i];ctx.putImageData(pixels,0,0);texture=canvas;modelTexture=document.createElement('canvas');modelTexture.width=W;modelTexture.height=H;const modelCtx=modelTexture.getContext('2d'),modelPixels=modelCtx.createImageData(W,H);for(let i=0;i<modelPixels.data.length;i+=4){modelPixels.data[i]=220;modelPixels.data[i+1]=228;modelPixels.data[i+2]=218;modelPixels.data[i+3]=maskPixels[i];}modelCtx.putImageData(modelPixels,0,0);
  const alpha=(u,v)=>maskPixels[(Math.min(H-1,Math.max(0,Math.round(v*(H-1))))*W+Math.min(W-1,Math.max(0,Math.round(u*(W-1)))))*4];
  const geo={z:15,x0:9502+231/256,y0:15426+1734/256,nx:1445/256,ny:2578/256};
  const heightTiles=new Map(),tz=12,corners=[[0,0],[1,1]].map(([u,v])=>tileLL(geo.x0+u*geo.nx,geo.y0+v*geo.ny,geo.z)).map(ll=>llTile(...ll,tz));
  const tasks=[];for(let x=Math.floor(corners[0][0]);x<=Math.floor(corners[1][0]);x++)for(let y=Math.floor(corners[0][1]);y<=Math.floor(corners[1][1]);y++)tasks.push((async()=>{const img=await image(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${tz}/${x}/${y}.png`);const c=document.createElement('canvas');c.width=c.height=256;const context=c.getContext('2d');context.drawImage(img,0,0);heightTiles.set(x+','+y,context.getImageData(0,0,256,256).data);})());
  const results=await Promise.allSettled(tasks);reliefReady=results.every(r=>r.status==='fulfilled');
  function elevation(lon,lat){const [x,y]=llTile(lon,lat,tz),data=heightTiles.get(Math.floor(x)+','+Math.floor(y));if(!data)return 0;const ix=Math.max(0,Math.min(255,Math.floor((x-Math.floor(x))*256))),iy=Math.max(0,Math.min(255,Math.floor((y-Math.floor(y))*256))),i=(iy*256+ix)*4;return data[i]*256+data[i+1]+data[i+2]/256-32768;}
  elevationAt=elevation;
  const NX=software?42:96,NY=software?74:168,vertices=[],uv=[],indices=[],heightValues=[];
  for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const u=i/NX,v=j/NY,[lon,lat]=tileLL(geo.x0+u*geo.nx,geo.y0+v*geo.ny,geo.z);const h=elevation(lon,lat);heightValues.push(h);vertices.push(local(lon,lat,h));uv.push([u*W,v*H]);}
  const edgeCount=new Map();const edgeKey=(a,b)=>a<b?a+','+b:b+','+a;
  const add=(a,b,c)=>{indices.push(a,b,c);terrainFaces.push({v:[vertices[a],vertices[b],vertices[c]],uv:[...uv[a],...uv[b],...uv[c]],color:'#d5ddcc'});for(const [x,y]of [[a,b],[b,c],[c,a]]){const key=edgeKey(x,y),prev=edgeCount.get(key);edgeCount.set(key,prev?{...prev,count:prev.count+1}:{a:x,b:y,count:1});}};
  for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){if(Math.max(alpha(i/NX,j/NY),alpha((i+1)/NX,j/NY),alpha(i/NX,(j+1)/NY),alpha((i+1)/NX,(j+1)/NY),alpha((i+.5)/NX,(j+.5)/NY))<128)continue;const a=j*(NX+1)+i,b=a+1,d=a+NX+1,e=d+1;add(a,d,b);add(b,d,e);}
  // Trace the source mask with marching squares; coastline walls follow its
  // contour instead of the much coarser terrain grid. The lower plinth is an
  // exhibition support and never represents bathymetry.
  const cases={1:[[3,0]],2:[[0,1]],3:[[3,1]],4:[[1,2]],5:[[3,0],[1,2]],6:[[0,2]],7:[[3,2]],8:[[2,3]],9:[[0,2]],10:[[0,1],[2,3]],11:[[1,2]],12:[[3,1]],13:[[0,1]],14:[[3,0]]};
  for(let py=0;py<H-4;py+=4)for(let px=0;px<W-4;px+=4){
   const coords=[[px,py],[px+4,py],[px+4,py+4],[px,py+4]],values=coords.map(([x,y])=>maskPixels[(y*W+x)*4]),code=values.reduce((n,v,i)=>n+(v>=128?1<<i:0),0);if(!cases[code])continue;
   const edgePoint=edge=>{const pairs=[[0,1],[1,2],[2,3],[3,0]],[i,j]=pairs[edge],t=(128-values[i])/(values[j]-values[i]||1),x=coords[i][0]+(coords[j][0]-coords[i][0])*t,y=coords[i][1]+(coords[j][1]-coords[i][1])*t,[lon,lat]=tileLL(geo.x0+x/W*geo.nx,geo.y0+y/H*geo.ny,geo.z);return local(lon,lat,elevation(lon,lat));};
   for(const [ea,eb]of cases[code]){const a=edgePoint(ea),b=edgePoint(eb),c=new THREE.Vector3(b.x,-.06,b.z),d=new THREE.Vector3(a.x,-.06,a.z);wallFaces.push({v:[a,b,c],color:'#759793'},{v:[a,c,d],color:'#7d9e99'});}
  }
  terrainData={vertices,indices,heightValues};
  // Sample the displayed triangle surface, so streets stay on the mesh
  // instead of crossing between independent elevation samples.
  elevationAt=(lon,lat)=>{const [tx,ty]=llTile(lon,lat,geo.z),gx=(tx-geo.x0)/geo.nx*NX,gy=(ty-geo.y0)/geo.ny*NY,ix=Math.max(0,Math.min(NX-1,Math.floor(gx))),iy=Math.max(0,Math.min(NY-1,Math.floor(gy))),fx=Math.max(0,Math.min(1,gx-ix)),fy=Math.max(0,Math.min(1,gy-iy)),a=iy*(NX+1)+ix,b=a+1,d=a+NX+1,e=d+1;return fx+fy<=1?heightValues[a]+(heightValues[b]-heightValues[a])*fx+(heightValues[d]-heightValues[a])*fy:heightValues[e]+(heightValues[d]-heightValues[e])*(1-fx)+(heightValues[b]-heightValues[e])*(1-fy);};
  if(!software){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(v=>v.toArray()),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv.flatMap(([u,v])=>[u/W,1-v/H]),2));g.setIndex(indices);g.computeVertexNormals();const mapTexture=new THREE.CanvasTexture(canvas);mapTexture.colorSpace=THREE.SRGBColorSpace;terrainMesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:mapTexture,alphaTest:.5,side:THREE.DoubleSide,roughness:1}));terrainGroup.add(terrainMesh);const walls=new THREE.BufferGeometry();walls.setAttribute('position',new THREE.Float32BufferAttribute(wallFaces.flatMap(f=>f.v.flatMap(v=>v.toArray())),3));walls.computeVertexNormals();terrainGroup.add(new THREE.Mesh(walls,new THREE.MeshStandardMaterial({color:'#789a95',side:THREE.DoubleSide,roughness:1})));}
  ready=true;dirty=true;landmarks.forEach(item=>item.position=local(...item.coord,Math.max(0,elevationAt(...item.coord))+item.lift));pointLayers.forEach(placePoints);emit('load',{});status(reliefReady?'':'La isla cargó sin relieve: no se pudieron descargar las alturas.');
  const tt=$('#terrain-toggle');if(tt){tt.checked=reliefReady;tt.disabled=!reliefReady;}
 }
 async function loadRoads(){
  const data=await fetch('assets/vias_tierra_bomba.json').then(r=>{if(!r.ok)throw Error('Vías no disponibles');return r.json();});const packed=[];
  for(const road of data.roads){
   // Width is cartographic emphasis, not a surveyed street dimension.
   const half=['path','footway','steps'].includes(road.type)?.13:.25;
   for(let i=1;i<road.points.length;i++){
    const aa=road.points[i-1],bb=road.points[i],length=local(...aa).distanceTo(local(...bb)),steps=Math.max(1,Math.ceil(length/2));
    for(let k=0;k<steps;k++){const point=t=>{const lon=aa[0]+(bb[0]-aa[0])*t,lat=aa[1]+(bb[1]-aa[1])*t;return local(lon,lat,Math.max(0,elevationAt(lon,lat))+.65);};const a=point(k/steps),b=point((k+1)/steps),delta=b.clone().sub(a),len=Math.hypot(delta.x,delta.z);if(len<.001)continue;const n=new THREE.Vector3(-delta.z/len*half,0,delta.x/len*half),v=[a.clone().add(n),b.clone().add(n),b.clone().sub(n),a.clone().sub(n)];for(const ids of [[0,1,2],[0,2,3]]){const tri=ids.map(j=>v[j]);roadFaces.push({v:tri,color:['path','footway','steps'].includes(road.type)?'#d5c497':'#ede4ce'});packed.push(...tri.flatMap(x=>x.toArray()));}}
   }
  }
  if(!software&&packed.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(packed,3));g.computeVertexNormals();roadGroup.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:'#eee4cc',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})));}
  host.dataset.roadCount=String(data.roads.length);host.dataset.roadSource=data.source;dirty=true;
 }
 async function loadConstructionFootprints(){
  const response=await fetch('assets/construcciones_tierra_bomba.json.gz');if(!response.ok)throw Error('No se pudo cargar la capa insular de construcciones');
  const bytes=new Uint8Array(await response.arrayBuffer());const data=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));
  const packed=[];let withHeight=0;
  for(const [sourceIndex,height,rawRing] of data.buildings){
   const ring=rawRing.length>3&&rawRing[0][0]===rawRing.at(-1)[0]&&rawRing[0][1]===rawRing.at(-1)[1]?rawRing.slice(0,-1):rawRing;
   if(ring.length<3)continue;const lon=ring.reduce((a,p)=>a+p[0],0)/ring.length,lat=ring.reduce((a,p)=>a+p[1],0)/ring.length;
   const ground=elevationAt(lon,lat),center=local(lon,lat,ground),shape=new THREE.Shape(),points=ring.map(ll=>local(...ll));
   shape.moveTo(points[0].x,-points[0].z);for(let i=1;i<points.length;i++)shape.lineTo(points[i].x,-points[i].z);shape.closePath();
   if(height===null||!Number.isFinite(height)||height<=0)continue;
   // Source-provided reference massing only: never a measured-height claim.
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:height*UNIT,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,ground*UNIT,0);const positions=geometry.attributes.position;
   for(let i=0;i<positions.count;i+=3){const v=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(positions,i+k));const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();const roof=normal.y>.5;const bottom=normal.y<-.5;if(bottom)continue;const color=roof?'#fffefa':normal.x>.2?'#d4dcd8':'#edf0ec';constructionFaces.push({v,color,roof,center,sourceIndex});if(!software)packed.push(...v.flatMap(p=>p.toArray()));}
   constructionCount++;withHeight++;geometry.dispose();
  }
  if(!software&&packed.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(packed,3));g.computeVertexNormals();constructionGroup.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#fffefa',roughness:1,side:THREE.DoubleSide})));}
  host.dataset.constructionCount=String(constructionCount);host.dataset.constructionHeightStatus='reference';host.dataset.constructionSource=data.meta.source_file;
  const countEl=$('#building-count');if(countEl)countEl.textContent=constructionCount.toLocaleString('es-CO')+' huellas';
  const legend=$('#building-legend');if(legend)legend.hidden=false;dirty=true;emit('buildingsloaded',{count:constructionCount,heightStatus:'reference'});
  status('');
 }
 async function loadBuildings(){
  const [geo,gltf]=await Promise.all([fetch(SOURCE+'data/tierrabomba/georef.json').then(r=>r.json()),new GLTFLoader().loadAsync(SOURCE+'models/tierrabomba_revit.glb')]);
  const cos=Math.cos(geo.rot),sin=Math.sin(geo.rot),toLL=(x,y)=>{const px=(x-geo.tx)/geo.sc,py=(y-geo.ty)/geo.sc;return[geo.lon0+(px*cos+py*sin)/geo.kx,geo.lat0+(-px*sin+py*cos)/geo.ky];};
  let count=0;
  gltf.scene.traverse(mesh=>{if(!mesh.isMesh||!/building/i.test(mesh.name))return;const geometry=mesh.geometry.clone(),positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const ll=toLL(positions.getX(i),positions.getY(i)),p=local(...ll,positions.getZ(i));positions.setXYZ(i,p.x,p.y,p.z);}geometry.deleteAttribute('color');geometry.computeVertexNormals();const model=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#fffefa',roughness:.8,side:THREE.DoubleSide}));buildingGroup.add(model);const index=geometry.index,faces=(index?index.count:positions.count)/3;const step=software?Math.max(1,Math.ceil(faces/16000)):1;for(let f=0;f<faces;f+=step){const ids=[0,1,2].map(k=>index?index.getX(f*3+k):f*3+k);buildingFaces.push({v:ids.map(id=>new THREE.Vector3().fromBufferAttribute(positions,id)),color:f%3===0?'#fffefa':f%3===1?'#cdd5d2':'#e8ece7'});}count++;});
  buildingReady=count>0;host.dataset.revitMeshCount=String(count);dirty=true;
 }
 loadTerrain().then(()=>Promise.allSettled([loadRoads().catch(error=>console.warn('Vías no disponibles',error)),loadConstructionFootprints().catch(error=>{status('No se pudo cargar la capa insular de construcciones');console.error(error);}),])).catch(error=>{status('No se pudo construir la maqueta territorial. Revisa la conexión a los recursos.');console.error(error);});
 return{isTerritoryModel:true,setRoads(value){roadsOn=!!value;roadGroup.visible=roadsOn;dirty=true;},setBuildings(value){constructionGroup.visible=!!value;dirty=true;},setRevit(value){buildingGroup.visible=!!value;if(value&&!revitRequested){revitRequested=true;status('Cargando el modelo Revit…');loadBuildings().then(()=>status('Modelo Revit del sector modelado')).catch(error=>{status('No se pudo cargar el modelo Revit');console.warn(error);});}dirty=true;},getBuildingSummary(){return{count:constructionCount,referenceHeights:true};},on(name,fn){(handlers[name]||=[]).push(fn);},fitBounds(){reset();},resize,getPitch(){return pitch;},getBearing(){return bearing;},rotateTo(value){bearing=value;move();},easeTo:move,flyTo:move,zoomIn(){camera.position.sub(controls.target).multiplyScalar(.8).add(controls.target);dirty=true;},zoomOut(){camera.position.sub(controls.target).multiplyScalar(1.25).add(controls.target);dirty=true;},setLayoutProperty(id,key,value){if(value!=='visible')return;base=id==='satellite'?'satellite':'model';if(terrainMesh){terrainMesh.material.map=new THREE.CanvasTexture(base==='satellite'?texture:modelTexture);terrainMesh.material.map.colorSpace=THREE.SRGBColorSpace;terrainMesh.material.needsUpdate=true;}dirty=true;},setTerrain(value){terrainOn=!!value;if(!terrainData)return;terrainData.vertices.forEach((v,i)=>v.y=terrainOn?terrainData.heightValues[i]*UNIT:0);if(terrainMesh){const p=terrainMesh.geometry.attributes.position;terrainData.vertices.forEach((v,i)=>p.setY(i,v.y));p.needsUpdate=true;terrainMesh.geometry.computeVertexNormals();}dirty=true;},addPlace(el,coord,lift=4){el.style.position='absolute';labels.append(el);const item={el,coord,lift,position:local(...coord,Math.max(0,elevationAt(...coord))+lift)};landmarks.push(item);dirty=true;return{getElement:()=>el,remove(){el.remove();landmarks.splice(landmarks.indexOf(item),1);dirty=true;}};},
  refreshPlaces(){landmarks.forEach(item=>item.position=local(...item.coord,Math.max(0,elevationAt(...item.coord))+item.lift));pointLayers.forEach(placePoints);dirty=true;},
  setPoints(id,points,opts={}){const layer={points:points.map(p=>({...p})),visible:opts.visible??true,lift:opts.lift,stroke:opts.stroke};placePoints(layer);pointLayers.set(id,layer);dirty=true;},
  setPointsVisible(id,value){const layer=pointLayers.get(id);if(layer){layer.visible=!!value;dirty=true;}},
  setHighlight(fn){highlight=fn||null;dirty=true;},
  pickPoint(x,y,radius=14){let best=null,bd=radius;for(const layer of pointLayers.values()){if(!layer.visible)continue;for(const pt of layer.points){if(!pt.on)continue;const d=Math.hypot(pt.sx-x,pt.sy-y);if(d<bd){bd=d;best=pt.data;}}}return best;},
  screenToLonLat(x,y){const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x/VW()*2-1,-(y/VH())*2+1),camera);const hit=new THREE.Vector3();if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit))return null;const mx=hit.x/UNIT+origin[0],my=origin[1]-hit.z/UNIT;return[mx/R*180/Math.PI,(2*Math.atan(Math.exp(my/R))-Math.PI/2)*180/Math.PI];},
  requestRender(){dirty=true;},isReady(){return ready;}};
}
