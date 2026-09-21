(function(){
  var root=document.documentElement, KEY='aba-reader';
  var st={}; try{st=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
  var size=st.size||1.125;
  function applySize(){root.style.setProperty('--fs',size+'rem')}
  applySize(); if(st.theme) root.setAttribute('data-theme',st.theme);
  document.getElementById('bigger').onclick=function(){size=Math.min(1.5,size+0.0625);st.size=size;applySize();save()};
  document.getElementById('smaller').onclick=function(){size=Math.max(0.9375,size-0.0625);st.size=size;applySize();save()};
  document.getElementById('theme').onclick=function(){
    var cur=root.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    var next=cur==='dark'?'light':'dark'; root.setAttribute('data-theme',next); st.theme=next; save();
  };
  var toc=document.getElementById('toc');
  var tocBtn=document.getElementById('tocBtn'), layout=document.querySelector('.layout');
  var narrow=matchMedia('(max-width:900px)');
  function syncToc(){
    layout.classList.toggle('toc-folded',!!st.tocFolded);
    var expanded=narrow.matches?toc.classList.contains('open'):!st.tocFolded;
    tocBtn.setAttribute('aria-expanded',String(expanded));
    tocBtn.setAttribute('aria-label',expanded?'Hide contents':'Show contents');
    tocBtn.title=expanded?'Hide contents':'Show contents';
  }
  tocBtn.onclick=function(){
    if(narrow.matches) toc.classList.toggle('open');
    else{st.tocFolded=!st.tocFolded;save()}
    syncToc();onScroll();
  };
  toc.addEventListener('click',function(e){
    if(e.target.closest('a') && narrow.matches){toc.classList.remove('open');syncToc()}
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && narrow.matches && toc.classList.contains('open')){
      toc.classList.remove('open');syncToc();tocBtn.focus();
    }
  });
  narrow.addEventListener('change',function(){toc.classList.remove('open');syncToc()});
  syncToc();
  var bar=document.getElementById('progress');
  var links=[].slice.call(toc.querySelectorAll('a'));
  var targets=links.map(function(a){return document.querySelector(a.getAttribute('href'))});
  function onScroll(){
    var h=document.documentElement; var max=h.scrollHeight-h.clientHeight;
    bar.style.width=(max>0?(h.scrollTop/max*100):0)+'%';
    var idx=0; for(var i=0;i<targets.length;i++){ if(targets[i] && targets[i].getBoundingClientRect().top<120) idx=i; }
    links.forEach(function(a,i){a.classList.toggle('active',i===idx)});
  }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
})();
