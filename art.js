/* Original pixel art for the playable Silence study, 2026-11-06.
   No downloaded artwork or pre-rendered film. All animations are baked whole-body sprites.
   The renderer reads game state only. Native coordinates: 480 x 270. */
export const ART_VERSION = 'anjing-room-1.1.0';
const W=480,H=270, FOOT=216, FRAME_W=40, FRAME_H=58;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const R=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const poly=(g,p,c)=>{g.fillStyle=c;g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
const line=(g,p,c,width=1)=>{g.strokeStyle=c;g.lineWidth=width;g.lineJoin='miter';g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x+.5,y+.5):g.moveTo(x+.5,y+.5));g.stroke();};
// Tiny deterministic hash. Texture is baked exactly once, never randomised per frame.
const noise=(x,y,s=1)=>{let n=Math.imul(x+997*s,374761393)^Math.imul(y+91,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const P={ink:'#1d2634',floor:'#60514e',wall:'#6b6063',blue:'#34495d',wood:'#563f39',warm:'#d4ae76',skin:'#e2b28c',skinShade:'#af7e6e',jacket:'#35495b',jacketLight:'#52677a',jacketDark:'#243547',shirt:'#c9c8b8',pants:'#29323f',shoe:'#171f2d',hair:'#242833',hairLight:'#41434a'};
let layers, sprites;

function wall(g){
 R(g,0,0,W,188,'#5b555f');
 for(let y=0;y<188;y+=16)R(g,0,y,W,16,['#625a63','#675e65','#6c6166','#706368','#75666a','#79696b','#7b6b6c','#796b6a','#76696a','#716568','#6b6065','#625b62'][Math.floor(y/16)]);
 for(let y=8;y<186;y+=3)for(let x=0;x<W;x+=4)if(noise(x,y)<.12)R(g,x,y,1,1,'#807174');
 R(g,0,1,W,8,'#302f3c');R(g,0,9,W,3,'#958380');R(g,0,12,W,3,'#4d4652');R(g,0,15,W,2,'#827276');
 // Scuffed skirting and vertical room edges.
 R(g,0,177,W,3,'#a18b80');R(g,0,180,W,12,'#443e48');R(g,0,182,W,2,'#63535a');R(g,0,191,W,2,'#242b36');
 R(g,0,17,13,163,'#4c4655');R(g,13,17,3,163,'#8a7577');
 R(g,462,17,18,163,'#484450');R(g,460,17,2,163,'#877374');
 // Fixed dado seams and worn marks, not frame noise.
 for(let x=28;x<460;x+=46){R(g,x,151,1,25,'#645862');R(g,x+2,152,1,24,'#8a7372');}
}
function cityWindow(g){
 // Deep inset. Three large panes provide a quiet dark field behind the lamp.
 R(g,239,28,199,148,'#3d3541');R(g,243,30,192,143,'#a18c80');R(g,247,34,184,135,'#2c3448');
 R(g,252,38,174,125,'#28425b');
 for(let y=40;y<164;y+=10)R(g,252,y,174,10,['#263c55','#29435e','#2b4964','#32506a','#385872','#41617b','#48667d','#4c6d80','#557487','#5e7d8c','#698593','#728e99','#78949c'][Math.floor((y-40)/10)]);
 // Muted moon, crisp pixel staircase.
 poly(g,[[393,46],[400,46],[400,49],[404,49],[404,57],[401,57],[401,61],[393,61],[393,58],[390,58],[390,49],[393,49]],'#b4bbac');
 R(g,398,47,3,3,'#d3d1b4');R(g,391,53,3,5,'#9aa9a5');
 [[266,57],[282,47],[302,63],[324,50],[375,72],[417,68],[350,45],[284,78]].forEach(([x,y])=>R(g,x,y,1,1,'#9aafba'));
 // Distant river/skyline. No image sampled or cloned.
 for(let i=0;i<18;i++){let x=252+i*10,h=10+Math.floor(noise(i,3)*31);R(g,x,124-h,9,h,'#3e596e');R(g,x+2,122-h,3,2,'#49667b');}
 R(g,252,126,174,37,'#466776');
 for(let i=0;i<13;i++){let x=254+i*14,h=15+Math.floor(noise(i,9)*35);R(g,x,143-h,12,h,'#304c61');R(g,x,142-h,12,1,'#77909a');for(let a=0;a<2;a++)for(let b=0;b<4;b++)if(noise(i,a*10+b)<.48)R(g,x+3+a*5,147-h+b*7,2,3,b%2?'#8e9c97':'#b0a483');}
 R(g,252,146,174,17,'#527381');
 for(let i=0;i<24;i++)R(g,254+Math.floor(noise(i,52)*168),148+Math.floor(noise(i,63)*13),2+Math.floor(noise(i,1)*7),1,i%3?'#6c8a93':'#aba68a');
 // Glass reflections are sparse diagonal pixel staircases.
 for(let j=0;j<15;j++){R(g,261+j*3,49+j*5,2,3,'#526a7a');R(g,336+j*3,47+j*5,1,3,'#52697b');}
 R(g,247,35,6,134,'#4e4651');R(g,252,35,2,134,'#8f7f77');R(g,308,35,7,134,'#4c4651');R(g,310,35,2,134,'#a38e7c');R(g,366,35,7,134,'#4c4651');R(g,368,35,2,134,'#a38e7c');R(g,425,35,6,134,'#4c4651');
 R(g,250,106,179,6,'#49434c');R(g,251,107,177,2,'#9a8779');
 R(g,243,166,193,5,'#b09a83');R(g,240,171,198,5,'#51454d');R(g,247,176,185,3,'#8e776e');
 // Tied velvet curtains, static graceful folds.
 poly(g,[[231,28],[251,28],[253,63],[250,106],[242,131],[247,163],[237,173],[230,171]],'#4a4d5c');
 poly(g,[[233,30],[239,30],[241,102],[236,134],[241,168],[235,170]],'#66606b');
 line(g,[[247,31],[246,90],[239,132],[244,164]],'#79717a',2);R(g,233,126,12,4,'#b29575');
 poly(g,[[428,28],[446,28],[448,171],[437,174],[433,161],[438,130],[429,100]],'#4d4d5c');
 poly(g,[[439,31],[443,31],[445,164],[441,167],[438,130],[435,104]],'#6b6570');R(g,434,126,12,4,'#b29575');
 R(g,226,24,224,3,'#322f3b');R(g,228,22,220,2,'#aa8d74');
}
function floor(g){
 R(g,0,193,W,77,'#594b4d');
 for(let row=0;row<7;row++){
 const y=193+row*11;R(g,0,y,W,10,['#6d5a54','#735c52','#755e53','#705950','#66524c','#604e4c','#57494a'][row]);
 R(g,0,y,480,1,'#3d3a41');R(g,0,y+1,480,1,'#8a6c59');
 for(let x=(row%2)*39-20;x<480;x+=79){R(g,x,y,1,11,'#3e3940');R(g,x+2,y+4,42,1,'#806350');R(g,x+16,y+7,25,1,'#5f4b46');for(let j=0;j<3;j++)if(noise(x,j+row)<.6)R(g,x+8+j*16,y+8,4,1,'#947058');}
 }
 // Long window light crossing the floor, following an actual projection.
 poly(g,[[250,193],[426,193],[463,239],[211,239]],'#777370');
 poly(g,[[255,195],[307,195],[294,229],[225,229]],'#8c8b7f');
 poly(g,[[316,195],[366,195],[375,229],[307,229]],'#8a8b80');
 poly(g,[[376,195],[422,195],[451,229],[389,229]],'#85867e');
 for(let y=198;y<234;y+=11)R(g,216,y,244,1,'#625d5c');
 // Rug underneath the piano and long stool.
 poly(g,[[78,195],[217,195],[235,225],[60,225]],'#3d4854');
 poly(g,[[82,198],[215,198],[229,222],[66,222]],'#8a736b');
 poly(g,[[87,200],[211,200],[224,220],[72,220]],'#55515b');
 for(let x=83;x<216;x+=13){R(g,x,203,5,1,'#958073');R(g,x-3,216,5,1,'#958073');}
 line(g,[[84,206],[108,215],[130,206],[153,215],[176,206],[199,215],[217,209]],'#6d6970');
 for(let x=66;x<234;x+=4)R(g,x,225,1,3,'#8c776b');
}
function shelves(g){
 // Wall-mounted records and framed miniature still lifes.
 R(g,29,46,39,49,'#3e3541');R(g,31,48,35,45,'#b19679');R(g,34,51,29,39,'#413f4d');
 R(g,39,56,18,25,'#817370');R(g,41,58,14,20,'#b69a7d');poly(g,[[42,75],[47,65],[51,69],[55,61],[55,77]],'#58676c');R(g,40,82,17,2,'#a28c79');
 R(g,83,38,112,5,'#3d3541');R(g,82,35,114,3,'#a68c74');
 const cols=['#394e60','#a58b73','#755b60','#8d8c83','#506570','#9b735d'];
 for(let i=0;i<12;i++){const x=88+i*7,h=17+Math.floor(noise(i,7)*11);R(g,x,35-h,5,h,cols[i%6]);R(g,x+1,36-h,1,h-3,'#b5a58e');R(g,x+1,30,3,1,'#373642');}
 R(g,180,20,9,15,'#3c424b');R(g,182,22,5,8,'#b39b7a');
 // Small record cabinet at room left.
 R(g,24,143,43,51,'#3d3842');R(g,26,146,39,45,'#604b46');R(g,27,148,37,2,'#9b785c');
 R(g,29,154,33,15,'#292c37');for(let i=0;i<12;i++){R(g,30+i*2,156,1,12,cols[i%6]);}
 R(g,29,173,33,14,'#75584b');R(g,42,177,8,2,'#b69a72');R(g,27,194,3,7,'#292c37');R(g,61,194,3,7,'#292c37');
 // Turntable, no brand/text.
 R(g,25,136,41,8,'#9a7962');R(g,28,137,35,4,'#3a3b46');R(g,32,136,18,5,'#242c38');R(g,37,137,8,3,'#69737a');R(g,40,138,2,1,'#d7b681');line(g,[[60,135],[56,136],[50,139]],'#b8aa8d');
}
function piano(g){
 // Full upright piano, with carved feet and a real keyboard ledge.
 R(g,81,119,126,71,'#2a2d37');R(g,84,122,120,63,'#51423f');R(g,86,123,116,2,'#9b7555');
 R(g,89,129,110,26,'#342e35');R(g,92,132,104,19,'#674d3f');R(g,95,134,98,2,'#85664d');
 R(g,92,150,104,1,'#ab855b');R(g,136,140,15,1,'#bd976a');R(g,139,142,9,1,'#87694e');
 R(g,79,117,130,4,'#a17c5b');R(g,82,115,124,2,'#5a4540');R(g,82,119,124,2,'#2b2c36');
 // A small score with abstract marks, never fabricated text.
 R(g,125,102,36,16,'#3c343b');poly(g,[[126,103],[142,106],[143,118],[126,115]],'#c5b79a');poly(g,[[144,106],[159,102],[159,115],[144,118]],'#e0cdab');
 for(let y=108;y<115;y+=3){R(g,130,y,10,1,'#8c8478');R(g,147,y-1,9,1,'#9d907a');}R(g,141,106,2,12,'#ad9f89');
 // Piano top still life: photo without face and a single ceramic cup.
 R(g,89,100,15,17,'#342e34');R(g,91,102,11,13,'#a28a71');R(g,93,104,7,9,'#667476');R(g,96,106,2,4,'#c1b091');
 R(g,182,109,11,7,'#b4c0b3');R(g,183,109,9,1,'#d6d8bd');R(g,192,110,3,4,'#7f9991');R(g,193,111,1,2,'#534740');
 R(g,82,155,124,5,'#aa825b');R(g,80,160,128,8,'#242833');R(g,83,160,122,6,'#d2c7a7');
 for(let x=84;x<204;x+=4){R(g,x,161,1,5,'#827c74');}
 for(let k=0;k<30;k++){if(![2,6].includes(k%7))R(g,85+k*4,160,2,4,'#252b37');}
 R(g,79,168,130,4,'#71523f');R(g,80,172,128,3,'#a07b54');
 R(g,86,175,7,23,'#342d34');R(g,88,176,2,21,'#89664c');R(g,195,175,7,23,'#342d34');R(g,196,176,2,21,'#89664c');
 R(g,96,178,95,17,'#473b3a');R(g,100,179,86,2,'#614a40');R(g,136,194,22,3,'#272b34');R(g,140,195,3,5,'#b69b67');R(g,151,195,3,5,'#b69b67');
 R(g,83,198,13,3,'#242a34');R(g,193,198,11,3,'#242a34');
}
function bench(g){
 R(g,148,202,60,5,'#282c36');R(g,150,200,56,3,'#826152');R(g,153,199,50,2,'#a17c65');R(g,151,206,4,10,'#302b34');R(g,202,206,4,10,'#302b34');R(g,155,208,47,2,'#5b443e');
 R(g,151,214,7,2,'#252b35');R(g,200,214,7,2,'#252b35');
 // The right half is deliberately and visibly empty.
 R(g,185,201,12,1,'#b08d72');
}
function cello(g){
 // Sleeping cello in the corner. Fixed peg and neck; no individually wobbling parts.
 R(g,222,133,3,56,'#322d35');R(g,222,132,4,4,'#ad7f57');R(g,219,135,8,2,'#6d483c');
 poly(g,[[219,151],[226,151],[230,157],[229,163],[226,167],[230,170],[231,180],[227,188],[219,189],[213,182],[214,171],[217,166],[213,161],[215,155]],'#322e36');
 poly(g,[[219,153],[225,153],[228,158],[226,163],[222,167],[227,172],[228,180],[225,185],[219,186],[216,181],[217,172],[220,166],[216,160]],'#956647');
 poly(g,[[220,154],[223,154],[225,159],[222,165],[220,170],[220,184],[218,181],[219,170],[221,164],[218,160]],'#bd8959');
 R(g,222,137,2,43,'#443338');R(g,222,179,2,6,'#c2aa75');R(g,220,175,7,1,'#c9b18a');R(g,221,187,2,12,'#b4a28a');R(g,219,199,7,2,'#252d38');
 R(g,216,174,1,5,'#3b3036');R(g,227,174,1,5,'#3b3036');line(g,[[233,144],[234,191]],'#c6b08b');
}
function lamp(g,on){
 // Switch is reachable from player anchor x360, y216.
 R(g,365,163,3,46,'#3a333a');R(g,366,162,1,45,on?'#b69b6e':'#79716c');
 R(g,357,209,18,3,'#282d38');R(g,361,207,10,2,'#77614f');
 poly(g,[[354,143],[378,143],[386,164],[346,164]],'#302f3a');
 poly(g,[[355,142],[377,142],[384,162],[348,162]],on?'#dec08a':'#8b8178');
 poly(g,[[355,143],[360,143],[356,161],[349,161]],on?'#ae8b69':'#716a68');
 poly(g,[[363,143],[368,143],[371,161],[359,161]],on?'#f3d9a0':'#a09a86');
 R(g,347,162,38,2,on?'#f1d79c':'#a09882');R(g,355,140,23,2,on?'#c7a77a':'#84766c');
 R(g,367,171,1,13,'#b29670');R(g,366,183,3,3,on?'#eed6a5':'#b7a588');
}
function plant(g,x,y){
 line(g,[[x,y],[x-1,y-19],[x-7,y-32]],'#3b5353',2);line(g,[[x-1,y-9],[x+9,y-26]],'#3b5353',2);line(g,[[x,y-3],[x+15,y-13]],'#3b5353',2);
 const leaves=[[x-13,y-33,11,5],[x-9,y-28,13,6],[x+4,y-27,13,5],[x+8,y-21,10,5],[x-13,y-17,13,5],[x+9,y-14,13,5],[x-5,y-23,8,4]];
 leaves.forEach(([a,b,w,h],i)=>{poly(g,[[a,b+2],[a+3,b],[a+w-2,b],[a+w,b+2],[a+w-3,b+h],[a+2,b+h-1]],i%2?'#687b70':'#4b645e');R(g,a+3,b+2,w-5,1,'#84907b');});
 R(g,x-10,y,21,4,'#a58267');poly(g,[[x-9,y+4],[x+10,y+4],[x+7,y+20],[x-6,y+20]],'#7d5e50');R(g,x-6,y+5,3,13,'#b08768');R(g,x-8,y+20,17,2,'#34343d');
}
function details(g){
 plant(g,414,183);
 // Quiet radiator below the window and desk not in the walking plane.
 R(g,272,179,55,20,'#504b51');for(let x=275;x<325;x+=6){R(g,x,180,4,18,'#9a9180');R(g,x,181,1,16,'#b5aa91');R(g,x+3,181,1,16,'#665e5c');}
 R(g,270,180,3,3,'#bdab8c');R(g,273,199,4,4,'#3c3b44');R(g,322,199,4,4,'#3c3b44');
 // Book and folded shawl on the sill, a remnant rather than a scripted clue.
 R(g,279,160,22,5,'#9e7761');R(g,280,161,20,2,'#d1b993');R(g,285,157,21,3,'#526674');R(g,286,158,19,1,'#b4b7a1');
 R(g,381,158,24,8,'#8d817c');for(let x=384;x<403;x+=4)R(g,x,159,1,7,'#b7a28b');R(g,399,166,5,9,'#8d817c');
 // Dark near corners, adding depth without masking walking feet.
 R(g,0,229,17,41,'#222d39');R(g,3,224,10,7,'#39434b');poly(g,[[0,218],[8,204],[13,220],[18,231],[0,232]],'#3c5153');
 R(g,459,232,21,38,'#29313c');R(g,464,227,16,6,'#4e484e');
}
function light(g,on){
 // Pixel-dithered soft pool. Painted with cells, not a blurred digital gradient.
 if(on){
  g.save();g.globalCompositeOperation='screen';
  for(let y=30;y<239;y+=2)for(let x=285;x<449;x+=2){const d=Math.hypot((x-367)/1.05,(y-163)/1.3);let a=clamp((96-d)/96,0,1)*.18;if(a>0){g.globalAlpha=a;R(g,x,y,2,2,noise(x,y,8)<.5?'#b88950':'#d4a96b');}}
  g.globalAlpha=.15;poly(g,[[350,165],[384,165],[412,222],[321,222]],'#d6a56b');g.restore();
 }else{
  g.save();g.globalAlpha=.16;R(g,0,17,W,227,'#183046');g.restore();
 }
 // Bottom is intentionally calm for the film caption layer.
 for(let y=239;y<270;y++) {g.save();g.globalAlpha=(y-239)/31*.45;R(g,0,y,W,1,'#111e2c');g.restore();}
}
function buildBackground(on){const c=make(W,H),g=c.getContext('2d');g.imageSmoothingEnabled=false;wall(g);cityWindow(g);floor(g);shelves(g);piano(g);cello(g);details(g);lamp(g,on);light(g,on);return c;}

// Whole-body frames. The same pixel head and costume are redrawn into each atlas cell.
function bodyFrame(g,kind,index){
 const sit=kind==='sitting'?1:kind==='sitDown'?index/3:kind==='standUp'?1-index/3:0;
 const walking=kind==='walk',phase=walking?index*Math.PI/4:0;
 const lift=walking&&[1,2,5,6].includes(index)?-1:0;
 const dy=Math.round(sit*6)+lift;
 const hx=14,hy=7+dy;
 const switcher=kind==='switch'?Math.min(1,index/2):0;
 // Shadow is not baked here: sprite remains reusable on transparent background.
 // Far arm behind torso.
 poly(g,[[16,22+dy],[13,24+dy],[12+(walking?Math.round(Math.sin(phase)*3):0),36+dy],[16,37+dy],[18,26+dy]],P.jacketDark);
 // Legs. Walk positions come from foot-strike poses, using the same waist/volume.
 if(sit>.5){
  poly(g,[[17,36+dy],[29,36+dy],[31,40+dy],[29,42+dy],[23,42+dy],[23,51],[19,51],[18,42+dy],[16,41+dy]],P.pants);
  R(g,18,50,5,4,P.shoe);R(g,20,53,7,2,P.shoe);R(g,19,53,7,1,'#707678');
  poly(g,[[22,36+dy],[33,36+dy],[34,40+dy],[31,43+dy],[28,50],[24,50],[26,41+dy],[22,41+dy]],'#364251');
  R(g,24,50,5,4,P.shoe);R(g,26,53,8,2,P.shoe);R(g,27,53,6,1,'#84867f');
 }else if(walking){
  const dx=Math.round(Math.sin(phase)*6),up=Math.round(Math.max(0,Math.cos(phase))*3),up2=Math.round(Math.max(0,-Math.cos(phase))*3);
  poly(g,[[17,35+dy],[21,35+dy],[21+dx,43],[20+dx,51-up],[16+dx,51-up],[16+dx,44],[16,39+dy]],'#222d3c');
  R(g,15+dx,51-up,6,3,P.shoe);R(g,18+dx,53-up,5,2,P.shoe);R(g,18+dx,53-up,5,1,'#5a6471');
  poly(g,[[22,35+dy],[26,35+dy],[26-dx,43],[25-dx,51-up2],[21-dx,51-up2],[22-dx,44],[21,39+dy]],'#3a4554');
  R(g,20-dx,51-up2,6,3,P.shoe);R(g,23-dx,53-up2,6,2,P.shoe);R(g,23-dx,53-up2,5,1,'#7d817e');
 }else{
  R(g,17,35+dy,5,17-dy,P.pants);R(g,23,35+dy,5,17-dy,'#394350');R(g,19,38+dy,1,12-dy,'#495461');R(g,25,39+dy,1,12-dy,'#58606a');
  R(g,16,51,6,4,P.shoe);R(g,18,53,7,2,P.shoe);R(g,23,51,6,4,P.shoe);R(g,25,53,7,2,P.shoe);R(g,26,53,5,1,'#787d7b');
 }
 // Jacket silhouette, rounded shoulders, open light shirt.
 poly(g,[[17,21+dy],[24,21+dy],[28,25+dy],[28,37+dy],[24,39+dy],[16,38+dy],[14,34+dy],[14,25+dy]],P.jacket);
 R(g,16,24+dy,3,12,P.jacketLight);R(g,15,27+dy,1,9,'#627485');
 poly(g,[[21,22+dy],[25,23+dy],[24,35+dy],[20,35+dy]],P.shirt);
 poly(g,[[19,22+dy],[22,22+dy],[20,28+dy],[18,25+dy]],'#697a85');
 R(g,25,27+dy,2,9,P.jacketDark);R(g,16,37+dy,10,2,P.jacketDark);R(g,17,34+dy,3,1,'#879096');
 // Neck and face, never independently scaled or rotated.
 R(g,20,19+dy,5,5,P.skinShade);R(g,22,19+dy,3,4,P.skin);
 poly(g,[[hx+2,hy+2],[hx+11,hy+2],[hx+13,hy+5],[hx+13,hy+9],[hx+15,hy+10],[hx+13,hy+11],[hx+13,hy+14],[hx+10,hy+16],[hx+4,hy+15],[hx+1,hy+10]],P.skinShade);
 poly(g,[[hx+5,hy+3],[hx+11,hy+3],[hx+12,hy+6],[hx+12,hy+10],[hx+14,hy+10],[hx+12,hy+12],[hx+12,hy+14],[hx+9,hy+15],[hx+5,hy+13]],P.skin);
 R(g,hx+5,hy+9,2,4,'#efc49c');R(g,hx+12,hy+10,2,1,'#efc49c');
 // Nose, visible eye, single quiet eyebrow. No cheek dot that reads as beard.
 R(g,hx+10,hy+7,3,1,'#5b4546');R(g,hx+11,hy+9,1,2,'#30313b');R(g,hx+10,hy+9,1,1,'#f1d5ad');R(g,hx+11,hy+13,2,1,'#93685c');
 // Distinct fringe and crown retain the same silhouette in every frame.
 poly(g,[[hx-1,hy+4],[hx+1,hy],[hx+5,hy-2],[hx+11,hy-1],[hx+13,hy+1],[hx+13,hy+4],[hx+10,hy+5],[hx+7,hy+4],[hx+5,hy+9],[hx+3,hy+8],[hx+3,hy+12],[hx,hy+10]],P.hair);
 R(g,hx+2,hy+1,6,2,P.hairLight);R(g,hx+8,hy+1,3,1,'#575251');R(g,hx,hy+5,2,5,'#353943');R(g,hx+4,hy+9,2,3,P.skin);
 // Near arm; complete connected paths baked into the frame.
 if(sit>.5){
  poly(g,[[25,25+dy],[29,27+dy],[29,33+dy],[34,35+dy],[33,38+dy],[25,35+dy],[24,31+dy]],P.jacketLight);R(g,31,35+dy,5,3,P.skin);R(g,35,36+dy,2,2,P.skinShade);
 }else if(switcher>0){
  const ty=Math.round(34-switcher*10);
  poly(g,[[25,24+dy],[29,26+dy],[31,32],[30,35],[27,34],[25,ty+2],[28,ty],[29,31],[27,29]],P.jacketLight);
  R(g,25,ty-2,4,4,P.skin);R(g,26,ty-3,2,2,P.skin);R(g,28,ty-1,1,2,P.skinShade);
 }else{
  const swing=walking?Math.round(-Math.sin(phase)*4):0;
  poly(g,[[25,24+dy],[29,26+dy],[29+swing,34+dy],[28+swing,38+dy],[24+swing,37+dy],[25+swing,32+dy]],P.jacketLight);
  R(g,24+swing,36+dy,4,5,P.skin);R(g,24+swing,39+dy,1,2,P.skinShade);R(g,26+swing,40+dy,2,1,'#edc39b');
 }
}
function buildSprites(){
 const atlas=make(FRAME_W*8,FRAME_H*6),g=atlas.getContext('2d');g.imageSmoothingEnabled=false;
 const names=['idle','walk','sitDown','standUp','sitting','switch'];
 for(let row=0;row<6;row++)for(let frame=0;frame<8;frame++){g.save();g.translate(frame*FRAME_W,row*FRAME_H);bodyFrame(g,names[row],['sitDown','standUp','switch'].includes(names[row])?Math.min(frame,3):frame);g.restore();}
 return {atlas,names};
}
function init(){if(!layers)layers={on:buildBackground(true),off:buildBackground(false)};if(!sprites)sprites=buildSprites();}
function actor(g,p){
 const action=p.action||'idle';const row=Math.max(0,sprites.names.indexOf(action));let f=0;
 if(action==='walk')f=Math.floor(Math.abs(p.walkDistance||0)/4)%8;
 if(['sitDown','standUp','switch'].includes(action))f=clamp(Math.floor((p.actionProgress||0)*4),0,3);
 const x=Math.round(p.x??172),dir=p.dir<0?-1:1;
 // A flat pixel shadow grounds the body in both lighting states.
 R(g,x-10,FOOT-1,21,2,'#343640');R(g,x-7,FOOT-2,15,1,'#42424a');
 g.save();g.translate(x,FOOT-55);g.scale(dir,1);g.drawImage(sprites.atlas,f*FRAME_W,row*FRAME_H,FRAME_W,FRAME_H,-20,0,FRAME_W,FRAME_H);g.restore();
}
let world;
export function drawScene(ctx,state={}){
 init();if(!world)world=make(W,H);const g=world.getContext('2d');g.imageSmoothingEnabled=false;
 g.clearRect(0,0,W,H);g.drawImage(state.lampOn===false?layers.off:layers.on,0,0);bench(g);
 const p=state.player||{x:172,dir:1,action:'idle',walkDistance:0};actor(g,p);
 // Dust slowly drifts in the pool of light. Never controls a character or prop.
 if(state.lampOn!==false){const t=(state.tick||0)/60;for(let i=0;i<10;i++){const x=333+((i*23+t*(.6+i*.04))%71),y=156+((i*13+t*.45)%57);if((i+Math.floor(t/3))%3!==0)R(g,x,y,1,1,i%2?'#b7a88b':'#c5b492');}}
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
 const scaleX=ctx.canvas.width/W,scaleY=ctx.canvas.height/H;ctx.scale(scaleX,scaleY);
 if(state.camera==='close'){
  const z=1.5,sw=W/z,sh=H/z;const cx=clamp((p.x??172)-sw*.49,0,W-sw),cy=83;
  ctx.drawImage(world,Math.round(cx),cy,sw,sh,0,0,W,H);
 }else ctx.drawImage(world,0,0);
 ctx.restore();
}
export function drawModelSheet(ctx){
 init();const g=ctx;const s=2;g.imageSmoothingEnabled=false;R(g,0,0,g.canvas.width,g.canvas.height,'#202d3b');
 g.fillStyle='#dbc49c';g.font='18px monospace';g.fillText('SILENCE / CHARACTER & ACTIONS',24,30);
 sprites.names.forEach((name,row)=>{g.fillStyle='#9faeb6';g.font='13px monospace';g.fillText(name.toUpperCase(),24,66+row*123);for(let f=0;f<8;f++){const x=130+f*83,y=40+row*123;R(g,x-3,y+112,77,1,'#54606a');g.drawImage(sprites.atlas,f*FRAME_W,row*FRAME_H,FRAME_W,FRAME_H,x,y,FRAME_W*s,FRAME_H*s);}});
 g.fillStyle='#9faeb6';g.font='13px monospace';g.fillText('LEFT / RIGHT',24,804);
 for(let f=0;f<8;f++){const row=[0,0,1,1,4,4,5,5][f],frame=f<4?2:3,x=130+f*83,y=782;g.save();g.translate(x+(f%2===0?80:0),y);g.scale(f%2===0?-2:2,2);g.drawImage(sprites.atlas,frame*FRAME_W,row*FRAME_H,FRAME_W,FRAME_H,0,0,FRAME_W,FRAME_H);g.restore();}
 const y=926;Object.values(P).forEach((c,i)=>R(g,24+i*42,y,34,22,c));g.fillStyle='#a8b2b9';g.font='12px monospace';g.fillText('Original pixels · 40×58 frame · feet (20,55) · 32px walk cycle',24,971);g.fillText('Left/right supported. No back-facing action is claimed.',24,994);
}
export function exportAssets(){
 init();const stool=make(W,H);bench(stool.getContext('2d'));
 const lampOn=make(43,75),lampOff=make(43,75);
 for(const [c,on] of [[lampOn,true],[lampOff,false]]){const g=c.getContext('2d');g.translate(-345,-139);lamp(g,on);}
 const metadata={version:ART_VERSION,nativeSize:[W,H],frameSize:[FRAME_W,FRAME_H],cellSize:[FRAME_W,FRAME_H],columns:8,rows:sprites.names,anchor:[20,55],rig:'silence-fullbody-40x58',stridePixels:32,
  actions:{idle:{row:0,frames:[0]},walk:{row:1,frames:[0,1,2,3,4,5,6,7],stridePixels:32},sitDown:{row:2,frames:[0,1,2,3],duration:.6},standUp:{row:3,frames:[0,1,2,3],duration:.6},sitting:{row:4,frames:[0]},switch:{row:5,frames:[0,1,2,3],duration:.6,contactRange:[.5,1],contactWorld:[367,184],contactPlayerX:360}},
  bench:{worldBounds:[148,199,60,17],seatTop:202,playerX:172,playerDir:-1},lamp:{worldOrigin:[345,139],size:[43,75],anchor:[22,73]},
  origin:'Original procedural pixel artwork, created for this experiment; no external artwork.'};
 return {roomLightOn:layers.on,roomLightOff:layers.off,characterAtlas:sprites.atlas,bench:stool,lampOn,lampOff,metadata};
}
