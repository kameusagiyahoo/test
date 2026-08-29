export const HEALTH_THRESHOLDS={
  minReviews:2,
  minPopularityPlays:4,
  minSkewGamePlays:5,
  minSkewPlayerPlays:4,
  lowScore:3.3,
  skewWinRate:.75
};

function issue(type,severity,title,detail,action){
  return{type,severity,title,detail,action};
}

export function analyzeGameHealth({gameId,playtest,stats},thresholds=HEALTH_THRESHOLDS){
  const issues=[],p=playtest||{},s=stats||{plays:0,leader:null};
  const reviews=Number(p.responses)||0,plays=Number(s.plays)||0;

  if(reviews>=thresholds.minReviews){
    if(Number.isFinite(p.clarity?.average)&&p.clarity.average<thresholds.lowScore){
      issues.push(issue(
        'clarity','high','ルール理解に課題',
        '分かりやすさ '+p.clarity.average.toFixed(1)+' / 5（'+reviews+'件）',
        '詳細画面・ゲーム内説明・具体例を見直す'
      ));
    }
    if(Number.isFinite(p.replay?.average)&&p.replay.average<thresholds.lowScore){
      issues.push(issue(
        'replay',plays>=thresholds.minPopularityPlays?'high':'medium','再プレイ意向が低い',
        'もう一度遊びたい '+p.replay.average.toFixed(1)+' / 5（'+reviews+'件）',
        '終盤の逆転性・選択肢・ラウンド長を再検討する'
      ));
    }
    if(Number.isFinite(p.fun?.average)&&p.fun.average<thresholds.lowScore){
      issues.push(issue(
        'fun','high','面白さ評価が低い',
        '面白さ '+p.fun.average.toFixed(1)+' / 5（'+reviews+'件）',
        '意思決定の幅・緊張感・結果の納得感を見直す'
      ));
    }
  }

  if(
    plays>=thresholds.minSkewGamePlays &&
    Number(s.playerCount)>=2 &&
    s.leader &&
    Number(s.leader.plays)>=thresholds.minSkewPlayerPlays &&
    Number(s.leader.winRate)>=thresholds.skewWinRate
  ){
    issues.push(issue(
      'dominance','medium','勝率が特定プレイヤーに偏っている',
      s.leader.name+' が '+s.leader.wins+'/'+s.leader.plays+' 勝（'+Math.round(s.leader.winRate*100)+'%）',
      '先手順・情報量・経験者有利・得点補正を確認する'
    ));
  }

  if(plays>=thresholds.minPopularityPlays&&reviews<thresholds.minReviews){
    issues.push(issue(
      'evidence','info','よく遊ばれているが評価データ不足',
      plays+'試合に対して新4軸評価 '+reviews+'件',
      '次回プレイ後に評価を追加して判断材料を増やす'
    ));
  }

  if(!plays&&reviews===0){
    issues.push(issue(
      'untested','info','まだ実戦データがない',
      '完了試合・新4軸評価ともに0件',
      'まず1〜2回プレイして初期評価を集める'
    ));
  }

  const severityScore=issues.reduce((sum,x)=>sum+(x.severity==='high'?3:x.severity==='medium'?2:x.severity==='info'?1:0),0);
  const status=issues.some(x=>x.severity==='high')?'action'
    :issues.some(x=>x.severity==='medium')?'watch'
    :issues.length?'data'
    :'healthy';
  return{gameId,issues,severityScore,status,plays,reviews};
}

export function buildHealthReport(gameIds,playtestRows=[],statRows=[],thresholds=HEALTH_THRESHOLDS){
  const pMap=new Map(playtestRows.map(r=>[r.gameId,r]));
  const sMap=new Map(statRows.map(r=>[r.gameId,r]));
  const games=gameIds.map(gameId=>analyzeGameHealth({
    gameId,
    playtest:pMap.get(gameId),
    stats:sMap.get(gameId)
  },thresholds));
  const gamesByStatus={action:0,watch:0,data:0,healthy:0};
  games.forEach(g=>gamesByStatus[g.status]++);
  const rank={action:0,watch:1,data:2,healthy:3};
  const priority=[...games].sort((a,b)=>rank[a.status]-rank[b.status]||b.severityScore-a.severityScore||b.plays-a.plays||a.gameId.localeCompare(b.gameId));
  return{
    games,
    priority,
    actionCount:gamesByStatus.action,
    watchCount:gamesByStatus.watch,
    dataCount:gamesByStatus.data,
    healthyCount:gamesByStatus.healthy
  };
}
