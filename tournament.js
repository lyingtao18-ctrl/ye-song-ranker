(() => {
  function shuffle(values) {
    const result=[...values];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  function createHalves(songs) {
    const draw=shuffle(songs), size=Math.ceil(draw.length/2);
    return {draw,halves:[draw.slice(0,size),draw.slice(size)].map(pool=>({pool,nextPool:[],round:1,match:0,roundEntrants:pool.length,complete:false,bracket:[[]]}))};
  }
  function prepareHalf(half) {
    if(half.complete)return false;
    while(half.pool.length<2){
      if(half.pool.length===1){
        const song=half.pool.shift();
        (half.bracket[half.round-1]||=[]).push({a:song,b:null,winner:song,loser:null,bye:true});
        half.nextPool.push(song);
      }
      if(half.nextPool.length===1){half.complete=true;half.winner=half.nextPool[0];return false;}
      if(!half.nextPool.length)return false;
      half.pool=half.nextPool;half.nextPool=[];half.round++;half.match=0;
      half.roundEntrants=half.pool.length;half.bracket[half.round-1]=[];
    }
    return true;
  }
  function rankSongs(songs, results, draw) {
    const exits=new Map(), wins=new Map(), order=new Map(draw.map((song,i)=>[song.id,i]));
    for(const result of results){exits.set(result.opponent.id,result.phase==='half'?result.round:100);wins.set(result.song.id,(wins.get(result.song.id)||0)+1);}
    const final=[...results].reverse().find(result=>result.phase==='final');
    if(final)exits.set(final.song.id,101);
    return [...songs].sort((a,b)=>(exits.get(b.id)||0)-(exits.get(a.id)||0)||(wins.get(b.id)||0)-(wins.get(a.id)||0)||order.get(a.id)-order.get(b.id));
  }
  globalThis.YETournament={shuffle,createHalves,prepareHalf,rankSongs};
})();
