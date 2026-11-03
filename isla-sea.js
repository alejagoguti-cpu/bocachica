import * as THREE from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {Sky} from 'three/addons/objects/Sky.js';
const SOURCE='https://raw.githubusercontent.com/alejagoguti-cpu/tesis/808cab5c59a1746063b0b27c6e239ea70e8b6f33/public/';
// Same normal map, sky and Water parameters as the thesis's caribeWater.js.
export function createSea({scene,camera,host,software}){
 const sun=new THREE.Vector3(75,100,65).normalize();
 if(!software){
  const normals=new THREE.TextureLoader().load('assets/textures/water_normals_fine.jpg',undefined,undefined,()=>{return new THREE.TextureLoader().load(SOURCE+'textures/water_normals_fine.jpg');});
  normals.wrapS=normals.wrapT=THREE.RepeatWrapping;
  const water=new Water(new THREE.PlaneGeometry(16000,16000),{textureWidth:512,textureHeight:512,waterNormals:normals,sunDirection:sun,sunColor:0xfff6e0,waterColor:0x1ea4c8,distortionScale:2.4,alpha:.96,fog:false});water.material.uniforms.size.value=1/1.28;water.rotation.x=-Math.PI/2;water.position.y=-.06;scene.add(water);
  const sky=new Sky();sky.scale.setScalar(18000);Object.assign(sky.material.uniforms.turbidity,{value:3.4});sky.material.uniforms.rayleigh.value=1.15;sky.material.uniforms.mieCoefficient.value=.0045;sky.material.uniforms.mieDirectionalG.value=.82;sky.material.uniforms.sunPosition.value.copy(sun);scene.add(sky);
  host.dataset.waterStyle='thesis-water-shader';return{update(t){water.material.uniforms.time.value=t*.00055;}};
 }
 // Perspective, world-anchored water for devices without WebGL. Uses the
 // original photographic texture and fine normal map, never a flat color.
 const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';host.prepend(canvas);const ctx=canvas.getContext('2d',{alpha:false});
 let normals=null,photo=null,last=-1000;const size=256;
 for(const [file,key] of [['textures/water_normals_fine.jpg','normal'],['assets/textura_agua2.jpg','photo']]){const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.drawImage(img,0,0,size,size);if(key==='normal')normals=x.getImageData(0,0,size,size).data;else photo=x.getImageData(0,0,size,size).data;};img.src='assets/textures/'+file.split('/').pop();}
 const origin=new THREE.Vector3(),direction=new THREE.Vector3();
 host.dataset.waterStyle='thesis-texture-perspective';
 return{update(t,force=false){if(!force&&t-last<180)return;last=t;const cw=host.clientWidth||innerWidth,ch=host.clientHeight||innerHeight,W=Math.min(640,Math.round(cw*.55)),H=Math.round(W*ch/cw);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}const frame=ctx.createImageData(W,H),d=frame.data;camera.updateMatrixWorld();origin.copy(camera.position);const tm=t*.00055;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;direction.set((x+.5)/W*2-1,1-(y+.5)/H*2,.5).unproject(camera).sub(origin).normalize();const dist=(-.06-origin.y)/direction.y;if(dist<=0){const f=y/H;d[i]=169+f*20;d[i+1]=203+f*16;d[i+2]=215+f*10;d[i+3]=255;continue;}const wx=origin.x+direction.x*dist,wz=origin.z+direction.z*dist;const ix=((Math.floor(wx*2+tm*3)%size)+size)%size,iy=((Math.floor(wz*2+tm*1.5)%size)+size)%size,j=(iy*size+ix)*4;const nx=normals?(normals[j]/255-.5)*3:0,nz=normals?(normals[j+1]/255-.5)*3:0;const p=photo?photo[j]/255:.75;const ripple=nx*.6+nz*.4;const fresnel=Math.pow(1-Math.abs(direction.y),3);const glint=Math.pow(Math.max(0,(-direction.x+nx*.16)*sun.x+(-direction.y+1)*sun.y*.4+(-direction.z+nz*.16)*sun.z),20)*15;const fade=Math.min(1,5000/dist);d[i]=30+fresnel*115+(p-.7)*28+ripple*70*fade+glint;d[i+1]=147+fresnel*48+(p-.7)*35+ripple*85*fade+glint;d[i+2]=176+fresnel*34+(p-.7)*35+ripple*80*fade+glint;d[i+3]=255;}
 ctx.putImageData(frame,0,0);}};
}
