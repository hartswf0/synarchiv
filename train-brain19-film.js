// BEES ON A TRAIN — cinematic extension for train-brain19.html
// Uses original circular-track and carriage transforms; no external model calls.
(function installFilm() {
  'use strict';
  if (typeof THREE === 'undefined' || typeof renderer === 'undefined' || !renderer || window.trainFilm) return;
  const T=THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), clamp=T.MathUtils.clamp;
  const F=.94, H=2.75, W=1.83, XAX=V(1,0,0), modes=['Seat','Follow','Orbit','Window','Exterior','Witness','Model'];
  const names=['Quiet car','Dining car','Greenhouse','Surveillance','World within a world'];
  const state={active:false,auto:false,time:0,s:-3.75,z:1.18,seated:true,seatBlend:1,transition:null,face:1,mode:'Seat',yaw:0,pitch:0,orbit:0,gait:0,events:new Set(),log:[],car:1,keys:new Set(),recording:false,frame:0};
  let landscape,hidden=[],extra=[],built=[],bridges=[],actor,parallel,mini,feeds=[],last=performance.now(),camP,camA,camRef,legacy,record=null,recordChunks=[],capturePending=false,sound=null,feedCursor=0,feedAt=0,terrainRadius=0,auxLights=[];
  const baseRender=renderer.render.bind(renderer);
  const palette={wood:0x654231,walnut:0x35271f,cream:0xb59b75,brass:0xb98a43,teal:0x28474b,seat:0x793a36,iron:0x252c30,glass:0x9cb7ac,black:0x171a1c,skin:0x80503b,coat:0x74513b,red:0x742b29};
  const mats={};
  function mat(name,col,options={}) { if(!mats[name])mats[name]=new T.MeshStandardMaterial({color:col,roughness:.8,metalness:.08,...options});return mats[name]; }
  const m={};for(const [k,v] of Object.entries(palette))m[k]=mat(k,v);
  m.lamp=mat('lamp',0xffd49a,{emissive:0xffaf57,emissiveIntensity:1.1});m.screen=mat('screen',0x294c52,{emissive:0x326365,emissiveIntensity:.5});m.leaf=mat('leaf',0x48634b);m.leaf2=mat('leaf2',0x859663);m.soil=mat('soil',0x47332a);m.honey=mat('honey',0xe6ad36,{roughness:.45});m.wing=mat('wing',0xe6ded0,{transparent:true,opacity:.65,side:T.DoubleSide});m.white=mat('white',0xdfd0b4);m.silver=mat('silver',0x9da8a8,{metalness:.65,roughness:.38});
  function woodTexture(){let cn=document.createElement('canvas');cn.width=512;cn.height=128;let q=cn.getContext('2d'),rng=447;let rand=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);q.fillStyle='#ad9070';q.fillRect(0,0,512,128);for(let k=0;k<8;k++){let y=k*16;q.fillStyle=k%2?'#a38a71':'#b3997d';q.fillRect(0,y,512,15);q.fillStyle='#4e3d31';q.fillRect(0,y+15,512,1);q.strokeStyle='#59473766';q.beginPath();q.moveTo((k%3)*128,y);q.lineTo((k%3)*128,y+16);q.stroke();}for(let i=0;i<2100;i++){let x=rand()*512,y=rand()*128;q.strokeStyle=rand()>.5?'#e2c5a322':'#49382f33';q.beginPath();q.moveTo(x,y);q.lineTo(x+12+rand()*80,y+(rand()-.5)*2);q.stroke();}let tex=new T.CanvasTexture(cn);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2,1);tex.encoding=T.sRGBEncoding;return tex;}
  m.floor=mat('floor',0xb39b83,{map:woodTexture(),roughness:.75});m.linen=mat('linen',0xc7ae86,{roughness:1});
  const geometries=new Map();
  function geom(type,args) {const key=type+args.join(',');if(!geometries.has(key))geometries.set(key,new T[type](...args));return geometries.get(key);}
  function mesh(parent,g,ma,x=0,y=0,z=0){const o=new T.Mesh(g,ma);o.position.set(x,y,z);parent.add(o);return o;}
  function box(p,x,y,z,a,b,c,ma){return mesh(p,geom('BoxGeometry',[a,b,c]),ma,x,y,z);}
  function sph(p,x,y,z,r,ma){return mesh(p,geom('SphereGeometry',[r,10,8]),ma,x,y,z);}
  function cyl(p,x,y,z,r1,r2,h,ma,n=10){return mesh(p,geom('CylinderGeometry',[r1,r2,h,n]),ma,x,y,z);}
  function group(p,x=0,y=0,z=0){let g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
  let seed=2381;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const L=()=>simParams.carLength, gap=()=>simParams.couplingOffset, span=()=>L()+gap();
  function phase(x){return ((x%1)+1)%1;}
  function info(event,detail={}){state.log.push({t:+state.time.toFixed(3),event,...detail});if(state.log.length>500)state.log.shift();}
  function once(event,fn){if(state.events.has(event))return;state.events.add(event);fn();info(event);}
  function makePerson(parent,{coat=m.coat,hat=true,caseHeld=false,skin=m.skin}={}) {
    let root=group(parent), body=group(root,0,.88,0);
    let torso=cyl(body,0,.3,0,.24,.29,.58,coat);torso.scale.z=1.14;
    box(body,.015,.05,0,.42,.35,.49,coat);
    cyl(body,0,.62,0,.115,.12,.18,skin);
    let head=sph(body,.015,.79,0,.165,skin);head.scale.set(.9,1.16,1);
    box(body,.155,.77,0,.075,.075,.09,skin);
    if(hat){cyl(body,0,.91,0,.29,.29,.035,m.walnut,20);cyl(body,0,1.015,0,.145,.18,.2,m.walnut,16);cyl(body,0,.943,0,.18,.18,.05,m.brass,16);}
    let scarf=cyl(body,0,.61,0,.15,.15,.10,m.red);box(body,-.14,.38,.16,.12,.4,.105,m.red);
    let legs=[],knees=[],arms=[];
    for(const side of [-1,1]){
      let hip=group(root,0,.88,side*.145);cyl(hip,0,-.21,0,.095,.085,.44,m.iron);
      let knee=group(hip,0,-.43,0);cyl(knee,0,-.185,0,.075,.067,.39,m.iron);box(knee,.065,-.39,0,.25,.12,.155,m.walnut);legs.push(hip);knees.push(knee);
      let shoulder=group(body,0,.49,side*.27);cyl(shoulder,0,-.22,0,.072,.08,.44,coat);sph(shoulder,0,-.47,0,.078,skin);arms.push(shoulder);
    }
    const brief=group(arms[1],.03,-.48,0);
    box(brief,.10,-.17,0,.32,.32,.105,m.silver);box(brief,.10,.015,0,.115,.045,.07,m.iron);
    brief.visible=caseHeld;
    return {root,body,legs,knees,arms,brief};
  }
  function pose(person,sitting,walk=0,gait=0,gesture=0){
    person.body.position.y=.88-.39*Number(sitting);
    for(let i=0;i<2;i++){const a=Math.sin(gait+(i?Math.PI:0))*walk*.56;person.legs[i].position.y=.88-.39*Number(sitting);person.legs[i].rotation.z=a*(1-Number(sitting))+1.48*Number(sitting);person.knees[i].rotation.z=-1.48*Number(sitting)-Math.max(0,-a)*.8*(1-Number(sitting));person.arms[i].rotation.z=.82*Number(sitting)-a*.75*(1-Number(sitting))+gesture*(i?1:-.7);}
    person.brief.rotation.z=.03-.85*Number(sitting);
  }
  function seat(p,x,z,dir){let g=group(p,x,F,z);box(g,0,.24,0,.65,.47,.66,m.wood);box(g,0,.50,0,.72,.14,.72,m.seat);box(g,-dir*.32,.83,0,.14,.73,.73,m.seat);box(g,0,.65,-.35,.55,.09,.075,m.brass);box(g,0,.65,.35,.55,.09,.075,m.brass);return g;}
  function table(p,x,z){box(p,x,F+.73,z,.85,.075,.64,m.wood);box(p,x,F+.778,z,.72,.016,.50,m.linen);cyl(p,x,F+.36,z,.075,.10,.68,m.brass);return group(p,x,F+.78,z);}
  function cup(p,x=0,z=0){let g=group(p,x,0,z);cyl(g,0,.08,0,.065,.052,.16,m.white,12);cyl(g,0,.158,0,.051,.051,.008,mat('coffee',0x3b2720));return g;}
  function lamp(p,x,z){box(p,x,F+H-.05,z,.68,.075,.22,m.brass);box(p,x,F+H-.1,z,.57,.08,.17,m.lamp);}
  function bee(p,r=.06){let g=group(p);let a=sph(g,0,0,0,r,m.honey);a.scale.set(1.65,1,1);for(const x of [-.045,.035]){let q=sph(g,x,0,0,r*.9,m.black);q.scale.set(.45,1,1);}let wings=[];for(const k of [-1,1]){let wing=mesh(g,geom('SphereGeometry',[r*.82,8,5]),m.wing,-.02,.035,k*r*.8);wing.scale.set(1,.16,1.8);wings.push(wing);}return {g,wings};}
  function makeLabel(parent,text,x,y,z,rotation=0,width=1.1){let c=document.createElement('canvas');c.width=512;c.height=128;let q=c.getContext('2d');q.fillStyle='#2c2724';q.fillRect(0,0,512,128);q.strokeStyle='#b69358';q.lineWidth=6;q.strokeRect(7,7,498,114);q.fillStyle='#e7cca1';q.textAlign='center';q.textBaseline='middle';q.font='bold 41px Georgia';q.fillText(text,256,65);let tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;let a=mesh(parent,geom('PlaneGeometry',[width,width*.25]),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}),x,y,z);a.rotation.y=rotation;return a;}
  function buildCar(c,i){
    c.bodyMesh.visible=false;c.group.userData.clickable=false;
    const p=group(c.group), half=L()/2, type=(i-1)%5;
    const data={c,p,type,people:[],bees:[],doors:[],props:{}};
    box(p,0,F-.10,0,L(),.2,W*2,m.floor);box(p,0,F+H+.08,0,L(),.18,W*2+.12,m.teal);
    for(const z of [-W,W]){
      box(p,0,F+.42,z,L(),.84,.13,m.teal);
      box(p,0,F+H-.17,z,L(),.35,.13,m.teal);
      for(let j=0;j<=5;j++){
        const x=-half+j*L()/5;box(p,x,F+1.66,z,.16,1.95,.16,m.walnut);
        box(p,x,F+.90,z,.19,.09,.18,m.brass);
      }
      box(p,0,F+.88,z,L(),.08,.20,m.brass);
      box(p,0,F+2.39,z,L(),.07,.17,m.brass);
      // Open window apertures: actual geometry, not a painted window texture.
    }
    for(const end of [-1,1]){
      const x=end*(half-.07);
      for(const z of [-1,1])box(p,x,F+1.38,z*1.25,.15,H,1.16,m.teal);
      box(p,x,F+2.51,0,.15,.50,1.37,m.teal);
      for(const z of [-.69,.69])box(p,x,F+1.28,z,.21,2.56,.105,m.brass);
      // Open gangway through each end wall, with rail-visible solid framing.
      makeLabel(p,names[type],x-end*.095,F+2.54,0,end===1?-Math.PI/2:Math.PI/2,1.2);
    }
    for(let j=0;j<4;j++)lamp(p,-half+1.4+j*(L()-2.8)/3,0);let amber=new T.PointLight(0xffbc76,.95,6.0,1.7);amber.position.set(0,F+H-.30,0);p.add(amber);data.light=amber;for(const z of [-W+.09,W-.09]){box(p,0,F+.25,z,L()-.12,.14,.055,m.walnut);box(p,0,F+.64,z,L()-.12,.035,.075,m.brass);}
    // Thin aisle runner and border inlays.
    box(p,0,F+.012,0,L()-.2,.025,.86,m.seat);
    for(const z of [-.43,.43])box(p,0,F+.027,z,L()-.2,.014,.025,m.brass);
    if(type===0){
      for(const z of [-1.18,1.18])for(const x of [-3.75,-1.2,1.2,3.75])seat(p,x,z,x<0?1:-1);for(const z of [-W+.12,W-.12])for(const x of [-4.65,-2.65,-.65,1.35,3.35]){box(p,x,F+1.77,z,.27,1.38,.045,m.seat);box(p,x+.03,F+2.48,z,.35,.07,.075,m.brass);}
      let tb=table(p,-2.48,1.15);cup(tb,.12,.03);data.props.cup=tb;
      let a=makePerson(p,{coat:m.teal,hat:false});a.root.position.set(-1.2,F,-1.18);a.root.rotation.y=Math.PI;pose(a,true);data.people.push(a);
      let b=makePerson(p,{coat:m.iron});b.root.position.set(3.75,F,1.18);b.root.rotation.y=Math.PI;pose(b,true);data.people.push(b);
      // Luggage and bee source.
      box(p,-3.65,F+.17,-1.27,.45,.34,.48,m.walnut);box(p,-3.65,F+.34,-1.27,.31,.06,.06,m.brass);
      let b0=bee(p,.065);data.bees.push(b0);
      let cart=group(p,2.75,F,-.45);box(cart,0,.46,0,.72,.65,.38,m.wood);box(cart,0,.84,0,.79,.055,.43,m.brass);for(let k=0;k<3;k++){cup(cart,(k-1)*.21,0).position.y=.87;}
      for(const x of [-.27,.27])for(const z of [-.17,.17]){let w=cyl(cart,x,.105,z,.09,.09,.06,m.iron);w.rotation.x=Math.PI/2;}
      data.props.cart=cart;
    } else if(type===1){
      for(const z of [-1.2,1.2])for(const x of [-2.65,1.7]){let tb=table(p,x,z);cup(tb,-.19,0);cup(tb,.20,.05);seat(p,x-.77,z,1);seat(p,x+.77,z,-1);}
      let violinist=makePerson(p,{coat:m.iron,hat:false});violinist.root.position.set(3.5,F,-1.13);violinist.root.rotation.y=-Math.PI/2;pose(violinist,false);data.people.push(violinist);let instrument=sph(violinist.body,.24,.47,.10,.125,m.wood);instrument.scale.set(1.9,.40,.65);box(violinist.body,.38,.49,.10,.28,.035,.045,m.wood);box(violinist.body,.27,.54,-.13,.015,.025,.54,m.brass);
      for(const [x,z,coat] of [[-.5,-1.12,m.teal],[.2,-1.10,m.seat]]){let a=makePerson(p,{coat,hat:false});a.root.position.set(x,F,z);a.root.rotation.y=x<0?0:Math.PI;pose(a,false);data.people.push(a);}
      let aq=group(p,3.9,F,1.18);box(aq,0,.36,0,1.25,.72,.65,m.walnut);box(aq,0,.98,0,1.25,.53,.65,mat('water',0x367d85,{transparent:true,opacity:.55,roughness:.25}));box(aq,0,1.27,0,1.3,.065,.7,m.brass);data.props.fish=[];
      for(let k=0;k<5;k++){let q=sph(aq,0,1,0,.055,m.honey);q.scale.set(1.7,.65,.9);data.props.fish.push(q);}
    } else if(type===2){
      for(const z of [-1.19,1.19])for(let j=0;j<5;j++){const x=-3.9+j*1.9;box(p,x,F+.27,z,1.4,.53,.76,m.wood);box(p,x,F+.55,z,1.28,.09,.64,m.soil);
        for(let k=0;k<4;k++){let a=group(p,x+(k-1.5)*.29,F+.62,z+(k%2?.13:-.13));cyl(a,0,.18,0,.019,.027,.37,m.leaf);for(let n=0;n<3;n++){let leaf=sph(a,(n-1)*.10,.18+n*.085,0,.11,n%2?m.leaf:m.leaf2);leaf.scale.set(1.5,.35,.7);}sph(a,0,.43,0,.055,m.honey);}}
      for(let k=0;k<10;k++)data.bees.push(bee(p,.043));
      let keeper=makePerson(p,{coat:m.cream,hat:false});keeper.root.position.set(2.8,F,-1.1);keeper.root.rotation.y=-Math.PI/2;pose(keeper,false);data.people.push(keeper);
    } else if(type===3){
      const desk=group(p,0,F,1.14);box(desk,0,.40,0,5.6,.80,.70,m.walnut);
      data.props.screenGroup=group(desk);for(let k=0;k<4;k++){let x=-1.95+k*1.3;box(desk,x,1.39,0,1.22,.82,.18,m.iron);let rt=new T.WebGLRenderTarget(320,180,{minFilter:T.LinearFilter,magFilter:T.LinearFilter});let scr=mesh(data.props.screenGroup,geom('PlaneGeometry',[1.10,.66]),new T.MeshBasicMaterial({map:rt.texture}),x,1.39,-.105);scr.rotation.y=Math.PI;feeds.push({rt,screen:scr,target:k});makeLabel(desk,['EXTERIOR','EARLIER / QUIET','DINING','GREENHOUSE'][k],x,1.88,-.13,Math.PI,.83);}
      for(let i=0;i<12;i++)box(desk,-2.5+i*.45,.84,-.20,.1,.04,.12,i%3===0?m.lamp:m.brass);
      let a=makePerson(p,{coat:m.teal,hat:false});a.root.position.set(.7,F,.6);a.root.rotation.y=-Math.PI/2;pose(a,true);data.people.push(a);
      // Painted hive panels are physical objects opposite the surveillance wall.
      for(let k=0;k<4;k++){let x=-2.4+k*1.6;box(p,x,F+1.62,-W+.14,1.22,.82,.13,m.brass);box(p,x,F+1.62,-W+.23,1.09,.69,.035,k%2?m.teal:m.wood);for(let a=0;a<3;a++){let o=cyl(p,x+(a-1)*.25,F+1.62,-W+.265,.12,.12,.025,m.honey,6);o.rotation.x=Math.PI/2;}}
    } else {
      let d=group(p,0,F,1.05);box(d,0,.46,0,5.3,.92,1.32,m.walnut);box(d,0,.94,0,5.2,.09,1.26,m.leaf);let ring=mesh(d,geom('TorusGeometry',[.49,.014,6,48]),m.silver,0,1.015,0);ring.rotation.x=Math.PI/2;
      for(let k=0;k<12;k++){let a=k/12*Math.PI*2;let hill=cyl(d,1.5*Math.cos(a),1.04,.30*Math.sin(a),.025,.18,.35+rand()*.18,m.cream,5);hill.scale.x=1.7;}
      mini={root:d,parts:[]};for(let k=0;k<5;k++){let q=group(d);box(q,0,0,0,.19,.085,.065,k===0?m.iron:m.teal);box(q,0,.05,0,.15,.025,.07,m.brass);mini.parts.push(q);}
      // A genuinely synchronized live exterior film, framed as a projection.
      let rt=new T.WebGLRenderTarget(320,180,{minFilter:T.LinearFilter,magFilter:T.LinearFilter});
      box(p,-2.8,F+1.66,-W+.1,2.20,1.25,.12,m.walnut);let sc=mesh(p,geom('PlaneGeometry',[2.0,1.125]),new T.MeshBasicMaterial({map:rt.texture}),-2.8,F+1.66,-W+.18);
      feeds.push({rt,screen:sc,target:4});makeLabel(p,'THE SEALED LINE',2.8,F+1.45,-W+.22,0,1.6);
      let a=makePerson(p,{coat:m.cream,hat:false});a.root.position.set(3.5,F,-1.05);a.root.rotation.y=-Math.PI/2;pose(a,false);data.people.push(a);
    }
    return data;
  }
  function removeFilmCars(){for(const b of built){b.c.bodyMesh.visible=true;b.c.group.userData.clickable=true;b.c.group.remove(b.p);}built=[];for(const b of bridges)scene.remove(b.g);bridges=[];for(const f of feeds)f.rt.dispose();feeds=[];mini=null;if(actor){scene.remove(actor.root);actor=null;}for(const c of extra){const i=trainCars.indexOf(c);if(i>=0)trainCars.splice(i,1);scene.remove(c.group);}extra=[];}
  function buildTrain(){
    while(trainCars.length<6){addTrainCar(false,'Internet');extra.push(trainCars[trainCars.length-1]);}
    for(let i=1;i<trainCars.length;i++)built.push(buildCar(trainCars[i],i));
    for(let i=0;i<built.length-1;i++){let g=group(scene);box(g,0,-.09,0,1,.18,1.33,m.iron);for(const z of [-.68,.68]){box(g,0,.48,z,1,.96,.075,m.teal);box(g,0,1.02,z,1,.08,.12,m.brass);}box(g,0,2.50,0,1,.16,1.36,m.teal);bridges.push({g,a:built[i].c,b:built[i+1].c});}
    actor=makePerson(scene,{caseHeld:true});actor.root.name='TRAVELER_001';trainCars[0].group.userData.clickable=false;
  }
  function groundHeight(x,z,r){if(((x-r*.20)/(r*.28))**2+((z+r*.30)/(r*.18))**2<1.06)return -.48;let d=Math.abs(Math.hypot(x,z)-r);let b=clamp((d-5)/18,0,1);return -.34+b*(1.5+2*Math.sin(x*.055)*Math.cos(z*.046)+1.6*Math.sin((x+z)*.035));}
  function buildLandscape(){
    if(landscape)scene.remove(landscape);
    const r=simParams.trackRadius;terrainRadius=r;landscape=group(scene);seed=2381;
    let g=new T.PlaneGeometry(r*8,r*8,72,72);g.rotateX(-Math.PI/2);let a=g.attributes.position;let cols=[];const c1=new T.Color(0xc39a65),c2=new T.Color(0x756955),c3=new T.Color(0x9c7656);
    for(let i=0;i<a.count;i++){let x=a.getX(i),z=a.getZ(i),h=groundHeight(x,z,r);a.setY(i,h);let c=c1.clone().lerp(c2,clamp((h+1)/7,0,.7)).lerp(c3,rand()*.2);cols.push(c.r,c.g,c.b);}g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();mesh(landscape,g,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));
    const lake=mesh(landscape,new T.CircleGeometry(1,80),mat('lake',0x658087,{roughness:.24,metalness:.12}),r*.20,-.37,-r*.30);lake.rotation.x=-Math.PI/2;lake.scale.set(r*.28,r*.18,1);const rock=[mat('rock1',0x9c785e),mat('rock2',0x806b63),mat('rock3',0xb38c6d)];
    for(let i=0;i<48;i++){let t=i/48*2*Math.PI,rad=r*(1.7+rand()*1.4),x=Math.cos(t)*rad,z=Math.sin(t)*rad,h=10+rand()*30;let mountain=cyl(landscape,x,h*.45-3,z,2+rand()*8,10+rand()*24,h,rock[i%3],5+(i%3));mountain.rotation.y=rand()*Math.PI;mountain.scale.z=.65+rand()*.65;}
    for(let i=0;i<55;i++){let a=rand()*Math.PI*2,rad= r*(rand()>.5?.40+rand()*.43:1.18+rand()*.4);let x=Math.cos(a)*rad,z=Math.sin(a)*rad,y=groundHeight(x,z,r);let tree=group(landscape,x,y,z);let h=1.8+rand()*2.1;cyl(tree,0,h*.5,0,.06,.13,h,m.wood);let crown=sph(tree,0,h,0,.72+rand()*.6,m.leaf);crown.scale.set(1.65,.34,1.3);}
    // Village, open-air apiary, and distant wing-shaped monument.
    let village=group(landscape,-r*.45,0,-r*.39);
    for(let j=0;j<13;j++){let x=(j%4)*3.2-5,z=Math.floor(j/4)*3.7-5;box(village,x,.75,z,2.3,1.5,2.2,m.cream);let roof=cyl(village,x,1.95,z,.02,1.75,1.05,m.wood,4);roof.rotation.y=Math.PI/4;box(village,x,.45,z+1.11,.55,.9,.07,m.walnut);}
    let apiary=group(landscape,r*.34,.1,-r*.57);for(let j=0;j<12;j++){let x=(j%4)*2.2,z=Math.floor(j/4)*2.2;box(apiary,x,.45,z,1.2,.90,.90,j%2?m.cream:m.wood);box(apiary,x,.97,z,1.34,.14,1.02,m.brass);}
    let monument=group(landscape,r*.28,0,r*.61);cyl(monument,0,6,0,.7,1.1,12,m.cream,16);cyl(monument,0,12.2,0,1.5,1.5,.42,m.brass);let figure=makePerson(monument,{coat:m.brass,hat:false});figure.root.position.y=12.4;figure.root.scale.setScalar(1.8);pose(figure,false);
    for(const k of [-1,1]){let wing=box(monument,0,14.7,k*1.65,.35,2.2,3,m.brass);wing.rotation.x=k*.3;}
    // Parallel railway, already present in the landscape.
    const rr=Math.max(12,r-7);
    for(const o of [-1.22,1.22]){let rail=mesh(landscape,geom('TorusGeometry',[rr+o,.07,6,180]),m.iron,0,.19,0);rail.rotation.x=Math.PI/2;}
    parallel={root:group(landscape),u:.62,speed:simParams.currentSpeed+1.3,r:rr,cars:[],swarm:[]};for(let i=0;i<16;i++){let b=bee(landscape,.105);b.g.visible=false;parallel.swarm.push(b);}
    for(let k=0;k<4;k++){let q=group(parallel.root);box(q,0,.69,0,5.2,.38,2.4,m.iron);box(q,0,1.72,0,5.1,1.85,2.25,k===0?m.iron:m.wood);box(q,0,2.72,0,5.15,.21,2.32,m.walnut);for(const z of [-1.14,1.14])for(let a=0;a<4;a++)box(q,-1.8+a*1.2,1.95,z,.71,.77,.035,m.lamp);for(const x of [-1.65,1.65])for(const z of [-1.02,1.02]){let w=cyl(q,x,.39,z,.38,.38,.15,m.iron);w.rotation.x=Math.PI/2;}if(k===0){cyl(q,1.6,3,0,.27,.38,.76,m.iron);}parallel.cars.push(q);}
  }
  function localPose(s,z,y){
    let count=built.length,len=L(),pitch=span();
    let j=clamp(Math.floor((s+len/2)/pitch),0,count-1),x=s-j*pitch;
    const a=built[j].c.group;
    if(x>len/2 && j<count-1){
      const b=built[j+1].c.group, q=clamp((x-len/2)/Math.max(.001,gap()),0,1);
      const p=a.localToWorld(V(len/2,y,z)).lerp(b.localToWorld(V(-len/2,y,z)),q);
      return {p,q:a.getWorldQuaternion(new T.Quaternion()).slerp(b.getWorldQuaternion(new T.Quaternion()),q),j:j+1};
    }
    return {p:a.localToWorld(V(x,y,z)),q:a.getWorldQuaternion(new T.Quaternion()),j:j+1};
  }
  function updateBridges(){
    for(const {g,a,b} of bridges){let p=a.group.localToWorld(V(L()/2,F,0)),q=b.group.localToWorld(V(-L()/2,F,0));let delta=q.clone().sub(p);g.position.copy(p).lerp(q,.5);g.quaternion.setFromUnitVectors(XAX,delta.clone().normalize());g.scale.x=Math.max(.08,delta.length()+.06);}
  }
  function resetTake(){state.auto=false;state.time=0;state.s=-3.75;state.z=1.18;state.seated=true;state.seatBlend=1;state.transition=null;state.face=1;state.mode='Seat';state.yaw=0;state.pitch=0;state.orbit=0;state.gait=0;state.events.clear();for(const f of feeds)f.hasFrame=false;state.log=[];if(state.recording)info('record_continued');camP=null;camA=null;camRef=null;if(parallel){parallel.u=phase(trainCars[1].u-.18);parallel.speed=simParams.currentSpeed+1.3;}info('take_reset');}
  function mode(name){if(!modes.includes(name))return;state.mode=name;state.yaw=0;state.pitch=0;state.orbit=0;info('camera',{mode:name});}
  function stand(){if(!state.seated||state.transition)return;state.seated=false;state.transition={fromZ:state.z,toZ:0,fromS:state.s,toS:state.s,from:state.seatBlend,to:0,at:state.time};mode('Follow');info('stand');}
  function sit(){if(state.transition)return;if(state.seated){stand();return;}let j=clamp(Math.round(state.s/span()),0,built.length-1),type=built[j].type;if(type!==0&&type!==1){info('sit_unavailable',{reason:'No seats in this carriage'});return;}let pos=type===0?[-3.75,-1.2,1.2,3.75]:[-3.42,-1.88,.93,2.47];let x=state.s-j*span(),near=pos.reduce((a,b)=>Math.abs(b-x)<Math.abs(a-x)?b:a);if(Math.abs(near-x)>1.1){info('sit_unavailable',{reason:'Move closer to a seat'});return;}state.seated=true;state.transition={fromZ:state.z,toZ:1.18,fromS:state.s,toS:j*span()+near,from:state.seatBlend,to:1,at:state.time};mode('Seat');info('sit');}
  function updateSeat(){let a=state.transition;if(!a)return;let t=clamp((state.time-a.at)/.85,0,1),q=t*t*(3-2*t);state.z=a.fromZ+(a.toZ-a.fromZ)*q;state.s=a.fromS+(a.toS-a.fromS)*q;state.seatBlend=a.from+(a.to-a.from)*q;if(t>=1)state.transition=null;}
  function event(name){if(name==='bee'){once('bee',()=>{state.beeAt=state.time;});}else if(name==='train'){once('parallel_train',()=>{parallel.speed=simParams.currentSpeed+4;});}else if(name==='scuffle'){once('scuffle',()=>{state.fightAt=state.time;});}else if(name==='swarm'){once('exterior_swarm',()=>{state.swarmAt=state.time;});}else if(name==='sit'){sit();}}
  function director(dt){
    if(!state.auto)return;
    let t=state.time,goal=null;
    if(t>=2)event('bee');
    if(t>=5)once('orbit_start',()=>mode('Orbit'));
    if(t>=10){once('stand_directed',stand);goal=span();}
    if(t>=18){goal=span();once('dining_arrival',()=>{mode('Follow');event('scuffle');});}
    if(t>=23){goal=span();once('parallel_approach',()=>{event('train');event('swarm');mode('Window');});}
    if(t>=28){goal=span()*2;once('greenhouse_walk',()=>mode('Follow'));}
    if(t>=37){goal=span()*3;once('surveillance_walk',()=>mode('Follow'));}
    if(t>=47){goal=span()*4;once('model_walk',()=>mode('Follow'));}
    if(t>=57){goal=span()*4;once('model_view',()=>mode('Model'));}
    if(t>=64){goal=span()*4;once('exterior_view',()=>mode('Exterior'));}
    if(goal!==null&&!state.seated&&!state.transition){let delta=goal-state.s;let d=clamp(delta,-dt*1.65,dt*1.65);state.s+=d;state.gait+=Math.abs(d)*6.6;state.walk=Math.abs(d)>0.002?1:0;}
    if(t>=72){state.auto=false;info('take_complete');if(state.recording)stopRecord();}
  }
  function manual(dt){
    if(state.auto)return;
    const k=state.keys;let d=(k.has('w')?1:0)-(k.has('s')?1:0),side=(k.has('d')?1:0)-(k.has('a')?1:0);
    if(d||side){stand();if(state.transition){state.walk=0;return;}if(state.mode==='Seat')mode('Follow');let prev=state.s;state.s=clamp(state.s+d*dt*1.7,-L()/2+.72,(built.length-1)*span()+L()/2-.72);state.z=clamp(state.z+side*dt*.85,-.40,.40);state.gait+=(Math.abs(state.s-prev)+Math.abs(side)*dt*.85)*6.6;state.walk=1;if(d)state.face=d;}else state.walk=0;
    state.yaw=clamp(state.yaw+((k.has('arrowleft')?1:0)-(k.has('arrowright')?1:0))*dt*1.1,-1.45,1.45);
    state.pitch=clamp(state.pitch+((k.has('arrowup')?1:0)-(k.has('arrowdown')?1:0))*dt*.85,-.9,.9);
  }
  function updateActors(dt){
    const p=localPose(state.s,state.z,F);state.car=p.j;actor.root.position.copy(p.p);actor.root.quaternion.copy(p.q);actor.root.rotateY(state.seated?0:state.face===1?0:Math.PI);
    pose(actor,state.seatBlend,state.walk||0,state.gait);actor.root.updateMatrixWorld(true);
    for(const b of built){let t=state.time;if(b.light)b.light.intensity=.78;if(b.type===0){let c=b.props.cart;c.position.x=2.8-.9*(1-Math.cos(t*.45));let q=b.bees[0];let v=state.events.has('bee')?clamp((t-state.beeAt)/2.3,0,1):0;
      let src=V(-3.8,F+1.65,1.55);if(state.car===1&&state.seatBlend>.5){b.props.beeTarget=b.p.worldToLocal(actor.brief.getWorldPosition(V())).add(V(.02,.14,0));}let dst=b.props.beeTarget||V(-3.5,F+.92,1.15);q.g.position.copy(src).lerp(dst,v);q.g.position.y+=Math.sin(t*7)*.045*(1-v);q.g.rotation.y=v>=1?0:t*2;q.wings.forEach((w,i)=>w.rotation.x=Math.sin(t*90)*(i?1:-1));
    }else if(b.type===1){let a=b.people[0];pose(a,false,0,0,.18*Math.sin(t*5));for(let i=1;i<3;i++){let q=b.people[i];let fight=state.events.has('scuffle')&&t-state.fightAt<7;pose(q,false,0,0,fight?.9*Math.sin(t*8+i):.12*Math.sin(t*2+i));q.root.position.x=(i===1?-.5:.2)+(fight?.15*Math.sin(t*5+i):0);}b.props.fish.forEach((q,i)=>{q.position.x=.46*Math.sin(t*.9+i*1.6);q.position.y=1+.12*Math.sin(t*1.2+i);q.position.z=.18*Math.cos(t*.8+i);});
    }else if(b.type===2){b.bees.forEach((q,i)=>{q.g.position.set(3.6*Math.sin(t*.42+i*.9),F+.86+.48*Math.sin(t*1.8+i),1.1*Math.cos(t*.72+i*2.2));q.g.rotation.y=t+i;q.wings.forEach((w,j)=>w.rotation.x=Math.sin(t*85+i)*(j?1:-1));});}}
    if(parallel){parallel.u=phase(parallel.u+parallel.speed*dt/(Math.PI*2*parallel.r));parallel.cars.forEach((q,i)=>{let a=2*Math.PI*phase(parallel.u-i*6/(Math.PI*2*parallel.r));q.position.set(Math.cos(a)*parallel.r,.15,Math.sin(a)*parallel.r);q.rotation.y=-a-Math.PI/2;});const live=state.events.has('exterior_swarm'),age=state.time-(state.swarmAt||0);parallel.swarm.forEach((b,i)=>{b.g.visible=live&&age<18;if(!b.g.visible)return;let p=localPose(state.s-7+age*.85+Math.sin(i*2.4+age)*1.2,-5.2+Math.cos(i*2.1+age*1.7)*1.4,F+1.5+Math.sin(i*3+age*1.9)*.8);b.g.position.copy(p.p);b.g.quaternion.copy(p.q);b.wings.forEach((w,j)=>w.rotation.x=Math.sin(age*80+i)*(j?1:-1));});}
    if(mini){mini.parts.forEach((q,i)=>{let a=2*Math.PI*phase(trainCurrentU-i*.075);q.position.set(.49*Math.cos(a),1.085,.49*Math.sin(a));q.rotation.y=-a-Math.PI/2;});}
  }
  function cameraUpdate(dt){
    let s=state.s,z=state.z,face=state.face,cp,at;
    const inside=(x,zz,y)=>localPose(clamp(x,-L()/2+.26,(built.length-1)*span()+L()/2-.26),zz,y);const aim=localPose(s,z,F+1.12-.17*state.seatBlend);
    if(state.mode==='Seat'){cp=inside(s+2.15,-.45,F+1.42).p;at=aim.p;}
    else if(state.mode==='Orbit'){state.orbit+=dt*.40;let a=state.orbit;cp=inside(s+2.15*Math.cos(a),-.37-.34*Math.sin(a),F+1.40).p;at=aim.p;}
    else if(state.mode==='Window'){cp=inside(s-1.1,.55,F+1.55).p;at=localPose(s+.2,-5,F+1.25).p;}
    else if(state.mode==='Exterior'){cp=localPose(s-3.2,-9.6,F+4.6).p;at=localPose(s+.9,0,F+1.5).p;}
    else if(state.mode==='Witness'){cp=localPose((state.car-1)*span()-L()/2+.6,-.8,F+1.78).p;at=aim.p;}
    else if(state.mode==='Model'&&mini){cp=localPose((built.length-1)*span()-1.5,-.55,F+2.0).p;at=mini.root.localToWorld(V(0,1.0,0));}
    else{cp=inside(s-face*2.0,clamp(z-.36,-.60,.60),F+1.48).p;at=localPose(s+face*.45,z,F+1.05).p;}
    let look=at.clone().sub(cp);if(state.yaw||state.pitch){look.applyAxisAngle(V(0,1,0),state.yaw);let right=new T.Vector3().crossVectors(look,V(0,1,0)).normalize();if(right.lengthSq()>.1)look.applyAxisAngle(right,state.pitch);at=cp.clone().add(look);}
    const ref=localPose(s,0,F);const alpha=1-Math.exp(-dt*(state.mode==='Exterior'?2.8:7.5));if(!camP){camP=cp.clone();camA=at.clone();}else{if(camRef){let dq=ref.q.clone().multiply(camRef.q.clone().invert());camP.sub(camRef.p).applyQuaternion(dq).add(ref.p);camA.sub(camRef.p).applyQuaternion(dq).add(ref.p);}camP.lerp(cp,alpha);camA.lerp(at,alpha);}camRef=ref;
    camera.position.copy(camP);camera.lookAt(camA);controls.target.copy(camA);
    camera.fov=state.mode==='Exterior'?54:66;camera.near=.035;camera.updateProjectionMatrix();
  }
  const feedCam=new T.PerspectiveCamera(69,16/9,.045,250);
  function updateFeed(now){
    if(!feeds.length||now-feedAt<250)return;feedAt=now;
    let f=feeds[feedCursor++%feeds.length],s,cp,at;if(f.target===1&&state.time>12&&f.hasFrame)return;
    if(f.target===4||f.target===0){s=state.s;cp=localPose(s-4,-10,F+5).p;at=localPose(s+3,0,F+1).p;}
    else {let j=Math.min(built.length-1,f.target-1);s=j*span();cp=localPose(s-3.8,-.72,F+1.9).p;at=localPose(s+2,0,F+1.1).p;}
    feedCam.position.copy(cp);feedCam.lookAt(at);const old=renderer.getRenderTarget();const visible=feeds.map(x=>x.screen.visible);
    try{feeds.forEach(x=>x.screen.visible=false);renderer.setRenderTarget(f.rt);baseRender(scene,feedCam);f.hasFrame=true;}finally{renderer.setRenderTarget(old);feeds.forEach((x,i)=>x.screen.visible=visible[i]);}
  }
  function setFilm(active){
    if(active===state.active)return;
    if(active){
      legacy={bg:scene.background,fog:scene.fog,cam:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,near:camera.near,shadow:renderer.shadowMap.enabled,encoding:renderer.outputEncoding,tone:renderer.toneMapping,exposure:renderer.toneMappingExposure,click:trainCars[0].group.userData.clickable};
      hidden=scene.children.filter(o=>o.isLight||o===scene.stationGroup||(o.isMesh&&!trackElements.includes(o)&&o.geometry&&['PlaneGeometry','BoxGeometry'].includes(o.geometry.type)));hidden.forEach(o=>o.visible=false);
      scene.background=new T.Color(0xc5b29a);scene.fog=new T.Fog(0xc5b29a,45,simParams.trackRadius*3.7);
      renderer.shadowMap.enabled=false;renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      let hemi=new T.HemisphereLight(0xf4dfbf,0x5a5257,.69);scene.add(hemi);auxLights.push(hemi);let sun=new T.DirectionalLight(0xffc887,1.25);sun.position.set(-32,35,14);scene.add(sun);auxLights.push(sun);
      buildLandscape();buildTrain();resetTake();
      controls.enabled=false;currentView=0;camera.userData.isDynamicView=false;camera.userData.isAudienceReaction=false;camera.userData.isTrainRush=false;
      for(const id of ['ui','info','ui-info','dialogue']){const el=document.getElementById(id);if(el){el.dataset.filmDisplay=el.style.display;el.style.display='none';}}
      state.active=true;hud.hidden=false;launcher.hidden=true;last=performance.now();
    }else{
      if(state.recording)stopRecord();state.active=false;state.auto=false;state.keys.clear();removeFilmCars();if(landscape){scene.remove(landscape);landscape=null;}auxLights.forEach(o=>scene.remove(o));auxLights=[];
      hidden.forEach(o=>o.visible=true);hidden=[];scene.background=legacy.bg;scene.fog=legacy.fog;renderer.shadowMap.enabled=legacy.shadow;renderer.outputEncoding=legacy.encoding;renderer.toneMapping=legacy.tone;renderer.toneMappingExposure=legacy.exposure;
      camera.position.copy(legacy.cam);camera.fov=legacy.fov;camera.near=legacy.near;camera.updateProjectionMatrix();controls.target.copy(legacy.target);controls.enabled=true;trainCars[0].group.userData.clickable=legacy.click;
      for(const id of ['ui','info','ui-info','dialogue']){const el=document.getElementById(id);if(el)el.style.display=el.dataset.filmDisplay||'';}
      hud.hidden=true;launcher.hidden=false;closeSound();updateTrainInfoDisplay();
    }
  }
  function download(blob,name){let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  function saveLog(){download(new Blob([JSON.stringify({title:'BEES ON A TRAIN / THE SEALED LINE',duration:state.time,source:'synarchiv/train-brain19.html',events:state.log},null,2)],{type:'application/json'}),'bees-take-events.json');}
  function toggleRecord(){
    if(state.recording){stopRecord();return;}
    if(!renderer.domElement.captureStream||!window.MediaRecorder){status.textContent='Recording unsupported by this browser.';return;}
    try{let stream=renderer.domElement.captureStream(24);if(sound?.dest)sound.dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));const chunks=[];const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));record=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:6000000}:undefined);const rec=record;recordChunks=chunks;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=()=>{let mime=rec.mimeType||'video/webm';download(new Blob(chunks,{type:mime}),'bees-on-a-train-'+Date.now()+(mime.includes('mp4')?'.mp4':'.webm'));stream.getTracks().filter(t=>t.kind==='video').forEach(t=>t.stop());saveLog();};record.start(1000);state.recording=true;info('record_start');}catch(e){status.textContent='Recorder: '+e.message;}
  }
  function stopRecord(){if(record&&record.state!=='inactive'){info('record_stop');record.stop();}state.recording=false;}
  function toggleSound(){if(sound){closeSound();return;}try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;let ac=new A(),dest=ac.createMediaStreamDestination(),mix=ac.createGain();mix.gain.value=.10;mix.connect(ac.destination);mix.connect(dest);let os=ac.createOscillator(),lo=ac.createOscillator(),amp=ac.createGain(),mod=ac.createGain();os.type='triangle';os.frequency.value=53;lo.frequency.value=4.1;mod.gain.value=.12;lo.connect(mod);mod.connect(amp.gain);amp.gain.value=.25;os.connect(amp);amp.connect(mix);os.start();lo.start();ac.resume();sound={ac,dest,mix,os,lo};}catch(e){status.textContent='Audio unavailable';}}
  function closeSound(){if(sound){sound.ac.close().catch(()=>{});sound=null;}}
  const css=document.createElement('style');css.textContent=`
    #trainFilmHUD[hidden],#trainFilmLaunch[hidden]{display:none!important}
    #trainFilmHUD{position:fixed;inset:0;z-index:1100;pointer-events:none;font:12px/1.3 system-ui;color:#ead5b5}
    #trainFilmHUD *{box-sizing:border-box} #trainFilmHUD button,#trainFilmLaunch{pointer-events:auto;touch-action:none;cursor:pointer;border:1px solid #b9a17d65;background:#151b1dd9;color:#ecd6b3;border-radius:3px;font:500 11px system-ui;margin:0;padding:8px 10px;white-space:nowrap}
    #trainFilmHUD button:hover,#trainFilmLaunch:hover{background:#6a5038} #trainFilmHUD button.on{color:#14191b;background:#d0ad73;border-color:#d0ad73}
    #trainFilmHUD .film-top{position:absolute;top:max(12px,env(safe-area-inset-top));left:12px;right:12px;display:flex;justify-content:space-between;align-items:start;gap:8px;text-shadow:0 1px 4px #000}
    #trainFilmHUD .film-title{font:600 12px Georgia;letter-spacing:.18em} #trainFilmHUD .film-status{font:11px ui-monospace,monospace;margin-top:4px;max-width:75vw}
    #trainFilmHUD .film-controls{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:12px;right:12px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;pointer-events:auto;background:#1117199c;padding:7px;border:1px solid #c2a77a38;border-radius:4px;max-width:850px;margin:auto;backdrop-filter:blur(7px)}
    #trainFilmHUD .film-controls button{flex:0 0 auto} #trainFilmHUD .film-camera{display:flex;gap:3px;flex-wrap:wrap} #trainFilmHUD .film-move{display:flex;gap:3px}
    #trainFilmHUD.clean .film-controls,#trainFilmHUD.clean .film-title,#trainFilmHUD.clean .film-status{display:none}
    #trainFilmLaunch{position:fixed;right:12px;top:12px;z-index:1100}
    @media(max-width:650px){#trainFilmHUD .film-controls{gap:4px;padding:5px;left:6px;right:6px}#trainFilmHUD button{font-size:10px;padding:7px 8px}#trainFilmHUD .film-title{font-size:11px}}
    `;
  document.head.appendChild(css);
  const hud=document.createElement('div');hud.id='trainFilmHUD';hud.hidden=true;
  hud.innerHTML=`<div class="film-top"><div><div class="film-title">BEES ON A TRAIN / THE SEALED LINE</div><div class="film-status" aria-live="off"></div></div><button data-act="hide" title="Hide interface (H)">HUD</button></div><div class="film-controls"><button data-act="take">▶ Take</button><button data-act="reset">Reset</button><button data-act="sit">Stand / sit</button><div class="film-camera">${modes.map(x=>`<button data-mode="${x}">${x}</button>`).join('')}</div><div class="film-move">${[['w','↑'],['s','↓'],['a','←'],['d','→'],['arrowleft','Look L'],['arrowright','Look R'],['arrowup','Look ↑'],['arrowdown','Look ↓']].map(([k,t])=>`<button data-key="${k}">${t}</button>`).join('')}</div><button data-act="bee">Bee</button><button data-act="scuffle">Scuffle</button><button data-act="train">Train</button><button data-act="swarm">Swarm</button><button data-act="sound">Sound</button><button data-act="rec">REC</button><button data-act="still">Still</button><button data-act="log">Ledger</button><button data-act="legacy">Archive</button></div>`;
  document.body.appendChild(hud);const status=hud.querySelector('.film-status');const launcher=document.createElement('button');launcher.id='trainFilmLaunch';launcher.textContent='Enter film';document.body.appendChild(launcher);launcher.onclick=()=>setFilm(true);
  function startTake(){if(state.auto){state.auto=false;info('director_paused');return;}resetTake();state.auto=true;info('director_start');}
  hud.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.mode){state.auto=false;mode(b.dataset.mode);return;}let a=b.dataset.act;if(a==='take')startTake();else if(a==='reset')resetTake();else if(a==='hide')hud.classList.toggle('clean');else if(a==='legacy')setFilm(false);else if(a==='rec')toggleRecord();else if(a==='still')capturePending=true;else if(a==='log')saveLog();else if(a==='sound')toggleSound();else if(a)event(a);});
  for(const b of hud.querySelectorAll('[data-key]')){let k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();state.auto=false;state.keys.add(k);b.setPointerCapture(e.pointerId);});let up=()=>state.keys.delete(k);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);}
  const navKeys=new Set(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown']);
  window.addEventListener('keydown',e=>{if(!state.active||e.target?.matches?.('input,textarea,select'))return;let k=e.key.toLowerCase();if(navKeys.has(k)){e.preventDefault();state.auto=false;state.keys.add(k);}else if(!e.repeat){if(k===' '){e.preventDefault();event('sit');}else if(k==='f')event('bee');else if(k==='g')event('scuffle');else if(k==='t')event('train');else if(k==='b')event('swarm');else if(k==='h')hud.classList.toggle('clean');else if(k==='r')toggleRecord();else if(k==='k')capturePending=true;else if(k==='escape'){state.auto=false;hud.classList.remove('clean');}else if(/^[1-7]$/.test(k)){state.auto=false;mode(modes[Number(k)-1]);}}});
  window.addEventListener('keyup',e=>state.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>state.keys.clear());
  // Block the old raycast dialogue while filming; its handler is still present in archive mode.
  renderer.domElement.addEventListener('click',e=>{if(state.active){e.stopImmediatePropagation();}},true);
  let drag=null;
  renderer.domElement.addEventListener('pointerdown',e=>{if(!state.active)return;drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture?.(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(!drag||!state.active)return;state.auto=false;state.yaw=clamp(state.yaw-(e.clientX-drag.x)*.005,-1.45,1.45);state.pitch=clamp(state.pitch-(e.clientY-drag.y)*.004,-.9,.9);drag={x:e.clientX,y:e.clientY};});
  for(const k of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(k,()=>drag=null);
  renderer.render=function(sc,cam){
    if(!state.active||sc!==scene||cam!==camera)return baseRender(sc,cam);
    const now=performance.now(),dt=clamp((now-last)/1000,0,.05);last=now;state.time+=dt;state.frame++;
    if(built.some(b=>!trainCars.includes(b.c))||terrainRadius!==simParams.trackRadius){setFilm(false);setFilm(true);}
    for(const c of trainCars)c.group.updateMatrixWorld(true);
    state.walk=0;director(dt);manual(dt);updateSeat();updateBridges();updateActors(dt);cameraUpdate(dt);
    if(sound){sound.os.frequency.setTargetAtTime(42+simParams.currentSpeed*2,sound.ac.currentTime,.15);sound.lo.frequency.setTargetAtTime(2+simParams.currentSpeed*.45,sound.ac.currentTime,.15);}
    updateFeed(now);baseRender(sc,cam);
    if(capturePending){capturePending=false;renderer.domElement.toBlob(b=>{if(b)download(b,'bees-frame-'+Math.round(state.time*1000)+'.png');},'image/png');}
    if(state.frame%8===0){status.textContent=`${names[(state.car-1)%5]||'Car'} · ${state.mode} · ${state.time.toFixed(1)}s${state.auto?' · DIRECTOR':''}${state.recording?' · ● REC':''}`;for(const b of hud.querySelectorAll('[data-mode]'))b.classList.toggle('on',b.dataset.mode===state.mode);hud.querySelector('[data-act="take"]').textContent=state.auto?'Ⅱ Pause':'▶ Take';hud.querySelector('[data-act="rec"]').classList.toggle('on',state.recording);hud.querySelector('[data-act="sound"]').classList.toggle('on',!!sound);}
  };
  // Explicit application-side control surface for future agent integration. No paid API calls.
  window.trainFilm={version:'1.1.0',enter:()=>setFilm(true),exit:()=>setFilm(false),take:startTake,reset:resetTake,camera:mode,event,record:toggleRecord,log:()=>state.log.slice(),observe:()=>({active:state.active,t:state.time,car:state.car,mode:state.mode,position:state.s,seated:state.seated,events:[...state.events],recording:state.recording}),hold:(key,ms=500)=>{if(!state.active||!navKeys.has(key))return;state.auto=false;state.keys.add(key);setTimeout(()=>state.keys.delete(key),clamp(ms,0,5000));}};
  if(!new URLSearchParams(location.search).has('legacy'))setFilm(true);
})();
