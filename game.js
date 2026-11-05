import {drawScene, ART_VERSION} from './art.js';

const VERSION = 'anjing-room-1.0.3';
const LOG_SCHEMA = 'song-game-mv-input/v1';
const FPS = 60;
const SEED = 261106;
const $ = id => document.getElementById(id);
const canvas = $('game');
const output = canvas.getContext('2d', {alpha:false});
const world = document.createElement('canvas');
world.width = 480; world.height = 270;
const graphics = world.getContext('2d', {alpha:false});
const supportedKeys = new Set(['ArrowLeft','ArrowRight','KeyA','KeyD','KeyE','Space','KeyC']);
const keys = new Set();
const interactive = ['sitDown','standUp','switch'];
let state = initialState();
let phase = 'explore';
let audioContext, audioBuffer, audioHash = '', audioName = '', audioSource;
let gainNode, audioDestination, captureStream, recorder, captureKeepAlive;
let audioStart = 0, recordWallStart = 0, currentTake = null;
let lastTake = null, importedTake = null, replayTake = null, replayIndex = 0;
let chunks = [], videoURL = '', logURL = '', lastBlob = null;
let finalized = false, loadingSequence = 0, wakeLock = null, finishTimer;
let lastFrame = 0, previewAccumulator = 0, recordingError = null;
let activeAnimation = null;
const errors = [];

