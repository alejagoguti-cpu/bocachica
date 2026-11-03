import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CSS3DRenderer,CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';

export function createSpatialNetwork(host,nodes,onSelect){
 host.replaceChildren();const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,1,20000);
 const renderer=new CSS3DRenderer();renderer.setSize(innerWidth,innerHeight);host.append(renderer.domElement);renderer.domElement.style.position='absolute';renderer.domElement.style.inset='0';
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=1100;controls.maxDistance=4000;controls.maxPolarAngle=Math.PI*.75;controls.autoRotate=false;
 const objects=[];const positions=[new THREE.Vector3(-440,55,0),new THREE.Vector3(0,55,0),new THREE.Vector3(440,55,0),new THREE.Vector3(0,-210,40),new THREE.Vector3(0,330,-35)];
 const descriptions=['Fuentes · Cartografías · Modelos','Cultura · Materiales · Oficios','Recorridos · Talleres · Validación','Agua · Sombra · Residuos · Oficios','Prioridades · Recursos · Cuidado'];
 function addCard(title,subtitle,code,position,index){const el=document.createElement(index===null?'div':'button');el.className='architecture-card';el.innerHTML=`<span class="architecture-code">${code}</span><strong>${title}</strong><small>${subtitle}</small>`;if(index!==null){el.onclick=()=>onSelect(index);el.setAttribute('aria-label','Explorar '+title);objects[index]=el;}else el.classList.add('output-card');const object=new CSS3DObject(el);object.position.copy(position);scene.add(object);return object;}
 nodes.forEach((node,index)=>addCard(node.title,descriptions[index],'0'+(index+1),positions[index],index));
 const output=new THREE.Vector3(0,-450,85);addCard('Planificación y formación','Resultados para decisiones compartidas','RESULTADOS',output,null);
 function line(a,b){const mid=a.clone().add(b).multiplyScalar(.5),vector=b.clone().sub(a);const element=document.createElement('div');element.className='architecture-link';element.style.height=vector.length()+'px';const object=new CSS3DObject(element);object.position.copy(mid);object.position.z-=8;object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());scene.add(object);}
 const port=(index,dx,dy)=>positions[index].clone().add(new THREE.Vector3(dx,dy,0));
 line(port(4,0,-76),port(1,0,76));
 line(port(0,150,0),port(1,-150,0));line(port(1,150,0),port(2,-150,0));
 line(port(0,0,-76),port(3,-130,76));line(port(2,0,-76),port(3,130,76));line(port(3,0,-76),output.clone().add(new THREE.Vector3(0,76,0)));
 function reset(){camera.position.set(70,130,innerWidth<700?2900:2150);controls.target.set(innerWidth<700?0:-235,-25,0);camera.lookAt(controls.target);}
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);reset();}
 reset();function draw(){requestAnimationFrame(draw);if(!host.hidden){controls.update();renderer.render(scene,camera);}}draw();
 return{select(index){objects.forEach((element,i)=>{element.classList.toggle('selected',i===index);element.setAttribute('aria-pressed',i===index);});},resize,zoom(factor){camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);},rotate(){controls.autoRotate=!controls.autoRotate;controls.autoRotateSpeed=.25;},reset};
}
