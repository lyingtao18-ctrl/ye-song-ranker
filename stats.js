(() => {
  const catalog=window.YE_CATALOG, byId=new Map(catalog.songs.map(song=>[song.id,song]));
  const origin='https://ye-song-ranker.speedymyna129.chatgpt.site';
  const endpoint=(location.origin===origin||['localhost','127.0.0.1'].includes(location.hostname)?'':origin)+'/api/results';
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.querySelector('header').insertAdjacentHTML('beforeend','<button class="ghost community-open" id="communityOpen">大家的前十</button>');
  document.querySelector('header').insertAdjacentHTML('afterend',`<section class="community-panel" id="communityPanel" hidden aria-label="大家的前十统计"><div class="community-heading"><div><div class="eyebrow">COMMUNITY / TOP 10 RATE</div><h2>大家把谁留进前十</h2></div><button class="ghost" id="communityClose">收起</button></div><p class="community-description">只统计完成后匿名提交的前十。入选率 = 选进前十的有效结果数 ÷ 本歌池有效提交总数。</p><div class="community-summary"><strong id="communityTotal">—</strong><span>份有效结果<br>当前歌池：100 首</span><button class="ghost" id="communityRefresh">刷新统计</button></div><p class="community-status" id="communityStatus" role="status">打开后读取共享统计。</p><ol class="community-table" id="communityList"></ol><p class="community-privacy">同一浏览器在同一歌池中仅保留最近一份提交；匿名编号不能识别真实人数，换浏览器或清除存储可能重复计入。每份结果包含 10 首，入选率相加不等于 100%。旧 64 首歌池的本地结果未上传，无法补算。</p></section>`);
  document.querySelector('.control-strip').insertAdjacentHTML('afterend','<label class="stats-consent"><input type="checkbox" id="statsConsent" checked>完成后匿名提交最终前十；上传前十歌曲编号与去重用的匿名编号，不上传对战记录或本地音乐。取消勾选则仅自己查看。</label>');
  document.querySelector('.result-actions').insertAdjacentHTML('beforeend','<button class="ghost" id="resetResultBtn">再做一轮</button>');
  document.querySelector('#results').insertAdjacentHTML('beforeend','<div class="stats-result"><p>将本次最终前十加入大家的统计。同一浏览器重做只更新原结果，不累加样本数。</p><button class="ghost" id="submitTop10">提交本次前十</button><span class="stats-result-status" id="submitStatus" role="status"></span></div>');
  const el=id=>document.getElementById(id);
  let loading=false,submitting=false;
  async function request(url,options){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{const r=await fetch(url,{...options,signal:controller.signal});const data=await r.json();if(!r.ok)throw new Error(data.error||'请求失败');return data;}
    finally{clearTimeout(timer);}
  }
  async function refresh(){
    if(loading)return;loading=true;el('communityRefresh').disabled=true;el('communityStatus').textContent='正在读取共享统计…';
    try{
      const data=await request(endpoint+'?catalog='+encodeURIComponent(catalog.version));
      if(data.catalogVersion!==catalog.version||!Number.isInteger(data.totalSubmissions)||data.totalSubmissions<0||!Array.isArray(data.songs))throw new Error('统计格式不正确');
      const total=data.totalSubmissions;
      for(const item of data.songs)if(!byId.has(item.id)||!Number.isInteger(item.count)||item.count<0||item.count>total)throw new Error('统计格式不正确');
      el('communityTotal').textContent=String(total);
      const sorted=data.songs.filter(s=>s.count>0).sort((a,b)=>b.count-a.count||byId.get(a.id).title.localeCompare(byId.get(b.id).title));
      let rank=0,last=-1;
      el('communityList').innerHTML=sorted.slice(0,10).map((item,index)=>{
        if(item.count!==last)rank=index+1;last=item.count;
        const song=byId.get(item.id),percent=100*item.count/total;
        return `<li class="community-row"><span class="community-rank">${rank}</span><div class="community-song"><b>${escape(song.title)}</b><small>${escape(song.album)}</small><div class="community-meter"><i style="width:${percent.toFixed(2)}%"></i></div></div><div class="community-rate">${percent.toFixed(1)}%<small>${item.count} / ${total} 份</small></div></li>`;
      }).join('');
      el('communityStatus').textContent=total?'按前十入选率从高到低展示前 10 行，相同次数并列。淘汰赛结果受抽签影响，不等于所有歌曲的严格总排名。':'还没有有效提交。完成一轮并提交前十后，这里才会产生排名。';
    }catch{el('communityTotal').textContent='—';el('communityList').replaceChildren();el('communityStatus').textContent='共享统计暂时连不上，请稍后刷新。页面不会用本地数据或示例数据冒充大家的结果。';}
    finally{loading=false;el('communityRefresh').disabled=false;}
  }
  function visitorId(){
    try{
      const key='ye-anonymous-visitor-v1';let id=localStorage.getItem(key);
      if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}
      return id;
    }catch{throw new Error('浏览器未允许本地存储，无法进行匿名去重；请开启存储后重试。');}
  }
  async function submit(){
    if(submitting)return;
    const top10=window.YE_RANKER.getTop10();if(!top10)return;
    submitting=true;el('submitTop10').disabled=true;el('resetResultBtn').disabled=true;el('submitStatus').textContent='正在提交…';
    try{
      await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({catalogVersion:catalog.version,visitorId:visitorId(),top10})});
      el('submitStatus').textContent='已计入共享统计，同一浏览器不会重复累加。';el('submitTop10').textContent='前十已提交';
      if(!el('communityPanel').hidden)await refresh();
    }catch(error){el('submitStatus').textContent=error.message==='Failed to fetch'?'提交未成功，请检查网络后重试。':error.message;el('submitTop10').disabled=false;}
    finally{submitting=false;el('resetResultBtn').disabled=false;}
  }
  el('communityOpen').onclick=()=>{el('communityPanel').hidden=!el('communityPanel').hidden;if(!el('communityPanel').hidden){refresh();el('communityPanel').scrollIntoView({behavior:'smooth',block:'start'});}};
  el('communityClose').onclick=()=>el('communityPanel').hidden=true;
  el('communityRefresh').onclick=refresh;el('submitTop10').onclick=submit;
  el('resetResultBtn').onclick=()=>document.querySelector('#resetBtn').click();
  window.addEventListener('ye:finished',()=>{if(el('statsConsent').checked)submit();else el('submitStatus').textContent='未提交，仅保存在当前页面。你也可以手动提交。';});
  window.addEventListener('ye:reset',()=>{el('submitTop10').disabled=false;el('submitTop10').textContent='提交本次前十';el('submitStatus').textContent='';});
})();