function initialState() {
  return {tick:0, elapsed:0, player:{x:238,dir:-1,action:'idle',actionProgress:0,walkDistance:0},lampOn:true,camera:'wide'};
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function clamp(v,a,b) { return Math.max(a, Math.min(b,v)); }
function busy() { return ['preparing','recording','finalizing'].includes(phase); }
function message(text, error=false) {
  const target = $('status');
  target.replaceChildren();
  const dot = document.createElement('span'); dot.className='status-dot';
  target.append(dot, document.createTextNode(text));
  target.classList.toggle('error',error);
}
function timeText(seconds) {
  const t = Math.max(0, Number(seconds)||0);
  return `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`;
}
function getBounds() {
  if(!audioBuffer) throw new Error('先载入一段音乐，再开始录制。');
  const start = Number($('clip-start').value), end = Number($('clip-end').value);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>audioBuffer.duration+0.011||end-start<0.1) {
    throw new Error('请设置有效的片段范围：结束应晚于开始，且不超过音频长度。');
  }
  return {start, end:Math.min(end,audioBuffer.duration), duration:Math.min(end,audioBuffer.duration)-start};
}
function updateControls() {
  const locked = busy();
  $('audio-file').disabled = locked;
  $('clip-start').disabled = locked||!audioBuffer;
  $('clip-end').disabled = locked||!audioBuffer;
  $('start-recording').disabled = locked||!audioBuffer;
  $('start-recording').hidden = phase==='recording'||phase==='finalizing';
  $('stop-recording').hidden = phase!=='recording';
  $('record-again').disabled = locked||!audioBuffer;
  $('replay-take').disabled = locked||!lastTake||!audioBuffer;
  $('replay-file').disabled = locked;
  $('run-imported-replay').disabled = locked||!importedTake||!audioBuffer;
  $('audio-label').style.opacity = locked?'.4':'1';
  $('status').parentElement.classList.toggle('is-recording',phase==='recording');
}
function updateClipText() {
  try {
    const bounds=getBounds();
    $('clip-summary').textContent=`${timeText(bounds.start)} — ${timeText(bounds.end)} · ${bounds.duration.toFixed(1)} 秒`;
    $('clip-note').textContent='录制将随这段音乐结束。';
    $('clip-note').classList.remove('error');
  } catch(e) {
    $('clip-note').textContent=e.message;
    $('clip-note').classList.add('error');
  }
}
function ensureAudioContext() {
  if(!audioContext) {
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx) throw new Error('这个浏览器暂不支持音频播放与录制，请使用新版 Chrome、Edge 或 Safari。');
    audioContext=new AudioCtx();
  }
  return audioContext;
}
async function digest(bytes) {
  if(!crypto.subtle) throw new Error('请使用 HTTPS 或本机 localhost 打开，以便安全记录音频身份。');
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function loadAudio(bytes,name) {
  const sequence=++loadingSequence;
  message('正在读取音乐…');
  const context=ensureAudioContext();
  const [buffer,hash]=await Promise.all([context.decodeAudioData(bytes.slice(0)),digest(bytes)]);
  if(sequence!==loadingSequence) return;
  if(!buffer.length||!Number.isFinite(buffer.duration)||buffer.duration<0.1) throw new Error('这段音频太短，无法开始录制。');
  audioBuffer=buffer; audioHash=hash; audioName=name;
  $('track-name').textContent=name;
  $('track-details').textContent=`${timeText(buffer.duration)} · ${buffer.sampleRate/1000} kHz · 仅在本机播放与录制`;
  $('clip-start').value='0';
  $('clip-start').max=String(buffer.duration);
  $('clip-end').value=String(Math.floor(buffer.duration*1000)/1000);
  $('clip-end').max=String(buffer.duration);
  updateClipText(); updateControls();
  message('音乐已就绪 · 开始后，音乐与录像会一起运行');
}
function action(kind,targetX=state.player.x) {
  activeAnimation={kind,fromX:state.player.x,targetX,ticks:0,duration:kind==='switch'?36:36,toggled:false};
  state.player.action=kind; state.player.actionProgress=0;
}
function interact() {
  if(interactive.includes(state.player.action)) return;
  if(state.player.action==='sitting') { action('standUp'); return; }
  if(Math.abs(state.player.x-172)<=20) {
    state.player.dir=-1; action('sitDown',172);
  } else if(Math.abs(state.player.x-360)<=20) {
    state.player.dir=1; action('switch',360);
  }
}
function applyInput(code,down) {
  if(keys.has(code)===down) return;
  if(down) {
    keys.add(code);
    if(code==='KeyE'||code==='Space') interact();
    if(code==='KeyC') state.camera=state.camera==='wide'?'close':'wide';
  } else keys.delete(code);
}
function input(code,down,origin='keyboard') {
  if(!supportedKeys.has(code)) return;
  if(['preparing','finalizing','review'].includes(phase)) return;
  if(phase==='recording'&&replayTake) return;
  if(phase==='recording') advanceToAudio();
  if(keys.has(code)===down) return;
  if(phase==='recording'&&currentTake) {
    currentTake.inputs.push({tick:state.tick,code,down,source:origin,audioTime:Math.max(0,audioContext.currentTime-audioStart)});
  }
  applyInput(code,down);
}
function releaseAll(origin='blur') {
  for(const key of [...keys]) input(key,false,origin);
}
function step() {
  if(phase==='recording'&&replayTake) {
    while(replayIndex<replayTake.inputs.length&&replayTake.inputs[replayIndex].tick===state.tick) {
      const entry=replayTake.inputs[replayIndex++]; applyInput(entry.code,entry.down);
    }
  }
  const player=state.player;
  const direction=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
  if(activeAnimation) {
    activeAnimation.ticks++;
    const progress=clamp(activeAnimation.ticks/activeAnimation.duration,0,1);
    player.actionProgress=progress;
    const smooth=progress*progress*(3-2*progress);
    player.x=activeAnimation.fromX+(activeAnimation.targetX-activeAnimation.fromX)*smooth;
    if(activeAnimation.kind==='switch'&&progress>=.75&&!activeAnimation.toggled) {
      state.lampOn=!state.lampOn; activeAnimation.toggled=true;
    }
    if(progress>=1) {
      player.action=activeAnimation.kind==='sitDown'?'sitting':'idle';
      player.actionProgress=0; activeAnimation=null;
    }
  } else if(player.action==='sitting') {
    if(direction) action('standUp');
  } else if(direction) {
    player.dir=direction;
    const next=clamp(player.x+direction*48/FPS,48,430);
    const distance=Math.abs(next-player.x);
    player.walkDistance+=distance; player.x=next;
    player.action=distance>0?'walk':'idle';
  } else { player.action='idle'; player.actionProgress=0; }
  state.tick++;
  state.elapsed=state.tick/FPS;
}
function advanceToAudio() {
  if(phase!=='recording'||!currentTake||!audioContext) return;
  const target=Math.min(currentTake.clip.duration,Math.max(0,audioContext.currentTime-audioStart));
  const wanted=Math.floor(target*FPS+1e-7);
  // Advancing the simulation never moves a character without the recorded input state.
  while(state.tick<wanted) step();
  state.elapsed=target;
}
function draw() {
  drawScene(graphics,state);
  output.imageSmoothingEnabled=false;
  output.drawImage(world,0,0,canvas.width,canvas.height);
}
function updateHint() {
  const player=state.player;
  let text='靠近琴凳可以坐下，窗边的灯可以开关。';
  if(player.action==='sitting') text='E 起身 · 也可以一直坐着，音乐会继续。';
  else if(interactive.includes(player.action)) text='让这个动作慢慢完成。';
  else if(Math.abs(player.x-172)<=20) text='E 坐下 · 旁边的空位会一直留着。';
  else if(Math.abs(player.x-360)<=20) text=`E ${state.lampOn?'关灯':'开灯'} · 想改变主意，随时可以。`;
  if(replayTake&&phase==='recording') text='正在用保存的输入重现这次表演。';
  $('hint').textContent=text;
}
function frame(now) {
  const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;
  lastFrame=now;
  if(phase==='recording') {
    advanceToAudio();
    $('clock').textContent=`${timeText(state.elapsed)} / ${timeText(currentTake.clip.duration)}`;
  } else if(['explore','ready'].includes(phase)) {
    previewAccumulator+=dt;
    while(previewAccumulator>=1/FPS) { step(); previewAccumulator-=1/FPS; }
  }
  try { draw(); } catch(error) {
    if(!errors.includes(error.message)) {errors.push(error.message); console.error(error);}
  }
  updateHint();
  requestAnimationFrame(frame);
}
function selectMime() {
  if(!window.MediaRecorder||!canvas.captureStream) throw new Error('这个浏览器暂不支持游戏画面录制，请使用新版桌面 Chrome 或 Edge。');
  const mime=['video/mp4;codecs=avc1.424028,mp4a.40.2','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mime) throw new Error('这个浏览器暂不支持可定位回看的 MP4 录制，请使用新版桌面 Chrome 或 Edge。琴房仍可自由探索。');
  return mime;
}
function validateTake(take) {
  if(!take||take.schema!==LOG_SCHEMA) throw new Error('这不是支持的操作记录文件。');
  if(take.gameVersion!==VERSION||take.artVersion!==ART_VERSION) throw new Error('操作记录来自另一游戏版本，请使用它对应的版本重拍。');
  if(take.audio?.sha256!==audioHash) throw new Error('音乐文件不同。请先载入录制时使用的同一音频，再重拍。');
  if(take.seed!==SEED||JSON.stringify(take.initialState)!==JSON.stringify(initialState())) throw new Error('初始场景不同，不能可靠重现这份记录。');
  if(!take.clip||!Number.isFinite(take.clip.start)||!Number.isFinite(take.clip.end)||take.clip.start<0||take.clip.end>audioBuffer.duration+.011||take.clip.end<=take.clip.start) throw new Error('操作记录的音乐片段无效。');
  if(Math.abs(take.clip.duration-(take.clip.end-take.clip.start))>.001) throw new Error('操作记录的片段长度不一致。');
  if(!Array.isArray(take.inputs)||take.inputs.length>200000) throw new Error('操作记录的输入列表无效。');
  let prev=-1;
  for(const event of take.inputs) {
    if(!Number.isInteger(event.tick)||event.tick<prev||event.tick<0||event.tick>Math.ceil(take.clip.duration*FPS)||!supportedKeys.has(event.code)||typeof event.down!=='boolean') throw new Error('操作记录包含无效的输入事件。');
    prev=event.tick;
  }
  return take;
}
function cleanupMedia() {
  clearTimeout(finishTimer);
  if(captureKeepAlive){try{captureKeepAlive.stop();captureKeepAlive.disconnect();}catch{} captureKeepAlive=null;}
  if(audioSource) {
    audioSource.onended=null;
    try{audioSource.stop();}catch{}
    try{audioSource.disconnect();}catch{}
    audioSource=null;
  }
  if(gainNode){try{gainNode.disconnect();}catch{} gainNode=null;}
  if(audioDestination){try{audioDestination.disconnect();}catch{} audioDestination=null;}
  if(captureStream){for(const track of captureStream.getTracks())track.stop();captureStream=null;}
  if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;}
}
function clearReviewURLs() {
  const video=$('playback'); video.pause(); video.removeAttribute('src'); video.load();
  if(videoURL) URL.revokeObjectURL(videoURL);
  if(logURL) URL.revokeObjectURL(logURL);
  videoURL=''; logURL=''; lastBlob=null;
}
async function beginRecording(replay=null) {
  if(busy()) return;
  try {
    const context=ensureAudioContext();
    const mime=selectMime();
    let bounds=getBounds();
    if(replay) {validateTake(replay);bounds=clone(replay.clip);}
    phase='preparing'; updateControls(); message('准备录制…');
    await context.resume();
    if(context.state!=='running') throw new Error('浏览器尚未允许播放声音，请再次点击开始。');
    cleanupMedia(); clearReviewURLs();
    $('review').hidden=true;
    state=initialState(); activeAnimation=null; keys.clear(); previewAccumulator=0;
    replayTake=replay?clone(replay):null; replayIndex=0;
    chunks=[]; finalized=false; recordingError=null;
    audioDestination=context.createMediaStreamDestination();
    // Keep the capture graph rendering silent samples after the song ends so
    // the AAC encoder can drain its last audio frames before recorder.stop().
    captureKeepAlive=context.createConstantSource();
    captureKeepAlive.offset.value=0;
    captureKeepAlive.connect(audioDestination);
    captureKeepAlive.start();
    gainNode=context.createGain(); gainNode.gain.value=1;
    gainNode.connect(context.destination); gainNode.connect(audioDestination);
    audioSource=context.createBufferSource(); audioSource.buffer=audioBuffer; audioSource.connect(gainNode);
    draw();
    const videoStream=canvas.captureStream(30);
    captureStream=new MediaStream([...videoStream.getVideoTracks(),...audioDestination.stream.getAudioTracks()]);
    recorder=new MediaRecorder(captureStream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:8000000,audioBitsPerSecond:192000});
    currentTake={schema:LOG_SCHEMA,gameVersion:VERSION,artVersion:ART_VERSION,seed:SEED,createdAt:new Date().toISOString(),mode:replay?'input-replay':'live-input',audio:{name:audioName,sha256:audioHash,duration:audioBuffer.duration,sampleRate:audioBuffer.sampleRate},clip:bounds,initialState:initialState(),simulationFPS:FPS,captureFPS:30,canvas:{width:1920,height:1080},inputs:replay?clone(replay.inputs):[],events:[],timing:{},complete:false};
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onerror=event=>{
      recordingError=event.error?.message||'浏览器录制失败';
      errors.push(recordingError);
      finishRecording(false,recordingError);
    };
    recorder.onstop=finalizeRecording;
    recorder.start(1000);
    recordWallStart=performance.now();
    audioStart=context.currentTime+.08;
    currentTake.timing={scheduledAudioContextStart:audioStart,recorderAudioContextStart:context.currentTime,scheduledLeadInSeconds:audioStart-context.currentTime,encoderDrainSeconds:.25,startedAtPerformanceMs:recordWallStart,audioGain:1};
    phase='recording';
    audioSource.onended=()=>{if(phase==='recording')finishRecording(true,'音乐已结束');};
    audioSource.start(audioStart,bounds.start,bounds.duration);
    currentTake.events.push({type:'recording-start',tick:0,mode:currentTake.mode});
    canvas.focus({preventScroll:true});
    canvas.scrollIntoView({block:'center',behavior:'instant'});
    message(replay?'正在回放操作并录制 · 音乐持续播放':'正在录制 · 自由表演，音乐结束后回看');
    updateControls();
    if(navigator.wakeLock) navigator.wakeLock.request('screen').then(lock=>{
      if(phase==='recording')wakeLock=lock;else lock.release().catch(()=>{});
    }).catch(()=>{});
  } catch(error) {
    phase=audioBuffer?'ready':'explore';
    cleanupMedia(); message(error.message,true); updateControls();
  }
}
function finishRecording(complete,reason) {
  if(phase!=='recording'||finalized) return;
  advanceToAudio();
  if(complete) {
    const wanted=Math.floor(currentTake.clip.duration*FPS+1e-7);
    while(state.tick<wanted)step();
    state.elapsed=currentTake.clip.duration;
  }
  // A held input at the ending is part of the final state; it is not silently rewritten.
  currentTake.complete=complete&&!recordingError;
  currentTake.endReason=reason;
  currentTake.finalState=clone(state);
  currentTake.ticks=state.tick;
  currentTake.events.push({type:complete?'audio-ended':'interrupted',tick:state.tick,reason});
  currentTake.timing.recordedPerformanceSeconds=(performance.now()-recordWallStart)/1000;
  currentTake.timing.contentSeconds=state.elapsed;
  currentTake.timing.replayInputsApplied=replayTake?replayIndex:null;
  if(replayTake?.finalState&&complete&&replayTake.complete) {
    currentTake.replayVerification={matches:JSON.stringify(state)===JSON.stringify(replayTake.finalState),expected:clone(replayTake.finalState),actual:clone(state)};
  }
  phase='finalizing';
  keys.clear();
  if(audioSource) {audioSource.onended=null;if(!complete)try{audioSource.stop();}catch{}}
  draw();
  captureStream?.getVideoTracks()[0]?.requestFrame?.();
  message('正在整理你的录像…'); updateControls();
  finishTimer=setTimeout(()=>{
    if(recorder?.state!=='inactive') {try{recorder.stop();}catch(error){recordingError=error.message;finalizeRecording();}}
    else finalizeRecording();
  },250);
}
function finalizeRecording() {
  if(finalized) return;
  finalized=true;
  const mime=recorder?.mimeType||chunks[0]?.type||'video/webm';
  lastBlob=new Blob(chunks,{type:mime}); chunks=[];
  currentTake.mimeType=mime;
  currentTake.fileBytes=lastBlob.size;
  lastTake=clone(currentTake);
  cleanupMedia(); recorder=null; replayTake=null; keys.clear();
  phase='review';
  if(!lastBlob.size) {message('没有生成有效录像，请重新录制。',true);updateControls();return;}
  videoURL=URL.createObjectURL(lastBlob);
  logURL=URL.createObjectURL(new Blob([JSON.stringify(lastTake,null,2)+'\n'],{type:'application/json'}));
  $('playback').src=videoURL;
  $('download-video').href=videoURL;
  $('download-video').download=`安静-${lastTake.complete?'我的MV':'中断片段'}.${mime.includes('mp4')?'mp4':'webm'}`;
  $('download-log').href=logURL;
  $('review-title').textContent=lastTake.complete?'这是你的版本。':'这一次暂停在这里。';
  $('review-meta').textContent=`${lastTake.timing.contentSeconds.toFixed(1)} 秒 · 1920 × 1080 · ${(lastBlob.size/1048576).toFixed(1)} MB`;
  $('review-note').textContent=lastTake.complete?'录像包含游戏画面与音乐。操作按钮和录制面板没有进入画面。':`录制中断：${lastTake.endReason}。这段录像仍可保存，或重新录制。`;
  $('review').hidden=false;
  $('clock').textContent=lastTake.complete?'录制完成':'录制已中断';
  message(lastTake.complete?'你的 MV 已完成 · 可以回看、保存或再录一版':'录制中断 · 可以保存片段或重新录制',!lastTake.complete);
  updateControls();
}

