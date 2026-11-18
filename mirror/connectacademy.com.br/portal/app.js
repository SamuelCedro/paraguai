'use strict';
(() => {
  const root = document.documentElement;
  const story = document.querySelector('.scroll-story');
  const steps = [...document.querySelectorAll('[data-step]')];
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 901px) and (min-height: 801px)');
  const hero = document.querySelector('.hero');
  const collection = document.querySelector('.collection');
  const world = document.querySelector('.world');
  const ribbon = document.querySelector('.category-ribbon');
  const final = document.querySelector('.final-cta');
  const clamp = (x, a=0, b=1) => Math.min(b, Math.max(a, x));
  let paused = false, enabled = false, active = -1, queued = false;

  function select(index) {
    if (index === active) return;
    active = index;
    story.dataset.active = String(index);
    steps.forEach((el,i) => {
      const selected = i === index;
      el.classList.toggle('is-active',selected);
      el.inert = enabled && !selected;
      if (enabled && !selected) el.setAttribute('aria-hidden','true');
      else el.removeAttribute('aria-hidden');
    });
    chapters.forEach((el,i) => {
      el.classList.toggle('active', i === index);
      if (i === index) el.setAttribute('aria-current','step');
      else el.removeAttribute('aria-current');
    });
  }

  function update() {
    queued = false;
    if (paused || reduced.matches) return;
    if (enabled) {
      const box = story.getBoundingClientRect();
      const range = Math.max(1,story.offsetHeight-innerHeight);
      const progress = clamp(-box.top/range);
      const index = Math.min(2,Math.floor(progress*3));
      select(index);
    }
    const hr=hero.getBoundingClientRect();
    if (hr.bottom>0) hero.style.setProperty('--hero-y',clamp(-hr.top*.14,0,140)+'px');
    for (const [el,prop,amount] of [[collection,'--collection-y',45],[world,'--world-y',55],[final,'--final-x',-110],[ribbon,'--ribbon-x',-70]]) {
      const box=el.getBoundingClientRect();
      if(box.bottom>0 && box.top<innerHeight){
        const p=clamp((innerHeight-box.top)/(innerHeight+box.height));
        el.style.setProperty(prop,((p-.5)*amount)+'px');
      }
    }
  }
  function queue() {if (!queued){queued=true;requestAnimationFrame(update);}}
  function configure() {
    enabled=desktop.matches&&!reduced.matches&&!paused;
    root.classList.toggle('motion-ready',enabled);
    root.classList.toggle('motion-off',paused||reduced.matches);
    active=-1;
    select(0);
    update();
  }
  chapters.forEach((button,i)=>button.addEventListener('click',()=>{
    if(!enabled){steps[i].scrollIntoView({behavior:paused||reduced.matches?'instant':'smooth',block:'start'});return;}
    const top=scrollY+story.getBoundingClientRect().top;
    const range=story.offsetHeight-innerHeight;
    scrollTo({top:top+range*(i+.4)/3,behavior:'smooth'});
  }));
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',queue,{passive:true});
  reduced.addEventListener('change',configure);
  desktop.addEventListener('change',configure);
  configure();

  if ('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.remove('waiting');observer.unobserve(entry.target);}
      });
    },{threshold:.08,rootMargin:'0px 0px -20px 0px'});
    document.querySelectorAll('.intro h2,.intro>p,.section-heading,.collection-title,.collection-categories,.tools-grid>article,.tool-stack article,.world-copy,.plans-heading,.plan,.faq-grid,.final-cta .wrap').forEach(el=>{
      el.classList.add('reveal');
      if(!reduced.matches && el.getBoundingClientRect().top>innerHeight){el.classList.add('waiting');observer.observe(el);}
    });
  }

  const categories=[
    {name:'TECNOLOGIA',title:'Conecte-se ao seu próximo upgrade.',image:'/portal/assets/catalog-app.png',alt:'Catálogo de produtos Paraguai Academy'},
    {name:'CASA & DECORAÇÃO',title:'Mais personalidade para o seu espaço.',image:'/portal/assets/homegoods.webp',alt:'Poltrona, luminária e objetos de decoração'},
    {name:'MODA & ACESSÓRIOS',title:'Seu estilo. Novas possibilidades.',image:'/portal/assets/fashion.webp',alt:'Jaqueta e acessórios de moda'}
  ];
  const filters=[...document.querySelectorAll('[data-category]')];
  function chooseCategory(i){
    const item=categories[i];
    document.getElementById('catalog-category').textContent=item.name;
    document.getElementById('catalog-title').textContent=item.title;
    const photo=document.getElementById('catalog-photo');
    photo.src='/portal/assets/'+item.image;photo.alt=item.alt;
    document.getElementById('catalog-result').setAttribute('aria-labelledby','filter-'+i);
    filters.forEach((button,n)=>{button.setAttribute('aria-selected',String(n===i));button.tabIndex=n===i?0:-1;});
  }
  filters.forEach((button,i)=>{
    button.addEventListener('click',()=>chooseCategory(i));
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(i+1)%filters.length;
      if(event.key==='ArrowLeft')next=(i-1+filters.length)%filters.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=filters.length-1;
      if(next!==undefined){event.preventDefault();chooseCategory(next);filters[next].focus();}
    });
  });

  const videoButton=document.getElementById('open-video');
  videoButton.addEventListener('click',()=>{
    const player=document.getElementById('presentation-player');
    const url=player.dataset.video;
    if(!url){location.href='/mirror/connectacademy.com.br/#conheca';return;}
    const frame=document.createElement('iframe');
    frame.src=url;
    frame.title='Apresentação da Paraguai Academy';
    frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    frame.allowFullscreen=true;
    player.replaceChildren(frame);
    frame.focus();
  });
})();
