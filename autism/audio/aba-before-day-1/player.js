(function(){
  'use strict';
  const tracks=window.ABA_NARRATION || [];
  const player=document.getElementById('narrationAudio');
  const select=document.getElementById('narrationTrack');
  const status=document.getElementById('narrationStatus');
  const panel=document.getElementById('narrationPanel');
  const toggle=document.getElementById('audioToggle');
  function syncChapterSelection(){
    panel.classList.toggle('is-playing',!player.paused && !player.ended && !player.error);
  }
  ['play','pause','ended','emptied','error'].forEach(event=>player.addEventListener(event,syncChapterSelection));
  syncChapterSelection();
  let audioHidden=false;
  try{audioHidden=localStorage.getItem('aba-audio-hidden')==='true';}catch(e){}
  function syncPanel(){
    panel.hidden=audioHidden;
    document.body.classList.toggle('audio-hidden',audioHidden);
    toggle.setAttribute('aria-expanded',String(!audioHidden));
    const label=audioHidden?'Show audio':'Hide audio';
    toggle.setAttribute('aria-label',label);
    toggle.title=label;
  }
  toggle.addEventListener('click',()=>{
    audioHidden=!audioHidden;syncPanel();
    try{localStorage.setItem('aba-audio-hidden',String(audioHidden));}catch(e){}
  });
  syncPanel();
  let current=0, active=-1, frame=0;
  const spans=tracks.map(()=>[]);
  if(!tracks.length){status.textContent='Narration is unavailable. Please reload the page.';return;}
  tracks.forEach((track,trackIndex)=>{
    select.add(new Option((track.id==='intro'?'Introduction': 'Chapter '+track.id.slice(2))+': '+track.title, String(trackIndex)));
    track.nodes.forEach(node=>{
      const host=document.querySelector('[data-tts-node="'+node.id+'"]');
      if(!host) return;
      // Array.from keeps Python character offsets correct for Unicode text.
      const text=Array.from(host.textContent), fragment=document.createDocumentFragment();
      let cursor=0;
      track.words.forEach((word,index)=>{
        const start=Math.max(word.start_char,node.start)-node.start;
        const end=Math.min(word.end_char,node.end)-node.start;
        if(end<=start) return;
        fragment.append(document.createTextNode(text.slice(cursor,start).join('')));
        const span=document.createElement('span');
        span.className='tts-word';span.dataset.track=trackIndex;span.dataset.word=index;
        span.textContent=text.slice(start,end).join('');
        (spans[trackIndex][index] ||= []).push(span);
        fragment.append(span);cursor=end;
      });
      fragment.append(document.createTextNode(text.slice(cursor).join('')));
      host.replaceChildren(fragment);
    });
  });
  function clear(){
    (spans[current][active] || []).forEach(span=>span.classList.remove('is-speaking'));
    active=-1;
  }
  function paint(){
    const words=tracks[current].words, time=player.currentTime;
    let low=0, high=words.length-1, next=-1;
    while(low<=high){const mid=(low+high)>>1;if(words[mid].start<=time){next=mid;low=mid+1;}else high=mid-1;}
    if(next>=0 && time>=words[next].end) next=-1;
    if(next!==active){
      clear();active=next;
      const group=spans[current][active] || [];
      group.forEach(span=>span.classList.add('is-speaking'));
      if(group.length){
        const rect=group[0].getBoundingClientRect();
        if(rect.top<90 || rect.bottom>innerHeight-document.querySelector('.narration').offsetHeight-20) group[0].scrollIntoView({block:'center',behavior:'auto'});
      }
    }
  }
  function tick(){paint();if(!player.paused && !player.ended) frame=requestAnimationFrame(tick);}
  function load(index){
    player.pause();clear();current=index;select.value=String(index);
    player.src=tracks[index].audio;
    status.textContent='Ready — '+tracks[index].title;
  }
  function play(){player.play().catch(()=>{status.textContent='Press Play to start narration.';});}
  select.addEventListener('change',()=>load(Number(select.value)));
  player.addEventListener('play',()=>{cancelAnimationFrame(frame);status.textContent='Playing — '+tracks[current].title;tick();});
  player.addEventListener('pause',()=>{cancelAnimationFrame(frame);clear();status.textContent='Paused — '+tracks[current].title;});
  player.addEventListener('seeked',()=>{if(!player.paused) paint();});
  player.addEventListener('ended',()=>{
    cancelAnimationFrame(frame);clear();
    if(current+1<tracks.length){load(current+1);play();}else status.textContent='Reading complete.';
  });
  player.addEventListener('error',()=>{status.textContent='Could not load the audio. Please reload and try again.';});
  document.querySelector('main').addEventListener('dblclick',event=>{
    const word=event.target.closest('.tts-word');if(!word) return;
    const index=Number(word.dataset.track), time=tracks[index].words[Number(word.dataset.word)].start;
    if(index!==current) load(index);
    player.currentTime=time;play();
  });
  load(0);
})();