$('audio-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0]; if(!file||busy())return;
  try{await loadAudio(await file.arrayBuffer(),file.name);}catch(error){message(`音频载入失败：${error.message}`,true);}
  event.target.value='';
});
for(const id of ['clip-start','clip-end']) $(id).addEventListener('input',updateClipText);
$('start-recording').addEventListener('click',()=>beginRecording());
$('record-again').addEventListener('click',()=>beginRecording());
$('stop-recording').addEventListener('click',()=>finishRecording(false,'手动结束'));
$('replay-take').addEventListener('click',()=>beginRecording(lastTake));
$('run-imported-replay').addEventListener('click',()=>beginRecording(importedTake));
$('replay-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file||busy())return;
  try {
    if(file.size>20*1024*1024)throw new Error('操作记录文件过大。');
    const parsed=JSON.parse(await file.text());
    if(!audioBuffer) throw new Error('请先载入录制时使用的音频。');
    validateTake(parsed); importedTake=parsed;
    $('replay-info').textContent=`已载入 ${parsed.inputs.length} 条输入 · ${parsed.clip.duration.toFixed(1)} 秒`;
    $('replay-info').classList.remove('error'); updateControls();
  } catch(error) {
    importedTake=null;$('replay-info').textContent=error.message;$('replay-info').classList.add('error');updateControls();
  }
  event.target.value='';
});
function typing(target) { return target instanceof HTMLElement&&(['INPUT','TEXTAREA','SELECT','BUTTON','A','SUMMARY','VIDEO'].includes(target.tagName)||target.isContentEditable); }
document.addEventListener('keydown',event=>{
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||typing(event.target)||!supportedKeys.has(event.code))return;
  event.preventDefault();input(event.code,true);
});
document.addEventListener('keyup',event=>{
  if(!supportedKeys.has(event.code))return;
  if(!typing(event.target))event.preventDefault();
  input(event.code,false);
});
window.addEventListener('blur',()=>releaseAll());
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&phase==='recording')finishRecording(false,'页面进入后台，已停止以避免音画错位');
});
for(const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();button.setPointerCapture(event.pointerId);input(button.dataset.key,true,'touch');
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,event=>{
    event.preventDefault();input(button.dataset.key,false,'touch');
  });
}
window.addEventListener('beforeunload',()=>{cleanupMedia();clearReviewURLs();});
Object.defineProperty(window,'gameDebug',{value:Object.freeze({
  snapshot:()=>clone({version:VERSION,artVersion:ART_VERSION,phase,state,keys:[...keys],hasAudio:!!audioBuffer,audioHash,playing:!!audioSource,contextState:audioContext?.state,errors}),
  getRecordingInfo:()=>clone({phase,mime:recorder?.mimeType||lastTake?.mimeType||null,bytes:lastBlob?.size||0,lastTake,currentTake:phase==='recording'?currentTake:null,downloadReady:!!videoURL})
}),writable:false});
requestAnimationFrame(frame);
updateControls();
(async function loadLocalReference(){
  if(!['127.0.0.1','localhost','[::1]'].includes(location.hostname)) return;
  try {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),2500);
    const response=await fetch('/_local/status',{signal:controller.signal,cache:'no-store'});
    clearTimeout(timeout);
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))return;
    const info=await response.json();if(!info.available)return;
    if(audioBuffer||busy())return;
    const audioResponse=await fetch('/_local/audio',{cache:'no-store'});
    if(!audioResponse.ok)return;
    const bytes=await audioResponse.arrayBuffer();
    if(audioBuffer||busy())return;
    await loadAudio(bytes,'周杰伦 · 安静 / 30 秒实验选段');
  } catch { /* Public edition intentionally contains no bundled commercial recording. */ }
})();
