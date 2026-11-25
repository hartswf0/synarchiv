// Film archive → procedural video-game worlds. Original source IDs are retained.
window.TrainArchiveWorlds=(function archiveWorlds(ctx) {
  'use strict';
  const T=ctx.THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), clamp=T.MathUtils.clamp;
  const $=(s,p=document)=>p.querySelector(s), E=(tag)=>document.createElement(tag);
  const R=ctx.renderer, baseRender=ctx.render;
  const libraryURL='train-brain19-worlds.json?v=1';
  const recipes={
    highland:{title:'Highland Noir',train:true,rooms:['quiet','music','gallery'],theme:'highland',sky:0xc5aa83,ground:0x9b7653,wall:0x4c5147,seat:0x753d32,light:0xffc684,goal:'Ride the highlands and find the musician.'},
    sealed:{title:'The Sealed Car',train:true,rooms:['quiet','cargo','lab'],theme:'industrial',sky:0x25383e,ground:0x394347,wall:0x24464b,seat:0x2e5a58,light:0x84c8c3,goal:'Find the humming gold crates and examine the swarm.'},
    prestige:{title:'The Prestige Train',train:true,rooms:['dining','dining','boardroom'],theme:'night',sky:0x141b26,ground:0x28313b,wall:0x492e25,seat:0x71372d,light:0xffc78a,goal:'Observe the uncanny guests without disturbing the meal.'},
    mirror:{title:'Mirror of the Station',train:true,rooms:['vintage','mirror','gallery'],theme:'fog',sky:0x9b8f7a,ground:0x67665b,wall:0x5d422e,seat:0x5c302b,light:0xffcf91,goal:'Follow the bees to the golden doorway into another century.',portal:'victorian'},
    hive:{title:'The Impossible Hive',site:'hive',theme:'forest',sky:0xc2c8a2,ground:0x4b593d,wall:0x9b6d25,light:0xffd47f,goal:'Walk through the honeycomb arches to the pool of tomorrow.',portal:'highland'},
    camera:{title:'The Camera That Remembers',site:'camera',theme:'fog',sky:0xc8b59a,ground:0x776858,wall:0x604934,light:0xffcf91,goal:'Walk from the apparatus room to the Lumière platform.',portal:'victorian'},
    music:{title:'The Highland Musician',train:true,rooms:['quiet','music','gallery'],theme:'sunset',sky:0xc18c68,ground:0x88624d,wall:0x67452e,seat:0x664333,light:0xffbb72,goal:'Follow the jazz through the painted hive gallery.',portal:'honeyland'},
    apiary:{title:'Bee Cam: Burned Apiary',site:'apiary',theme:'ash',sky:0xb7aa90,ground:0x5c5548,wall:0x463b2d,light:0xf7c981,goal:'Explore scorched hive frames; switch to Bee for insect-scale observation.',portal:'hive'},
    surveillance:{title:'Every Camera Is a Drone Is a Hive',site:'surveillance',theme:'industrial',sky:0x233840,ground:0x414c4c,wall:0x28434b,light:0x8eced1,goal:'Inspect live views of the railway and the geometric hive.',portal:'sealed'},
    honeyland:{title:'Half for Me Half for the Swarm',site:'apiary',theme:'stone',sky:0xe2c38e,ground:0x887852,wall:0x83745c,light:0xffdc9b,goal:'Find the limestone hive. Leave half of the honey for the bees.',portal:'hive'},
    aftermath:{title:'The Apiary After the Fire',site:'apiary',theme:'ash',sky:0xbcb4a4,ground:0x60574e,wall:0x413a31,light:0xf6d9ac,goal:'Walk the rows of burned boxes beside the beekeeper.',portal:'honeyland'},
    victorian:{title:'Victorian Gold / La Ciotat',site:'station',theme:'fog',sky:0xa99b84,ground:0x887760,wall:0x684b37,light:0xffc98a,goal:'Inspect the gaslit platform, gold cargo and a waiting carriage.',portal:'temporal'},
    temporal:{title:'The Temporal Train',train:true,rooms:['vintage','quiet','lab'],theme:'temporal',sky:0xbab0a2,ground:0x77746b,wall:0x544e49,seat:0x6f4139,light:0xe4c59c,goal:'Cross the doors between three architectural eras.',portal:'mirror'},
    monorail:{title:'The Monochrome Monorail',site:'monorail',theme:'mono',sky:0xb9b9b9,ground:0x666666,wall:0x4c4c4c,light:0xf7f7f7,goal:'Explore the elevated station and observe its train docking.',portal:'standoff'},
    standoff:{title:'Monorail Standoff',site:'monorail',theme:'mono',sky:0xa5a5a5,ground:0x5b5b5b,wall:0x404040,light:0xffffff,goal:'Explore the spaceport meeting hall and the canyon overlook.',portal:'monorail'},
    boardroom:{title:'The Tyranny of Plausibility',train:true,rooms:['dining','boardroom','greenhouse'],theme:'night',sky:0x171d28,ground:0x30343f,wall:0x4e3b31,seat:0x73372c,light:0xf5c88c,goal:'Find the living garden beneath the optimized dining experience.',portal:'fork'},
    infinite:{title:'The Infinite Line',train:true,rooms:['modern','map','modern'],theme:'grid',sky:0x1b2833,ground:0x323c48,wall:0x38505b,seat:0x3c6572,light:0xc0d4d5,goal:'Read the repeating timetable and investigate the looping train.',portal:'infinite'},
    wax:{title:'The Wax and the Gold',site:'station',theme:'highland',sky:0xe5c5a0,ground:0xa18159,wall:0x724d32,light:0xffcf8a,goal:'Explore the Rift Valley platform with its gold cargo and music.',portal:'music'},
    fork:{title:'Arrival at La Ciotat / Garden of Forking Paths',site:'garden',theme:'forest',sky:0xc8c8a0,ground:0x59614a,wall:0x82654b,light:0xffdb9d,goal:'Pass the switch and choose a branch through the garden.',portal:'camera'}
  };
  let db=null,loadPromise=null,selected=null,tab='designed',world=null,active=false,visibleLibrary=false,playing=false,drag=null;
  const keys=new Set(), log=[], cameraModes=['Follow','Orbit','Window','Exterior','Witness','Bee','First'];
  let cameraMode='Follow',yaw=0,pitch=0,orbit=0,camPos=null,camAim=null,time=0,record=null,recChunks=[],recording=false,recordStream=null,stillPending=false,autoplay=false,autoIndex=0;
  let currentSource=null,currentRecipe=null,sourceTemplate=false; let eventTime=-100,beeTime=-100,interactNote='',interactUntil=0,route=[],goalText='',lastFeed=0,feedIndex=0,beeScale=false;
  const palette={}, geos=new Map();
  function geometry(type,args){let key=type+':'+args.join(',');if(!geos.has(key))geos.set(key,new T[type](...args));return geos.get(key);}
  function material(c,opts={}){return new T.MeshStandardMaterial({color:c,roughness:.78,metalness:.07,...opts});}
  function materials(p){
    const monochrome=p.theme==='mono', color=c=>monochrome?new T.Color(c).getHex():c;
    return {wall:material(p.wall),wood:material(monochrome?0x5d5d5d:0x62422d),dark:material(monochrome?0x262626:0x282525),cream:material(monochrome?0xbcbcbc:0xd6c1a0),seat:material(p.seat||p.wall),brass:material(monochrome?0xaaaaaa:0xbe914b,{metalness:.5}),metal:material(monochrome?0x777777:0x586b70,{metalness:.52}),lamp:material(p.light,{emissive:p.light,emissiveIntensity:1.3}),green:material(monochrome?0x6c6c6c:0x506c47),leaf:material(monochrome?0x999999:0x85935d),earth:material(p.ground),honey:material(monochrome?0xbcbcbc:0xd9a33f,{emissive:monochrome?0x555555:0x5e360a,emissiveIntensity:.3}),water:material(monochrome?0x979797:0x599e9d,{roughness:.18,metalness:.24}),glass:material(0xa4c6c4,{transparent:true,opacity:.25,roughness:.14,depthWrite:false}),white:material(monochrome?0xe0e0e0:0xe8dcc5),red:material(monochrome?0x707070:0x75362e),black:material(0x181b1d),skin:material(0x8e5e45),smoke:new T.MeshBasicMaterial({color:0x81756b,transparent:true,opacity:.15,depthWrite:false})};
  }
  function G(parent,x=0,y=0,z=0){let g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function mesh(p,g,m,x=0,y=0,z=0){let o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;}
  function B(p,x,y,z,a,b,c,m){return mesh(p,geometry('BoxGeometry',[a,b,c]),m,x,y,z);}
  function C(p,x,y,z,r1,r2,h,m,n=12){return mesh(p,geometry('CylinderGeometry',[r1,r2,h,n]),m,x,y,z);}
  function S(p,x,y,z,r,m){return mesh(p,geometry('SphereGeometry',[r,10,8]),m,x,y,z);}
  function torus(p,x,y,z,r,t,m,rotate=0){let o=mesh(p,geometry('TorusGeometry',[r,t,8,32]),m,x,y,z);o.rotation.y=rotate;return o;}
  function sign(p,words,x,y,z,w=1.6,rot=0,opts={}){let c=E('canvas');c.width=512;c.height=128;let g=c.getContext('2d');g.fillStyle=opts.bg||'#202b2b';g.fillRect(0,0,512,128);g.strokeStyle='#bfa57d';g.lineWidth=3;g.strokeRect(6,6,500,116);g.font='500 32px Georgia';g.fillStyle=opts.fg||'#e6d5ba';g.textAlign='center';g.textBaseline='middle';g.fillText(String(words).slice(0,42),256,64,484);let tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;world?.textures.push(tex);let o=mesh(p,geometry('PlaneGeometry',[w,w/4]),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}),x,y,z);o.rotation.y=rot;return o;}
  function randFactory(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
  function block(x,z,w,d){world.blocks.push({x,z,w,d});}
  function floorBox(p,x,z,w,d,h,m,solid=true,y=0){let o=B(p,x,y+h/2,z,w,h,d,m);if(solid)block(x+p.position.x,z+p.position.z,w,d);return o;}
  function addPerson(p,x,z,opts={}){
    let person=ctx.makePerson(p,{coat:opts.coat||world.m.wood,hat:opts.hat!==false,caseHeld:!!opts.caseHeld,skin:opts.skin||world.m.skin});
    person.root.position.set(x,opts.y||0,z);person.root.rotation.y=opts.rot||0;ctx.pose(person,opts.sit?1:0);if(opts.sit)person.root.position.y=.04;
    if(opts.reptile){let h=S(person.body,.17,.77,0,.13,world.m.green);h.scale.set(1.5,.65,.82);for(let k of [-1,1])S(person.body,.04,.88,k*.13,.035,world.m.honey);}
    if(opts.instrument){let brass=world.m.brass;C(person.body,.27,.38,.16,.055,.075,.47,brass).rotation.z=-.35;let u=torus(person.body,.22,.19,.16,.12,.04,brass);u.rotation.y=0;C(person.body,.32,.21,.16,.11,.05,.13,brass).rotation.z=-1.1;}
    if(opts.kind)world.people.push({person,kind:opts.kind,base:person.root.position.clone(),sit:!!opts.sit,seed:world.people.length*.7});
    return person;
  }
  function chair(p,x,z,dir=1,seatMat=world.m.seat){let m=world.m;B(p,x,.23,z,.64,.46,.69,m.wood);B(p,x,.48,z,.70,.12,.72,seatMat);B(p,x-dir*.32,.83,z,.13,.72,.72,seatMat);for(let k of [-1,1])B(p,x,.61,z+k*.36,.58,.08,.07,m.brass);block(x+p.position.x,z+p.position.z,.68,.72);world.seats.push({x:x+p.position.x,z:z+p.position.z,dir});}
  function cup(p,x,y,z){let m=world.m;C(p,x,y+.065,z,.055,.045,.13,m.white);C(p,x,y+.134,z,.043,.043,.008,m.dark);}
  function table(p,x,z,w=.88,d=.63){let m=world.m;B(p,x,.74,z,w,.075,d,m.wood);B(p,x,.786,z,w*.96,.015,d*.95,m.white);C(p,x,.36,z,.065,.1,.72,m.brass);block(x+p.position.x,z+p.position.z,w,d);return .80;}
  function plant(p,x,y,z,h=.75){let m=world.m;C(p,x,y+.15,z,.16,.12,.3,m.wood,8);C(p,x,y+h*.5+.25,z,.024,.035,h,m.green);for(let j=0;j<5;j++){let a=j*2.4,l=S(p,x+Math.cos(a)*.16,y+.32+h*j/5,z+Math.sin(a)*.16,.14,j%2?m.green:m.leaf);l.scale.set(1.5,.34,.78);}S(p,x,y+.3+h,z,.065,m.honey);}
  function hiveBox(p,x,z,burned=false){let m=world.m;B(p,x,.44,z,.93,.66,.80,burned?m.dark:m.wood);for(let i=0;i<3;i++)B(p,x,.26+i*.19,z+.405,.77,.025,.018,m.dark);B(p,x,.82,z,1.05,.13,.92,burned?m.dark:m.cream);B(p,x,.17,z,.24,.12,.80,m.dark);block(x+p.position.x,z+p.position.z,1.07,.96);}
  function honeycomb(p,x,y,z,r,ma,rot=0){let a=mesh(p,geometry('TorusGeometry',[r,r*.10,6,6]),ma,x,y,z);a.rotation.y=rot;return a;}
  function bee(p,r=.065){let m=world.m,g=G(p),body=S(g,0,0,0,r,m.honey);body.scale.set(1.65,1,1);for(let x of [-.045,.025]){let s=S(g,x,0,0,r*.88,m.black);s.scale.set(.42,1,1);}let wings=[];for(let k of [-1,1]){let q=S(g,0,.04,k*r*.75,r*.77,m.glass);q.scale.set(1.2,.14,1.8);wings.push(q);}world.bees.push({g,wings,base:V(),phase:world.bees.length*1.39});return world.bees.at(-1);}
  function newBees(p,count,x,y,z,r=.06){for(let i=0;i<count;i++){let b=bee(p,r);b.base.set(x+(i%3)*.45,y+(i%4)*.08,z+(i%2)*.2);b.g.position.copy(b.base);}}
  function lamp(p,x,y,z){let m=world.m;B(p,x,y+.05,z,.46,.10,.22,m.brass);B(p,x,y,z,.39,.06,.16,m.lamp);}
  function portal(p,x,z,target,label,rot=0){
    let m=world.m,g=G(p,x,0,z);g.rotation.y=rot;
    for(let k of [-1,1])B(g,k*.82,1.22,0,.14,2.44,.20,m.brass);
    B(g,0,2.47,0,1.78,.15,.2,m.brass);B(g,0,.04,0,1.7,.08,.24,m.metal);
    B(g,0,1.23,-.11,1.43,2.26,.04,m.dark);
    // The framed destination is an actual archived film still, not an invented live camera feed.
    let targetSource=sourceFor(target),screenMat=new T.MeshBasicMaterial({color:0xd4c2a4,side:T.DoubleSide});
    mesh(g,geometry('PlaneGeometry',[1.40,2.2]),screenMat,0,1.22,-.082);
    if(targetSource.poster){let owning=world;let tex=new T.TextureLoader().load(targetSource.poster,loaded=>{if(world!==owning){loaded.dispose();return;}screenMat.map=loaded;screenMat.color.set(0xffffff);screenMat.needsUpdate=true;},undefined,()=>{});tex.encoding=T.sRGBEncoding;world.textures.push(tex);}
    sign(g,label,0,2.69,.03,1.75);
    let pos=V(x+p.position.x,0,z+p.position.z);world.interactions.push({pos,r:2.1,label:'Enter '+label,action:()=>enterRecipe(target,sourceFor(target),false,true)});
    return g;
  }
  function liveScreen(p,x,y,z,w,h,rot,from,at,label){let m=world.m;let g=G(p,x,y,z);g.rotation.y=rot;B(g,0,0,-.08,w+.12,h+.12,.16,m.dark);let rt=new T.WebGLRenderTarget(256,144);let screen=mesh(g,geometry('PlaneGeometry',[w,h]),new T.MeshBasicMaterial({map:rt.texture}),0,0,.015);world.feeds.push({rt,screen,kind:'camera',position:from,target:at});if(label)sign(g,label,0,h/2+.14,.02,w*.75);return screen;}
  function pushInteraction(p,x,z,label,action,r=1.8){world.interactions.push({pos:V(x+p.position.x,0,z+p.position.z),label,action,r});}
  function railcar(p,x,z,len=12,style='wood',height=3){
    let m=world.m,g=G(p,x,0,z),ma=style==='steel'?m.metal:m.wall;
    B(g,0,.48,0,len,.38,3.3,m.dark);B(g,0,1.9,0,len,height-0.4,3.2,ma);B(g,0,height+.63,0,len+.12,.24,3.36,m.dark);
    for(let k of [-1,1])for(let j=0;j<5;j++)B(g,-len*.4+j*len*.2,2.15,k*1.61,len*.15,.8,.03,m.lamp);
    for(let a of [-len*.35,len*.35])for(let b of [-1.4,1.4]){let q=C(g,a,.27,b,.37,.37,.15,m.dark);q.rotation.x=Math.PI/2;}
    return g;
  }
  function trainShell(p,x,room){
    let m=world.m,g=G(p,x,0,0),len=12,W=1.83,H=2.85,steel=['cargo','lab','modern','map','boardroom'].includes(room),wall=steel?m.metal:m.wall;
    B(g,0,-.12,0,len,.24,W*2,m.wood);B(g,0,H+.09,0,len,.18,W*2+.12,wall);B(g,0,-.36,0,len,.26,W*2,m.dark);
    for(let z of [-W,W]){
      B(g,0,.43,z,len,.86,.13,wall);B(g,0,H-.22,z,len,.44,.13,wall);
      for(let j=0;j<=6;j++){let q=-6+j*2;B(g,q,1.66,z,.16,1.95,.16,steel?m.dark:m.wood);}
      for(let y of [.87,2.38])B(g,0,y,z,len,.07,.19,m.brass);
      if(room==='cargo'||room==='lab'){for(let j=0;j<6;j++)if(j%3!==1)B(g,-5+j*2,1.66,z,1.78,1.45,.12,wall);}
    }
    for(let end of [-1,1]){let q=end*5.95;for(let z of [-1.22,1.22])B(g,q,1.4,z,.16,2.8,1.2,wall);B(g,q,2.57,0,.16,.56,1.27,wall);for(let z of [-.67,.67])B(g,q,1.24,z,.22,2.48,.12,m.brass);}
    if(!steel)B(g,0,.013,0,len-.3,.026,.85,m.seat);
    for(let j=0;j<4;j++)lamp(g,-4.5+j*3,H-.11,0);
    let light=new T.PointLight(currentRecipe.light,.95,9,1.4);light.position.set(0,H-.25,0);g.add(light);
    for(let a of [-4,4])for(let b of [-1.43,1.43]){let q=C(g,a,-.47,b,.44,.44,.17,m.dark);q.rotation.x=Math.PI/2;world.wheels.push(q);}
    sign(g,room.toUpperCase(),5.81,2.63,0,1.35,-Math.PI/2);
    sign(g,room.toUpperCase(),-5.81,2.63,0,1.35,Math.PI/2);
    world.rooms.push({name:room,x});
    return g;
  }
  function decorateRoom(p,room,index){
    let m=world.m;
    if(['quiet','vintage','modern'].includes(room)){
      for(let z of [-1.16,1.16])for(let x of [-4,-1.4,1.4,4]){chair(p,x,z,x<0?1:-1);if(room!=='modern')B(p,x+.52,2.12,z+(z>0?.48:-.48),.28,1.1,.045,m.seat);}
      table(p,-2.62,1.15);cup(p,-2.62,.81,1.15);let caseBox=B(p,-3.05,.18,-1.17,.56,.36,.39,m.metal);B(p,-3.05,.38,-1.17,.20,.06,.07,m.dark);
      addPerson(p,-1.4,-1.16,{sit:true,rot:Math.PI,coat:m.cream,kind:'idle'});addPerson(p,4,1.16,{sit:true,rot:Math.PI,coat:m.dark,kind:'idle'});
      newBees(p,3,-3.45,1.35,1.22,.065);
      let cart=G(p,2.5,0,-.55);B(cart,0,.45,0,.78,.65,.42,m.wood);B(cart,0,.82,0,.84,.08,.49,m.brass);for(let i=0;i<3;i++)cup(cart,(i-1)*.22,.88,0);for(let a of [-.29,.29])for(let b of [-.18,.18])C(cart,a,.12,b,.09,.09,.07,m.dark).rotation.x=Math.PI/2;world.moving.push({o:cart,kind:'cart',x:2.5});
      if(room==='modern')sign(p,'ALIGNMENT · RETENTION',0,2.42,1.72,2.6,Math.PI);
    }else if(room==='dining'||room==='music'){
      for(let x of [-3.7,.4])for(let z of [-1.15,1.15]){table(p,x,z,.87,.68);cup(p,x-.18,.81,z);cup(p,x+.18,.81,z);chair(p,x-.78,z,1);chair(p,x+.78,z,-1);C(p,x,.95,z,.023,.026,.27,m.white);S(p,x,1.11,z,.045,m.lamp);}
      if(room==='dining'){addPerson(p,-4.48,-1.15,{sit:true,coat:m.dark,skin:m.green,reptile:currentRecipe===recipes.prestige||currentRecipe===recipes.boardroom,kind:'idle'});addPerson(p,1.18,1.15,{sit:true,rot:Math.PI,coat:m.white,kind:'idle'});addPerson(p,3.7,-1.14,{coat:m.dark,kind:'argument'});addPerson(p,4.45,-1.14,{rot:Math.PI,coat:m.seat,kind:'argument'});}
      else{addPerson(p,3.5,-1.15,{coat:m.wood,instrument:true,kind:'music'});newBees(p,4,3.1,1.75,-.9);}
      let aq=G(p,3.7,0,1.18);B(aq,0,.39,0,1.35,.78,.66,m.wood);B(aq,0,1.11,0,1.33,.60,.66,m.glass);B(aq,0,1.39,0,1.4,.05,.72,m.brass);block(3.7+p.position.x,1.18,1.4,.72);
      for(let i=0;i<6;i++){let fish=S(aq,0,1.1,0,.065,m.honey);fish.scale.set(1.7,.6,.9);world.moving.push({o:fish,kind:'fish',seed:i});}
    }else if(room==='cargo'){
      for(let x of [-4,-2,0,2,4])for(let z of [-1.16,1.16]){B(p,x,.37,z,1.32,.74,.78,m.wood);B(p,x,.78,z,1.24,.08,.72,m.dark);for(let j=0;j<3;j++)B(p,x+(j-1)*.38,.87,z,.32,.14,.48,m.brass);block(x+p.position.x,z,1.34,.8);}
      newBees(p,16,2.6,1.55,.9);addPerson(p,4.9,-1.07,{coat:m.dark,kind:'idle'});pushInteraction(p,2,0,'Inspect the humming gold crate',()=>{beeTime=time;note('The crate hums. The swarm emerges.');},1.5);
    }else if(room==='lab'||room==='map'){
      for(let x of [-4.2,-2.1,0,2.1,4.2]){B(p,x,1.1,1.18,1.4,2.2,.85,m.dark);block(x+p.position.x,1.18,1.4,.85);for(let j=0;j<6;j++){B(p,x,.25+j*.31,.735,1.22,.13,.045,m.metal);B(p,x-.46,.25+j*.31,.70,.09,.04,.025,m.lamp);}}
      for(let j=0;j<3;j++)liveScreen(p,-2.4+j*2.3,1.65,-1.68,1.55,.85,0,V(j*12-4,2.2,-.6),V(j*12+2,1,0),['QUIET','CARGO','EXTERIOR'][j]);
      if(room==='map'){sign(p,'NO FINAL STOP',0,2.53,1.68,2.4,Math.PI);B(p,-1,.42,-1.1,2.2,.84,.85,m.wood);block(-1+p.position.x,-1.1,2.2,.85);let ring=torus(p,-1,.9,-1.1,.36,.025,m.brass);ring.rotation.x=Math.PI/2;let q=B(p,-1,1,-1.1,.18,.10,.08,m.honey);world.moving.push({o:q,kind:'mini',x:-1,z:-1.1});}
      addPerson(p,3.4,-1.05,{coat:m.cream,kind:'idle'});newBees(p,6,0,1.45,.05,.045);
    }else if(room==='gallery'||room==='mirror'){
      for(let x of [-4,-2,0,2,4]){B(p,x,1.65,1.70,1.48,1.02,.13,m.brass);B(p,x,1.65,1.61,1.34,.87,.03,m.wood);for(let j=0;j<3;j++)honeycomb(p,x+(j-1)*.34,1.65,1.58,.16,m.honey);}
      for(let x of [-2.9,.6,3.7]){B(p,x,.39,-1.18,.95,.78,.67,m.wood);B(p,x,.81,-1.18,.88,.06,.63,m.brass);block(x+p.position.x,-1.18,.95,.67);honeycomb(p,x,1.01,-1.18,.18,m.honey);}
      newBees(p,9,2.9,1.60,.8,.055);addPerson(p,-3.9,-1.2,{coat:m.cream,kind:'idle'});
      if(room==='mirror'){liveScreen(p,0,1.60,-1.67,2.05,1.62,0,V(26,1.9,-.7),V(30,1.2,0),'THE STATION BEYOND');pushInteraction(p,0,0,'Enter the mirror',()=>enterRecipe('victorian',sourceFor('victorian'),false,true),1.8);}
    }else if(room==='boardroom'){
      B(p,0,.42,1.04,8.0,.84,.94,m.wood);B(p,0,.86,1.04,8.0,.05,.94,m.white);block(p.position.x,1.04,8,.94);
      for(let x of [-3,-1,1,3]){chair(p,x,-1.2,1,m.dark);plant(p,x,.0,1.02,.5);}
      liveScreen(p,1,1.65,1.7,3.0,1.3,Math.PI,V(-4,2.2,-.7),V(2,1,0),'PERFECT EXPERIENCE');addPerson(p,4.7,-1.17,{coat:m.white,kind:'idle'});newBees(p,6,-1,1.2,1.1);
    }else if(room==='greenhouse'){
      for(let x of [-4,-2,0,2,4])for(let z of [-1.12,1.12]){B(p,x,.28,z,1.5,.56,.76,m.wood);block(x+p.position.x,z,1.5,.76);for(let k=0;k<3;k++)plant(p,x+(k-1)*.44,.55,z,.65+(k%2)*.25);}
      newBees(p,15,1,1.45,.7);addPerson(p,4,-1.1,{coat:m.cream,kind:'idle'});
    }
  }
  function makeTrainWorld(p){
    let m=world.m,scene=world.scene,root=G(scene),rooms=p.rooms;
    world.train=true;world.trainRoot=root;world.bounds={minX:-5.45,maxX:12*(rooms.length-1)+5.45,minZ:-.48,maxZ:.48};
    rooms.forEach((room,i)=>{let g=trainShell(root,i*12,room);decorateRoom(g,room,i);if(i<rooms.length-1){for(let z of [-.72,.72])B(root,i*12+6,.72,z,.38,1.44,.12,m.metal);B(root,i*12+6,2.5,0,.38,.18,1.55,m.metal);}});
    world.start=V(-3.98,0,1.15);world.startSeat=['quiet','vintage','modern'].includes(rooms[0]);if(!world.startSeat)world.start.set(-4.65,0,0);
    world.startFace=1;route=[V(0,0,0),V(10.4,0,0),V(15.5,0,0),V(25.5,0,0),V(28.8,0,0)];
    if(p.portal){let last=12*(rooms.length-1);portal(root,last+4.7,-1.55,p.portal,recipes[p.portal].title);}
    // A continuous train-relative landscape. Each tile has persistent geometry and repeats only offscreen.
    world.scroll=[];let rng=randFactory(1228),tileLength=64;
    for(let n=0;n<7;n++){let g=G(scene,(n-3)*tileLength,-.65,0);B(g,0,-.10,0,tileLength,.18,170,m.earth);
      for(let z of [-1.45,1.45,-6.8,-9.6])B(g,0,.12,z,tileLength,.12,.11,m.metal);
      let sleepers=new T.InstancedMesh(geometry('BoxGeometry',[.29,.15,3.6]),m.wood,64),mx=new T.Matrix4(),si=0;for(let i=0;i<32;i++)for(let z of [0,-8.2])sleepers.setMatrixAt(si++,mx.makeTranslation(-31+i*2,.03,z));g.add(sleepers);
      for(let side of [-1,1])for(let j=0;j<5;j++){let x=-30+j*13+(rng()-.5)*5,z=side*(19+rng()*48),h=6+rng()*18;
        if(['industrial','grid','night'].includes(p.theme)){let b=B(g,x,h/2,z,6+rng()*5,h,7+rng()*6,m.wall);for(let y=1.5;y<h;y+=2.6)for(let xx=-2;xx<=2;xx+=2)B(g,x+xx,y,z-side*3.53,.75,.65,.03,m.lamp);}
        else{let mountain=C(g,x,h*.39,z,2+rng()*3,7+rng()*9,h,m.earth,5);mountain.rotation.y=rng()*Math.PI;mountain.scale.z=1.2;}
      }
      for(let j=0;j<5;j++){let x=-28+j*13,z=(j%2?1:-1)*(12+rng()*8),h=1.4+rng()*2;C(g,x,h/2,z,.07,.12,h,m.wood);let top=S(g,x,h,z,.75,m.green);top.scale.set(1.6,.44,1.3);}
      if(n%2===0){for(let j=0;j<4;j++){let x=-10+j*4,z=14;B(g,x,.9,z,2.6,1.8,2.3,m.cream);let roof=C(g,x,2.3,z,.05,1.9,1.1,m.wood,4);roof.rotation.y=Math.PI/4;}for(let j=0;j<5;j++)B(g,-14+j*1.5,.55,-15,1.05,.9,.8,m.wood);}
      world.scroll.push(g);
    }
    let parallel=G(scene,-36,-.48,-8.2);for(let i=0;i<4;i++)railcar(parallel,-i*8.3,0,8,'steel',2.8);world.parallel=parallel;
    world.parallelStart=-43;world.parallelSpeed=3.2;
  }
  function flatSite(p,bounds,groundY=0){world.bounds=bounds;world.start=V(bounds.minX+2,0,0);world.startSeat=false;world.startFace=1;B(world.scene,(bounds.minX+bounds.maxX)/2,groundY-.12,(bounds.minZ+bounds.maxZ)/2,bounds.maxX-bounds.minX+5,.24,bounds.maxZ-bounds.minZ+5,world.m.earth);}
  function treeAt(p,x,z,h=6){let m=world.m;C(p,x,h/2,z,.12,.30,h,m.wood,8);for(let j=0;j<3;j++){let o=S(p,x+(j-1)*.8,h-j*.3,z+(j%2?.5:-.2),1.65,m.green);o.scale.set(1.4,.55,1.25);}}
  function siteBackdrop(p,theme){let m=world.m,rng=randFactory(237);for(let i=0;i<18;i++){let a=i/18*Math.PI*2,r=31+rng()*12,h=5+rng()*18;let o=C(p,Math.cos(a)*r,h*.35-1,Math.sin(a)*r,2+rng()*4,7+rng()*8,h,m.earth,5);o.rotation.y=rng()*Math.PI;}if(['forest','stone','ash','highland'].includes(theme))for(let i=0;i<15;i++){let a=i/15*Math.PI*2;treeAt(p,Math.cos(a)*24,Math.sin(a)*19,3+rng()*3);}}
  function makeApiary(p){
    let m=world.m,s=world.scene;flatSite(p,{minX:-12,maxX:20,minZ:-10,maxZ:10});siteBackdrop(s,p.theme);
    let burned=p.theme==='ash';for(let row of [-1,1])for(let x of [-6,-2,2,6,10,14]){hiveBox(s,x,row*3.2,burned);newBees(s,burned?1:3,x,.94,row*3.2,.045);if(burned){let smoke=S(s,x,1.0,row*3.2,.33,m.smoke.clone());world.moving.push({o:smoke,kind:'smoke',x,y:1,z:row*3.2,seed:world.moving.length});}}
    for(let x=-9;x<19;x+=1.8)B(s,x,.34,7.9,1.68,.7,.48,m.cream);for(let x of [-6,1,8])treeAt(s,x,-8,4.2);
    let cliff=G(s,17,0,0);for(let j=0;j<7;j++){let o=C(cliff,(j%3-1)*.8,1.0+Math.floor(j/3)*.65,-.9+Math.floor(j/3)*1.0,.7,1.3,1.8,m.cream,5);o.rotation.z=.13;}
    for(let j=0;j<4;j++)honeycomb(cliff,-1.03,1.1+(j%2)*.31,-.45+Math.floor(j/2)*.35,.17,m.honey,Math.PI/2);
    addPerson(s,10,1.5,{coat:m.white,hat:false,kind:'beekeeper'});
    if(!burned){for(let i=0;i<4;i++){let x=-8+i*5,z=-7.4;B(s,x,1.0,z,3.2,2,2.65,m.cream);C(s,x,2.65,z,.04,2.25,1.3,m.wood,4).rotation.y=Math.PI/4;B(s,x,.7,z+1.34,.7,1.4,.06,m.dark);}}
    pushInteraction(s,16,0,'Inspect the limestone hive',()=>{beeTime=time;note('Half for me, half for them. The remaining bees stay with the hive.');},2.4);
    portal(s,18,4,p.portal||'hive','THE HIVE',-Math.PI/2);
    route=[V(-6,0,0),V(1,0,0),V(8,0,0),V(15,0,0)];world.start=V(-10,0,0);
  }
  function makeHive(p){
    let m=world.m,s=world.scene;flatSite(p,{minX:-12,maxX:18,minZ:-12,maxZ:12});siteBackdrop(s,p.theme);
    for(let x=-10;x<18;x+=4.5){for(let z of [-5.5,5.5]){C(s,x,2.9,z,.30,.55,5.8,m.wood,8);for(let j=0;j<4;j++){let q=honeycomb(s,x,1.2+j*1.04,z,.57,m.honey,Math.PI/2);q.rotation.z=Math.PI/6;}}}
    for(let x of [-3,5,12]){let arch=G(s,x,0,0);for(let j=0;j<10;j++){let a=Math.PI*j/9;let z=4.0*Math.cos(a),y=2+3.4*Math.sin(a);honeycomb(arch,0,y,z,.65,m.honey,Math.PI/2);B(arch,0,y,z,.26,.16,1.10,m.brass).rotation.x=-a;}}
    let pool=C(s,11,.04,0,2.7,2.7,.08,m.water,48);let rim=torus(s,11,.1,0,2.77,.12,m.brass);rim.rotation.x=Math.PI/2;
    for(let i=0;i<8;i++){let a=i*Math.PI/4;newBees(s,4,11+4*Math.cos(a),1.5,4*Math.sin(a),.075);}
    addPerson(s,8,2.7,{coat:m.white,hat:false,kind:'idle'});
    pushInteraction(s,11,0,'Look into the pool of tomorrow',()=>{cameraMode='Orbit';note('The pool reveals another journey. Enter its arch to return to the train.');},3);
    portal(s,16,0,p.portal,'THE SEALED LINE',-Math.PI/2);route=[V(-5,0,0),V(3,0,0),V(9,0,-1),V(13,0,0)];world.start=V(-10,0,0);
  }
  function wallRoom(s,cx,cz,len,width,openRight=true){
    let m=world.m,h=3.7;B(s,cx,h+.07,cz,len,.18,width,m.dark);B(s,cx,h/2,cz-width/2,len,h,.20,m.wall);B(s,cx,h/2,cz+width/2,len,h,.20,m.wall);B(s,cx-len/2,h/2,cz,.20,h,width,m.wall);block(cx,cz-width/2,len,.20);block(cx,cz+width/2,len,.20);block(cx-len/2,cz,.20,width);
    if(openRight){for(let z of [-1,1]){let zz=cz+z*(width/4+.45);B(s,cx+len/2,h/2,zz,.20,h,width/2-.9,m.wall);block(cx+len/2,zz,.20,width/2-.9);}B(s,cx+len/2,3.12,cz,.2,1.15,1.8,m.wall);}else B(s,cx+len/2,h/2,cz,.20,h,width,m.wall);
    for(let i=0;i<4;i++)lamp(s,cx-len*.4+i*len*.26,h-.19,cz);
    let light=new T.PointLight(currentRecipe.light,2.5,15,1.7);light.position.set(cx,3.2,cz);s.add(light);
  }
  function makeStation(p,mode='station'){
    let m=world.m,s=world.scene,mono=p.theme==='mono',raised=mode==='monorail';flatSite(p,{minX:-13,maxX:22,minZ:-5.5,maxZ:6});siteBackdrop(s,p.theme);
    if(raised){B(s,4,-6.3,0,65,.6,65,m.earth);for(let x=-12;x<26;x+=6)for(let z of [-3.8,3.8])B(s,x,-3.4,z,.7,6.6,.7,m.metal);B(s,4,-.08,0,40,.30,11,m.cream);}
    B(s,4,.04,-4.8,35,.08,.12,m.brass);B(s,4,.04,-7.2,35,.08,.12,m.brass);for(let x=-12;x<22;x+=1.8)B(s,x,-.03,-6,0.24,.12,3,m.dark);
    if(raised){B(s,4,-.72,-6,40,.85,.67,m.metal);for(let x=-10;x<24;x+=6)B(s,x,-3.7,-6,.85,6,.85,m.metal);}
    let terminal=G(s);B(terminal,4,3.2,4.9,29,6.4,.4,m.wall);B(terminal,4,6.6,1,29,.35,8.7,m.dark);for(let x=-10;x<20;x+=5){B(terminal,x,3.0,4.5,.44,6,.62,m.brass);B(terminal,x,2.2,4.62,2.8,2.6,.06,m.glass);lamp(terminal,x,4.8,4.15);}
    sign(s,raised?'2050 · ADDIS TRANSIT':p===recipes.wax?'RIFT VALLEY':'LA CIOTAT',5,4.3,4.65,5.4,Math.PI);
    for(let x of [-8,-2,4,10,16]){B(s,x,.28,3.1,2.0,.56,.65,m.wood);block(x,3.1,2,.65);}
    for(let x of [-5,0,7,13])addPerson(s,x,2.3,{coat:x%2?m.white:m.dark,kind:'idle',hat:!raised});
    for(let x of [-7,-5.5,-4]){B(s,x,.34,-2.5,1.22,.68,.8,m.wood);for(let j=0;j<3;j++)B(s,x+(j-1)*.31,.76,-2.5,.27,.14,.43,m.brass);block(x,-2.5,1.22,.8);}
    if(p===recipes.wax)addPerson(s,8,2.5,{coat:m.cream,instrument:true,kind:'music'});
    if(p===recipes.standoff){for(let x of [-2,5,12]){table(s,x,1.3,1.3,.8);chair(s,x,-.3,1);addPerson(s,x,1.95,{coat:m.white,kind:'idle'});}}
    let passing=G(s,-40,0,-6);for(let k=0;k<4;k++)railcar(passing,-k*8.1,0,8,raised?'steel':'wood',2.8);world.stationTrain=passing;
    if(raised){let lift=G(s,18,0,3.6);for(let x of [-.7,.7])for(let z of [-.7,.7])B(lift,x,1.4,z,.08,2.8,.08,m.metal);B(lift,0,.06,0,1.5,.12,1.5,m.brass);B(lift,0,2.85,0,1.5,.14,1.5,m.metal);B(lift,0,1.4,.75,1.4,2.6,.035,m.glass);pushInteraction(s,18,3.6,'Call the glass lift',()=>{note('Lift called; the visible lift car descends toward the plain.');world.liftAt=time;},2.2);world.lift=lift;}
    portal(s,20,0,p.portal||'temporal',raised?'NEXT LINE':'BOARD THE TRAIN',-Math.PI/2);world.start=V(-11,0,0);route=[V(-4,0,0),V(3,0,0),V(11,0,0),V(18,0,0)];
  }
  function makeCamera(p){
    let m=world.m,s=world.scene;flatSite(p,{minX:-12,maxX:22,minZ:-4.4,maxZ:4.4});siteBackdrop(s,p.theme);wallRoom(s,-6,0,12,8.5,true);
    let rig=G(s,-4,0,1.7);for(let z of [-.55,.55]){let leg=B(rig,0,.58,z,.10,1.17,.12,m.wood);leg.rotation.x=z>0?.45:-.45;}let leg=B(rig,-.4,.58,0,.12,1.17,.1,m.wood);leg.rotation.z=-.38;B(rig,0,1.33,0,.86,.58,.59,m.wood);let lens=C(rig,.53,1.34,0,.19,.24,.45,m.brass);lens.rotation.z=Math.PI/2;let glass=C(rig,.77,1.34,0,.16,.16,.05,m.glass);glass.rotation.z=Math.PI/2;for(let k of [-1,1]){let reel=torus(rig,-.14,1.85,k*.12,.27,.045,m.brass);reel.rotation.y=0;}block(-4,1.7,1.2,1.2);
    liveScreen(s,-7,1.92,-4.10,4.2,2.2,0,V(8,1.65,2.2),V(16,1.1,-3.0),'CINÉMATOGRAPHE');for(let x of [-10,-8]){chair(s,x,-1.2,1);chair(s,x,0,1);}
    B(s,9,.08,-3.8,22,.10,.11,m.metal);B(s,9,.08,-6.2,22,.10,.11,m.metal);let platformTrain=G(s,-30,.04,-5);for(let k=0;k<3;k++)railcar(platformTrain,-k*8.2,0,8,'wood');world.stationTrain=platformTrain;for(let x of [5,10,15])addPerson(s,x,2.5,{coat:m.dark,kind:'idle'});sign(s,'THE ARRIVAL',13,2.6,3.9,2.7,Math.PI);
    pushInteraction(s,-4,1.0,'Inspect the lens',()=>{cameraMode='Bee';note('The camera becomes an instrument of scale.');},1.8);
    portal(s,20,0,p.portal,'THE PLATFORM',-Math.PI/2);world.start=V(-10,0,1.0);route=[V(-6,0,0),V(-1,0,0),V(5,0,0),V(14,0,0)];
  }
  function makeSurveillance(p){
    let m=world.m,s=world.scene;flatSite(p,{minX:-12,maxX:20,minZ:-5,maxZ:5});siteBackdrop(s,p.theme);wallRoom(s,-6,0,12,9.8,true);
    B(s,-6,.45,3.8,9,.9,1.2,m.dark);block(-6,3.8,9,1.2);
    for(let i=0;i<4;i++)liveScreen(s,-10.1+i*2.5,1.8,4.35,2.25,1.35,Math.PI,V(5+i*2,3.0,-4.5),V(12,1.0,0),['NORTH','HIVE','TRACK','THRESHOLD'][i]);
    for(let x of [-9,-6,-3])addPerson(s,x,2.8,{coat:m.metal,kind:'idle',rot:-Math.PI/2});
    for(let x of [6,11,16])for(let j=-2;j<=2;j++){honeycomb(s,x,1.3+Math.abs(j)*.32,j*1.5,.62,m.honey,Math.PI/2);newBees(s,2,x,1.5,j*1.5,.08);}
    for(let x of [6,14]){C(s,x,2.1,-3.5,.10,.19,4.2,m.metal);B(s,x,4.2,-3.5,.6,.29,.36,m.dark);S(s,x+.3,4.2,-3.5,.10,m.lamp);}
    portal(s,18,0,p.portal,'THE SEALED CAR',-Math.PI/2);world.start=V(-11,0,0);route=[V(-7,0,0),V(-1,0,0),V(6,0,0),V(14,0,0)];
  }
  function makeGarden(p){
    let m=world.m,s=world.scene;flatSite(p,{minX:-12,maxX:20,minZ:-11,maxZ:11});siteBackdrop(s,p.theme);
    for(let x=-11;x<8;x+=1.4){B(s,x,.04,-.65,1.3,.08,.13,m.metal);B(s,x,.04,.65,1.3,.08,.13,m.metal);B(s,x,0,0,.25,.10,2.1,m.wood);}
    let switcher=G(s,3,0,1.4);B(switcher,0,.13,0,.7,.26,.7,m.dark);let lever=B(switcher,0,.65,0,.10,1.2,.10,m.brass);lever.rotation.z=.30;S(switcher,-.18,1.23,0,.14,m.red);pushInteraction(s,3,0,'Operate the branching switch',()=>{lever.rotation.z*=-1;note('The route branches. Both paths remain visible.');},1.7);
    for(let z of [-5.0,5.0])for(let x of [3,7,11,15]){treeAt(s,x,z,4.3);plant(s,x,.0,z+(z>0?-1:1),.8);}
    for(let k of [-1,1])for(let i=0;i<7;i++){let a=G(s,5+i*1.8,0,k*i*.85);a.rotation.y=k*-.44;B(a,0,.05,0,1.9,.1,.22,m.cream);}
    portal(s,17,-5,'camera','CINEMA',-Math.PI/2);portal(s,17,5,'hive','HIVE',-Math.PI/2);world.start=V(-10,0,0);route=[V(-3,0,0),V(3,0,0),V(9,0,-2),V(15,0,-5)];
  }
  function disposeWorld(){if(!world)return;world.feeds.forEach(f=>f.rt.dispose());world.textures.forEach(t=>t.dispose());let used=new Set();world.scene.traverse(o=>{if(o.material){for(let m of Array.isArray(o.material)?o.material:[o.material])used.add(m);}});for(let m of used){if(!ctx.isSharedMaterial?.(m))m.dispose();}world=null;}
  function sourceFor(recipe){return db?.clips.find(x=>x.recipe===recipe)||db?.worlds.find(x=>x.recipe===recipe)||{id:'recipe:'+recipe,title:recipes[recipe]?.title||recipe,kind:'recipe',recipe};}
  function note(s){interactNote=s;interactUntil=time+4;logEvent('note',{text:s});}
  function logEvent(event,detail={}){log.push({t:+time.toFixed(3),source:currentSource?.id,event,...detail});if(log.length>1000)log.shift();}
  function enterRecipe(recipe,source,template=false,portalTravel=false){
    if(!recipes[recipe])return;
    let wasActive=active;if(recording&&!portalTravel)stopRecord();
    if(!portalTravel)log.length=0;
    disposeWorld();currentSource=source||sourceFor(recipe);currentRecipe=recipes[recipe];sourceTemplate=template;time=portalTravel?time:0;keys.clear();autoplay=false;autoIndex=0;cameraMode='Follow';yaw=0;pitch=0;orbit=0;camPos=null;camAim=null;eventTime=-100;beeTime=-100;lastFeed=0;feedIndex=0;interactNote='';route=[];
    let s=new T.Scene();s.background=new T.Color(currentRecipe.sky);s.fog=new T.Fog(currentRecipe.sky,currentRecipe.train?24:20,currentRecipe.train?105:78);
    const m=materials(currentRecipe);world={scene:s,m,blocks:[],seats:[],rooms:[],people:[],moving:[],bees:[],wheels:[],feeds:[],textures:[],interactions:[],train:false,player:null,position:null,face:0,gait:0,seat:false,seatTransition:null,travel:0};
    let hemi=new T.HemisphereLight(currentRecipe.light,0x676568,.83);s.add(hemi);let sun=new T.DirectionalLight(currentRecipe.light,1.4);sun.position.set(-12,20,11);s.add(sun);
    if(currentRecipe.train)makeTrainWorld(currentRecipe);else if(currentRecipe.site==='apiary')makeApiary(currentRecipe);else if(currentRecipe.site==='hive')makeHive(currentRecipe);else if(currentRecipe.site==='camera')makeCamera(currentRecipe);else if(currentRecipe.site==='surveillance')makeSurveillance(currentRecipe);else if(currentRecipe.site==='garden')makeGarden(currentRecipe);else makeStation(currentRecipe,currentRecipe.site);
    world.player=ctx.makePerson(s,{coat:m.wood,caseHeld:!!currentRecipe.train,skin:m.skin});world.player.root.name='TRAVELER_001';world.position=world.start.clone();world.face=world.startFace===1?0:Math.PI;world.seat=world.startSeat;world.seatBlend=world.seat?1:0;ctx.pose(world.player,world.seatBlend);
    const id=currentSource?.id;goalText=template?'Template-based sketch · '+currentRecipe.goal:currentRecipe.goal;active=true;visibleLibrary=false;closePreview();panel.hidden=true;gameHUD.hidden=false;ctx.hud.hidden=true;ctx.launcher.hidden=true;ctx.controls.enabled=false;
    titleEl.textContent=currentSource.title;tagEl.textContent=(template?'TEMPLATE PREVIS':'PLAYABLE ADAPTATION')+' · '+id;goalEl.textContent=goalText;logEvent(portalTravel?'portal_enter':'world_enter',{recipe,template});if(portalTravel)note('Entered '+currentSource.title);
    if(world.seat)cameraMode='Orbit';
  }
  function stand(){if(!world.seat||world.seatTransition)return;world.seat=false;world.seatTransition={t:time,from:world.position.clone(),to:V(world.position.x,0,0),a:world.seatBlend,b:0};logEvent('stand');}
  function toggleSeat(){if(world.seatTransition)return;if(world.seat){stand();return;}if(!world.train){note('No train seat nearby.');return;}let p=world.position,seat=world.seats.slice().sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x)).find(s=>Math.abs(s.x-p.x)<1.15);if(!seat){note('Move closer to a seat.');return;}world.seat=true;world.face=seat.dir===1?0:Math.PI;world.seatTransition={t:time,from:p.clone(),to:V(seat.x,0,seat.z),a:0,b:1};cameraMode='Orbit';logEvent('sit');}
  function passable(x,z){if(x<world.bounds.minX||x>world.bounds.maxX||z<world.bounds.minZ||z>world.bounds.maxZ)return false;return !world.blocks.some(b=>Math.abs(x-b.x)<b.w/2+.20&&Math.abs(z-b.z)<b.d/2+.20);}
  function nearest(){if(!world)return null;let best=null,d=Infinity;for(let x of world.interactions){let dist=world.position.distanceTo(x.pos);if(dist<x.r&&dist<d){d=dist;best=x;}}return best;}
  function interact(){if(!active)return;let hit=nearest();if(hit){logEvent('interact',{target:hit.label});hit.action();}else{note('Approach a framed doorway, hive, crate or instrument.');}}
  function manualMove(dt){
    let w=world,p=w.position,k=keys;let forward=(k.has('w')?1:0)-(k.has('s')?1:0),side=(k.has('d')?1:0)-(k.has('a')?1:0);
    if(forward||side){stand();if(autoplay)autoplay=false;}
    yaw=clamp(yaw+((k.has('arrowleft')?1:0)-(k.has('arrowright')?1:0))*dt*1.15,-Math.PI,Math.PI);pitch=clamp(pitch+((k.has('arrowup')?1:0)-(k.has('arrowdown')?1:0))*dt*.85,-.9,.9);
    if(w.seatTransition){let a=w.seatTransition,t=clamp((time-a.t)/.85,0,1),q=t*t*(3-2*t);p.copy(a.from).lerp(a.to,q);w.seatBlend=a.a+(a.b-a.a)*q;if(t>=1)w.seatTransition=null;return 0;}
    let dx=0,dz=0;if(autoplay&&route[autoIndex]){stand();let target=route[autoIndex];dx=target.x-p.x;dz=target.z-p.z;let d=Math.hypot(dx,dz);if(d<.36){autoIndex++;logEvent('waypoint',{index:autoIndex});if(autoIndex===1){beeTime=time;eventTime=time;cameraMode='Follow';}if(autoIndex===2)cameraMode=w.train?'Window':'Orbit';if(autoIndex>=route.length){autoplay=false;cameraMode=w.train?'Exterior':'Witness';logEvent('take_complete');if(recording)stopRecord();}return 0;}dx/=d;dz/=d;}else{dx=forward;dz=side;}
    let mag=Math.hypot(dx,dz);if(mag>1){dx/=mag;dz/=mag;}if(!mag)return 0;
    const sp=world.train?1.65:2.5,old=p.clone(),x=p.x+dx*sp*dt,z=p.z+dz*sp*dt;
    if(passable(x,p.z))p.x=x;if(passable(p.x,z))p.z=z;
    if(p.distanceTo(old)>1e-5){w.face=Math.atan2(-dz,dx);w.gait+=p.distanceTo(old)*6.5;return 1;}return 0;
  }
  function update(dt){
    let w=world,s=w.scene;time+=dt;let gait=manualMove(dt);w.player.root.position.copy(w.position);w.player.root.rotation.y=w.face;ctx.pose(w.player,w.seatBlend,gait,w.gait);
    if(w.train){w.travel+=dt*7.5;for(let g of w.scroll){g.position.x-=dt*7.5;if(g.position.x<-224)g.position.x+=448;}for(let wh of w.wheels)wh.rotation.y+=dt*8;let x=w.parallel.position.x+dt*(time-beeTime<14?5.5:3.2);w.parallel.position.x=x>68?-55:x;}
    if(w.stationTrain){let x=w.stationTrain.position.x+dt*4.1;w.stationTrain.position.x=x>50?-45:x;}
    if(w.lift&&w.liftAt!==undefined){let t=time-w.liftAt;w.lift.position.y=t<5?-Math.min(5.6,t*1.12):t<8?-5.6:Math.min(0,-5.6+(t-8)*1.1);}
    for(let q of w.people){let a=q.kind==='music'?.22*Math.sin(time*7+q.seed):q.kind==='argument'&&time-eventTime<8?.75*Math.sin(time*7+q.seed):q.kind==='beekeeper'?.18*Math.sin(time*1.8+q.seed):.05*Math.sin(time*1.4+q.seed);ctx.pose(q.person,q.sit?1:0,0,0,a);}
    for(let q of w.moving){if(q.kind==='cart')q.o.position.x=q.x-1.25*(1-Math.cos(time*.35));if(q.kind==='fish'){q.o.position.x=.5*Math.sin(time*.9+q.seed);q.o.position.y=1.1+.16*Math.sin(time*1.6+q.seed);q.o.position.z=.2*Math.cos(time*.8+q.seed);}if(q.kind==='mini'){q.o.position.x=q.x+.36*Math.cos(time*1.6);q.o.position.z=q.z+.36*Math.sin(time*1.6);}if(q.kind==='smoke'){q.o.position.y=q.y+(time*.5+q.seed*.3)%2.9;q.o.scale.setScalar(.85+q.o.position.y*.32);q.o.material.opacity=.11*(1-q.o.position.y/4);}}
    for(let b of w.bees){let a=time*1.4+b.phase,more=time-beeTime<9?1.2:.35;b.g.position.set(b.base.x+Math.sin(a)*more,b.base.y+.22*Math.sin(a*1.6),b.base.z+.29*Math.cos(a*.8));b.g.rotation.y=-a;b.wings.forEach((q,i)=>q.rotation.x=Math.sin(time*100+b.phase)*(i?1:-1));}
    const p=w.position,dir=V(Math.cos(w.face),0,-Math.sin(w.face)),right=V(-dir.z,0,dir.x);let pos,aim;
    if(cameraMode==='First'){pos=p.clone().add(V(0,w.seat?1.13:1.65,0));aim=pos.clone().add(dir.clone().multiplyScalar(3));}
    else if(cameraMode==='Bee'){let closest=null,d=Infinity;for(let b of w.bees){let bp=b.g.getWorldPosition(V()),dd=bp.distanceToSquared(p);if(dd<d){d=dd;closest=bp;}}if(closest){pos=closest.clone().add(V(-.46,.10,.15));aim=closest.clone().add(V(.80,0,0));}else{pos=p.clone().add(V(-.25,.40,-.20));aim=p.clone().add(V(2,.52,0));}}
    else if(cameraMode==='Orbit'){orbit+=dt*.38;let dist=w.train?2.45:3.5;pos=p.clone().add(V(dist*Math.cos(orbit),w.seat?1.5:2.0,w.train?-.58-.24*Math.sin(orbit):dist*Math.sin(orbit)));aim=p.clone().add(V(0,w.seat?.9:1.05,0));}
    else if(cameraMode==='Window'&&w.train){pos=p.clone().add(V(-1.3,1.50,.6));aim=p.clone().add(V(2,1.5,-10));}
    else if(cameraMode==='Exterior'){pos=p.clone().add(V(-6,6,w.train?-10:-8));aim=p.clone().add(V(2,1.3,0));}
    else if(cameraMode==='Witness'){pos=p.clone().add(V(-4,2.5,w.train?-.65:5.5));aim=p.clone().add(V(0,1.1,0));}
    else{pos=p.clone().add(dir.clone().multiplyScalar(-2.5)).add(V(0,w.seat?1.35:1.75,0)).add(right.multiplyScalar(w.train?-.35:.55));aim=p.clone().add(V(0,w.seat?.94:1.22,0)).add(dir.clone().multiplyScalar(.35));}
    if(w.train&&cameraMode!=='Exterior'&&cameraMode!=='Bee'){pos.x=clamp(pos.x,-5.7,w.bounds.maxX+.25);pos.z=clamp(pos.z,-1.5,1.5);pos.y=clamp(pos.y,.25,2.55);}
    const look=aim.clone().sub(pos);look.applyAxisAngle(V(0,1,0),yaw);let sideAxis=V().crossVectors(look,V(0,1,0)).normalize();if(sideAxis.lengthSq()>.1)look.applyAxisAngle(sideAxis,pitch);aim=pos.clone().add(look);
    if(!camPos){camPos=pos;camAim=aim;}else{camPos.lerp(pos,1-Math.exp(-dt*7));camAim.lerp(aim,1-Math.exp(-dt*7));}
    world.camera.position.copy(camPos);world.camera.lookAt(camAim);world.camera.fov=cameraMode==='Exterior'?54:cameraMode==='Bee'?75:65;world.camera.updateProjectionMatrix();
  }
  const feedCamera=new T.PerspectiveCamera(68,16/9,.05,160);
  function renderFeeds(now){let w=world;if(!w.feeds.length||now-lastFeed<280)return;lastFeed=now;let f=w.feeds[feedIndex++%w.feeds.length];if(!f)return;const old=R.getRenderTarget(),vis=w.feeds.map(q=>q.screen.visible);try{w.feeds.forEach(q=>q.screen.visible=false);feedCamera.position.copy(f.position);feedCamera.lookAt(f.target);R.setRenderTarget(f.rt);baseRender(w.scene,feedCamera);}finally{R.setRenderTarget(old);w.feeds.forEach((q,i)=>q.screen.visible=vis[i]);}}
  function frame(dt,now){if(!active||!world)return false;if(!world.camera)world.camera=new T.PerspectiveCamera(65,window.innerWidth/window.innerHeight,.035,180);world.camera.aspect=window.innerWidth/window.innerHeight;update(dt);renderFeeds(now);baseRender(world.scene,world.camera);if(stillPending){stillPending=false;R.domElement.toBlob(b=>{if(b)download(b,'frame-'+currentSource.id+'.png');},'image/png');}let near=nearest();statusEl.textContent=(time.toFixed(1)+'s · '+cameraMode+(autoplay?' · TAKE':'')+(recording?' · REC':''));promptEl.textContent=time<interactUntil?interactNote:near?'E · '+near.label:goalText;camButton.textContent=cameraMode;takeButton.textContent=autoplay?'Pause':'Take';recButton.textContent=recording?'Stop':'REC';return true;}
  function download(blob,name){let a=E('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),20000);}
  function exportLedger(){let payload={source:currentSource?.id,recipe:Object.keys(recipes).find(k=>recipes[k]===currentRecipe),template:sourceTemplate,sourceURL:currentSource?.source,events:log.slice(),duration:time};download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'train-world-ledger.json');}
  function exportScore(){let x=currentSource,p=currentRecipe;let init='Playable third-person continuous cinematic world. '+p.title+'. '+p.goal+' Preserve one recognizable traveler and independent camera, character, and environmental motion. '+(p.train?'The train moves continuously; connected carriages: '+p.rooms.join(', ')+'. Use real doors, windows, and physical trajectories.':'Explore a stable physical set with navigable paths and architectural thresholds.')+' No arbitrary morphing or camera resets. Begin quietly. Use spatial audio and stable landmarks.';let payload={schema:'train-archive-previs-v1',source:x.id,source_url:x.source,source_prompt:x.prompt||x.description||'',template:sourceTemplate,world_setup:init,rooms:p.rooms||[],reference:x.sheet||null,events:log.slice(),live_event_examples:['A bee enters from the left and flies across the existing scene.','The traveler remains stationary while the camera slowly circles him.','The traveler walks through the existing doorway.']};download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'genie-world-'+x.id+'.json');}
  function toggleRecord(){if(recording){stopRecord();return;}if(!R.domElement.captureStream||!window.MediaRecorder){note('Canvas recording not supported in this browser.');return;}try{let stream=R.domElement.captureStream(24),chunks=[],mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));let rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:6000000}:undefined);record=rec;recordStream=stream;recChunks=chunks;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const id=currentSource.id;rec.onstop=()=>{let type=rec.mimeType||'video/webm';download(new Blob(chunks,{type}),'train-world-'+id+(type.includes('mp4')?'.mp4':'.webm'));stream.getTracks().forEach(x=>x.stop());};rec.start(1000);recording=true;logEvent('record_start');}catch(e){note('Recorder unavailable: '+e.message);}}
  function stopRecord(){if(record&&record.state!=='inactive'){logEvent('record_stop');record.stop();}recording=false;}
  function startTake(){if(!world)return;if(autoplay){autoplay=false;logEvent('take_pause');return;}if(autoIndex>=route.length){autoIndex=0;}autoplay=true;stand();cameraMode='Follow';logEvent('take_start');}
  function exit(){if(recording)stopRecord();autoplay=false;keys.clear();active=false;disposeWorld();gameHUD.hidden=true;ctx.hud.hidden=false;ctx.controls.enabled=false;logEvent('return_to_train');}
  function closePreview(){let v=panel.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load();}}
  function load(){if(db)return Promise.resolve(db);if(!loadPromise)loadPromise=fetch(libraryURL).then(r=>{if(!r.ok)throw Error('Archive HTTP '+r.status);return r.json()}).then(j=>{db=j;return j;}).catch(e=>{loadPromise=null;throw e;});return loadPromise;}
  function open(){visibleLibrary=true;keys.clear();panel.hidden=false;gameHUD.hidden=true;ctx.hud.hidden=true;listEl.textContent='Loading source registry…';load().then(()=>{if(!visibleLibrary)return;selected=selected||db.clips.find(x=>x.recipe==='highland')||db.clips[0];renderList();renderDetail();}).catch(e=>{listEl.textContent=e.message;});}
  function closeLibrary(){visibleLibrary=false;panel.hidden=true;closePreview();if(active)gameHUD.hidden=false;else ctx.hud.hidden=false;}
  function renderList(){
    let q=search.value.trim().toLowerCase(),items=tab==='island'?db.worlds:tab==='designed'?db.clips.filter(x=>x.recipe):db.clips;
    if(q)items=items.filter(x=>[x.id,x.title,x.cluster,x.chapter,x.description,x.prompt].filter(Boolean).join(' ').toLowerCase().includes(q));
    listEl.replaceChildren();countEl.textContent=items.length+' records';
    for(let r of items){let b=E('button');b.className='tw-card'+(selected?.id===r.id?' selected':'');let image=E('span');image.className='tw-thumb';if(r.poster){let im=E('img');im.src=r.poster;im.alt='';im.loading='lazy';image.appendChild(im);}else{image.textContent=r.kind==='island'?'⬡':'▣';}let info=E('span'),name=E('strong'),sub=E('small');name.textContent=r.title;sub.textContent=(r.kind==='island'?r.id+' · '+r.chapter:'#'+r.id.split('_')[0])+' · '+(r.recipe?'Designed':'Reference');info.append(name,sub);b.append(image,info);b.onclick=()=>{selected=r;renderList();renderDetail();};listEl.appendChild(b);}
  }
  function addText(p,tag,t,cls){let o=E(tag);o.textContent=t;if(cls)o.className=cls;p.appendChild(o);return o;}
  function addLink(p,label,href){if(!href)return;let a=E('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener';p.appendChild(a);}
  function renderDetail(){
    closePreview();detail.replaceChildren();if(!selected)return;let r=selected;
    addText(detail,'small',r.kind==='clip'?'EL DESIERTO · '+r.id:'ISLAND ECOLOGY · '+r.id,'tw-kicker');addText(detail,'h2',r.title);
    if(r.preview){let video=E('video');video.controls=true;video.playsInline=true;video.preload='none';video.src=r.preview;if(r.poster)video.poster=r.poster;detail.appendChild(video);}
    else if(r.poster){let img=E('img');img.className='tw-preview';img.src=r.poster;detail.appendChild(img);}
    addText(detail,'p',r.play||r.description||'Archived candidate; inspect footage and prompt before selecting a template.');
    let links=E('div');links.className='tw-links';addLink(links,'Contact sheet',r.sheet);addLink(links,'Full video',r.full);addLink(links,'Source',r.source);detail.appendChild(links);
    if(r.worldIds?.length){let line=E('div');line.className='tw-links';for(let id of r.worldIds){let b=E('button');b.textContent=id;b.onclick=()=>{selected=db.worlds.find(x=>x.id===id)||r;tab='island';for(let q of panel.querySelectorAll('[data-tab]'))q.classList.toggle('on',q.dataset.tab===tab);renderList();renderDetail();};line.appendChild(b);}detail.appendChild(line);}
    let controls=E('div');controls.className='tw-enter';
    let choose=E('select');for(let [k,v] of Object.entries(recipes)){let o=E('option');o.value=k;o.textContent=v.title;choose.appendChild(o);}choose.value=r.recipe||r.template||'highland';
    let enter=E('button');enter.className='tw-primary';enter.textContent=r.recipe?'Enter playable world':'Enter selected template';enter.onclick=()=>enterRecipe(choose.value,r,!r.recipe||r.recipe!==choose.value);
    if(!r.recipe)addText(detail,'p','No bespoke 3D adaptation yet. Select a template to explore a clearly labeled procedural sketch.','tw-note');
    choose.onchange=()=>enter.textContent=r.recipe===choose.value?'Enter playable world':'Enter selected template';
    controls.append(choose,enter);detail.appendChild(controls);
    let d=E('details');let summary=addText(d,'summary',r.kind==='clip'?'Original archived prompt':'WorldText data');let pre=E('pre');pre.textContent=r.kind==='clip'?r.prompt:JSON.stringify({locations:r.locations,entities:r.entities,relations:r.relations,states:r.states,rules:r.rules,events:r.events},null,2);d.appendChild(pre);detail.appendChild(d);
    addText(detail,'p','Procedural interpretation of archived footage and WorldText, not photogrammetry or recovered 3D geometry.','tw-note');
  }
  const css=E('style');css.textContent=`
  #twLibrary[hidden],#twGame[hidden]{display:none!important}
  #twLibrary,#twGame{font:13px/1.4 system-ui,sans-serif;color:#e6d9c3;position:fixed;z-index:1200;inset:0;box-sizing:border-box}
  #twLibrary * ,#twGame *{box-sizing:border-box}#twLibrary{background:#151b1ceF;display:flex;flex-direction:column;padding:max(12px,env(safe-area-inset-top)) 16px max(12px,env(safe-area-inset-bottom));overflow:hidden}
  #twLibrary header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}#twLibrary h1{font:500 19px Georgia;letter-spacing:.09em;margin:0}#twLibrary button,#twGame button,#twLibrary select{border:1px solid #b8a27a55;color:#e6d9c3;background:#212829;padding:7px 10px;margin:0;border-radius:3px;font:500 12px system-ui;cursor:pointer}
  #twLibrary button:hover,#twGame button:hover{background:#4c4335}#twLibrary .tw-tabs{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-bottom:10px}#twLibrary .tw-tabs button.on{background:#c4aa7d;color:#182021}
  #twLibrary input{padding:8px;background:#101719;border:1px solid #a28d6755;color:#efe0c4;min-width:80px;flex:1;border-radius:3px}
  #twLibrary .tw-body{min-height:0;flex:1;display:grid;grid-template-columns:minmax(200px,32%) 1fr;gap:16px}
  #twLibrary .tw-list,#twLibrary .tw-detail{overflow:auto;min-height:0;overscroll-behavior:contain;scrollbar-color:#827355 #182022}
  #twLibrary .tw-list{display:grid;gap:5px;align-content:start;padding-right:4px}
  #twLibrary .tw-card{text-align:left;display:flex;align-items:center;gap:9px;padding:4px;min-height:60px;max-width:100%;white-space:normal}
  #twLibrary .tw-card.selected{border-color:#d4b677;background:#413c31}#twLibrary .tw-card strong{display:block;font-size:12px;line-height:1.2}#twLibrary small{display:block;font:10px ui-monospace,monospace;color:#b6a78e;margin-top:4px}
  #twLibrary .tw-thumb{display:grid;place-items:center;flex:0 0 75px;height:52px;background:#303c3d;font-size:23px;color:#bca46e;overflow:hidden}#twLibrary .tw-thumb img{width:100%;height:100%;object-fit:cover}
  #twLibrary h2{font:400 23px Georgia;margin:7px 0 10px}#twLibrary .tw-detail{padding:0 8px 18px 2px}#twLibrary video,#twLibrary .tw-preview{display:block;max-width:100%;width:100%;height:min(38vh,320px);background:#101416;object-fit:contain;border:1px solid #b8a27a33}
  #twLibrary p{margin:10px 0;font-size:13px}#twLibrary .tw-note{font-size:11px;color:#bcad93}#twLibrary .tw-links{display:flex;gap:14px;flex-wrap:wrap}#twLibrary a{color:#dbc08c;font-size:12px}
  #twLibrary .tw-enter{display:flex;gap:6px;margin:12px 0;flex-wrap:wrap}#twLibrary .tw-enter select{flex:1;min-width:120px}#twLibrary .tw-primary{background:#d6b981;color:#202426;font-weight:700}
  #twLibrary details{padding:8px;border-top:1px solid #b8a27a44}#twLibrary pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.5;color:#bfbba8}
  #twGame{pointer-events:none;text-shadow:0 1px 4px #000}#twGame .tw-top{position:absolute;top:max(10px,env(safe-area-inset-top));left:12px;right:12px;display:flex;justify-content:space-between;gap:12px}#twGame .tw-top h2{font:400 17px Georgia;margin:0}#twGame small{font:10px ui-monospace,monospace;color:#e8d0a4}#twGame .tw-status{font:11px ui-monospace,monospace}
  #twGame .tw-help{position:absolute;bottom:92px;left:12px;right:12px;text-align:center;font-size:12px;color:#ffe1ad;text-shadow:0 2px 5px #000}#twGame .tw-bar{position:absolute;bottom:max(8px,env(safe-area-inset-bottom));left:8px;right:8px;display:flex;justify-content:center;gap:4px;flex-wrap:wrap;padding:6px;background:#101718ab;border:1px solid #b8a27a45;border-radius:4px;max-width:820px;margin:auto;pointer-events:auto}
  #twGame button{pointer-events:auto;touch-action:none;background:#182024dc}#twGame.clean .tw-bar,#twGame.clean .tw-help,#twGame.clean .tw-name,#twGame.clean .tw-status{display:none}
  @media(max-width:700px){#twLibrary{padding:8px}#twLibrary .tw-body{grid-template-columns:minmax(95px,34%) 1fr;gap:7px}#twLibrary .tw-card{display:block;padding:3px;min-height:72px}#twLibrary .tw-thumb{width:100%;height:48px;margin-bottom:3px}#twLibrary .tw-card strong{font-size:10px}#twLibrary .tw-card small{font-size:9px}#twLibrary .tw-detail h2{font-size:17px}#twLibrary video{height:26vh}#twLibrary .tw-detail p{font-size:11px}#twGame button{padding:6px 8px;font-size:10px}#twGame .tw-help{bottom:112px}}
  `;
  document.head.appendChild(css);
  const panel=E('section');panel.id='twLibrary';panel.hidden=true;panel.innerHTML=`<header><div><h1>BEES ON A TRAIN / FILM WORLDS</h1><small>ARCHIVE → WALKABLE SET → FILM</small></div><button data-close>Return to world</button></header><div class="tw-tabs"><button data-tab="designed" class="on">Playable</button><button data-tab="clips">El Desierto</button><button data-tab="island">Island Ecology</button><input aria-label="Search archive" placeholder="Search clip, prompt, world ID"><small class="tw-count"></small></div><div class="tw-body"><div class="tw-list"></div><div class="tw-detail"></div></div>`;
  document.body.appendChild(panel);const listEl=$('.tw-list',panel),detail=$('.tw-detail',panel),search=$('input',panel),countEl=$('.tw-count',panel);
  $('[data-close]',panel).onclick=closeLibrary;search.oninput=()=>db&&renderList();for(let b of panel.querySelectorAll('[data-tab]'))b.onclick=()=>{tab=b.dataset.tab;for(let q of panel.querySelectorAll('[data-tab]'))q.classList.toggle('on',q===b);if(db){renderList();renderDetail();}};
  const gameHUD=E('div');gameHUD.id='twGame';gameHUD.hidden=true;gameHUD.innerHTML=`<div class="tw-top"><div class="tw-name"><small class="tw-tag"></small><h2 class="tw-title"></h2><div class="tw-status"></div><small class="tw-goal"></small></div><div><button data-op="library">Worlds</button> <button data-op="hud">HUD</button></div></div><div class="tw-help"></div><div class="tw-bar"><button data-key="w">↑</button><button data-key="a">←</button><button data-key="s">↓</button><button data-key="d">→</button><button data-key="arrowleft">Look L</button><button data-key="arrowright">Look R</button><button data-op="camera">Follow</button><button data-op="stand">Stand / sit</button><button data-op="interact">Enter / E</button><button data-op="bee">Bees</button><button data-op="event">Event</button><button data-op="take">Take</button><button data-op="rec">REC</button><button data-op="still">Still</button><button data-op="score">Genie score</button><button data-op="ledger">Ledger</button><button data-op="exit">Train hub</button></div>`;
  document.body.appendChild(gameHUD);const titleEl=$('.tw-title',gameHUD),tagEl=$('.tw-tag',gameHUD),goalEl=$('.tw-goal',gameHUD),statusEl=$('.tw-status',gameHUD),promptEl=$('.tw-help',gameHUD),camButton=$('[data-op="camera"]',gameHUD),takeButton=$('[data-op="take"]',gameHUD),recButton=$('[data-op="rec"]',gameHUD);
  function cycle(){cameraMode=cameraModes[(cameraModes.indexOf(cameraMode)+1)%cameraModes.length];yaw=0;pitch=0;logEvent('camera',{mode:cameraMode});}
  function fire(op){if(op==='library')open();else if(op==='hud')gameHUD.classList.toggle('clean');else if(op==='camera')cycle();else if(op==='stand')toggleSeat();else if(op==='interact')interact();else if(op==='bee'){beeTime=time;logEvent('swarm');note('The swarm moves through the existing space.');}else if(op==='event'){eventTime=time;logEvent('ambient_event');note('Nearby inhabitants respond; the environment remains intact.');}else if(op==='take')startTake();else if(op==='rec')toggleRecord();else if(op==='still')stillPending=true;else if(op==='score')exportScore();else if(op==='ledger')exportLedger();else if(op==='exit'){exit();closeLibrary();}}
  for(let b of gameHUD.querySelectorAll('[data-op]'))b.onclick=()=>fire(b.dataset.op);
  const navKeys=new Set(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown']);
  for(let b of gameHUD.querySelectorAll('[data-key]')){let key=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);autoplay=false;b.setPointerCapture?.(e.pointerId);});for(let ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(key));}
  window.addEventListener('keydown',e=>{if(!active||visibleLibrary||e.target?.matches?.('input,select,textarea'))return;let k=e.key.toLowerCase();if(navKeys.has(k)){e.preventDefault();keys.add(k);autoplay=false;}else if(!e.repeat){if(k===' ') {e.preventDefault();toggleSeat();}else if(k==='e')interact();else if(k==='c')cycle();else if(k==='f')fire('bee');else if(k==='g')fire('event');else if(k==='r')toggleRecord();else if(k==='k')stillPending=true;else if(k==='h')fire('hud');else if(k==='escape')open();else if(/^[1-7]$/.test(k)){cameraMode=cameraModes[Number(k)-1];yaw=pitch=0;}}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());R.domElement.addEventListener('pointerdown',e=>{if(!active||visibleLibrary)return;drag={x:e.clientX,y:e.clientY};R.domElement.setPointerCapture?.(e.pointerId);});R.domElement.addEventListener('pointermove',e=>{if(!drag||!active||visibleLibrary)return;yaw=clamp(yaw-(e.clientX-drag.x)*.005,-Math.PI,Math.PI);pitch=clamp(pitch-(e.clientY-drag.y)*.004,-.9,.9);drag={x:e.clientX,y:e.clientY};});for(let ev of ['pointerup','pointercancel','lostpointercapture'])R.domElement.addEventListener(ev,()=>drag=null);
  const api={version:'2.0.0',get active(){return active;},get libraryOpen(){return visibleLibrary;},open,close:closeLibrary,exit,frame,recipes,load,enter:(id,override)=>load().then(()=>{let r=[...db.clips,...db.worlds].find(x=>x.id===id);if(!r)throw Error('Unknown source '+id);let k=override||r.recipe||r.template||'highland';enterRecipe(k,r,!r.recipe||r.recipe!==k);}),enterRecipe:(k)=>enterRecipe(k,sourceFor(k)),observe:()=>({active,source:currentSource?.id,recipe:Object.keys(recipes).find(k=>recipes[k]===currentRecipe),position:world?.position?.toArray(),time,camera:cameraMode,autoplay,recording,entities:world?{people:world.people.length+1,bees:world.bees.length,rooms:world.rooms.map(x=>x.name)}:null}),action:fire,log:()=>log.slice(),hold:(key,ms=500)=>{if(!navKeys.has(key)||!active)return;keys.add(key);setTimeout(()=>keys.delete(key),clamp(ms,0,5000));},setCamera:(name)=>{if(cameraModes.includes(name)){cameraMode=name;yaw=pitch=0;logEvent('camera',{mode:name});}}};
  return api;
});
