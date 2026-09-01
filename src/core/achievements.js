const DEFINITIONS=[
  {id:'first-win',symbol:'Ⅰ',tier:'bronze',title:'FIRST WIN',description:'通算1勝する',metric:p=>p.wins,target:1},
  {id:'ten-wins',symbol:'Ⅹ',tier:'silver',title:'TEN WINS',description:'通算10勝する',metric:p=>p.wins,target:10},
  {id:'fifty-games',symbol:'50',tier:'gold',title:'REGULAR',description:'50試合プレイする',metric:p=>p.plays,target:50},
  {id:'party-champion',symbol:'◆',tier:'bronze',title:'PARTY CHAMPION',description:'Party総合優勝を1回する',metric:p=>p.partyWins,target:1},
  {id:'party-five',symbol:'Ⅴ',tier:'gold',title:'PARTY ACE',description:'Party総合優勝を5回する',metric:p=>p.partyWins,target:5},
  {id:'party-ten',symbol:'10',tier:'silver',title:'PARTY REGULAR',description:'Partyを10回完走する',metric:p=>p.partySessions,target:10},
  {id:'mvp-one',symbol:'M',tier:'bronze',title:'MVP',description:'Party MVPを1回獲得する',metric:p=>p.mvpCount,target:1},
  {id:'mvp-three',symbol:'M3',tier:'gold',title:'MVP MASTER',description:'Party MVPを3回獲得する',metric:p=>p.mvpCount,target:3},
  {id:'explorer',symbol:'◇',tier:'silver',title:'EXPLORER',description:'10種類のゲームを遊ぶ',metric:p=>p.gamesPlayed,target:10},
  {id:'all-rounder',symbol:'◎',tier:'gold',title:'ALL ROUNDER',description:'5種類のゲームで勝利する',metric:p=>wonGames(p),target:5},
  {id:'specialist',symbol:'▲',tier:'silver',title:'SPECIALIST',description:'1つのゲームで5勝する',metric:p=>bestGameWins(p),target:5},
  {id:'rivalry',symbol:'↔',tier:'silver',title:'RIVALRY',description:'同じ相手とPartyで5回対戦する',metric:p=>maxRivalMeetings(p),target:5},
  {id:'party-points',symbol:'P',tier:'gold',title:'50 PARTY PT',description:'累積50 Party ptを獲得する',metric:p=>p.partyPoints,target:50},
  {id:'broad-winner',symbol:'▦',tier:'gold',title:'BROAD WINNER',description:'10種類のゲームで勝利する',metric:p=>wonGames(p),target:10}
];

function number(value){return Math.max(0,Number(value)||0)}
function wonGames(profile){return (profile?.gameStats||[]).filter(row=>number(row.wins)>0).length}
function bestGameWins(profile){return Math.max(0,...(profile?.gameStats||[]).map(row=>number(row.wins)))}
function maxRivalMeetings(profile){return Math.max(0,...(profile?.rivals||[]).map(row=>number(row.meetings)))}

export function achievementDefinitions(){
  return DEFINITIONS.map(({metric,...definition})=>({...definition}));
}

export function playerAchievements(profile){
  return DEFINITIONS.map(definition=>{
    const current=number(definition.metric(profile||{})),target=definition.target;
    const unlocked=current>=target;
    return{
      id:definition.id,
      symbol:definition.symbol,
      tier:definition.tier,
      title:definition.title,
      description:definition.description,
      current,
      target,
      progress:target?Math.min(1,current/target):1,
      unlocked
    };
  });
}

export function unlockedAchievements(profile){
  return playerAchievements(profile).filter(row=>row.unlocked);
}

export function nextMilestones(profile,limit=3){
  return playerAchievements(profile)
    .filter(row=>!row.unlocked)
    .sort((a,b)=>b.progress-a.progress||(a.target-a.current)-(b.target-b.current)||a.title.localeCompare(b.title))
    .slice(0,Math.max(0,Number(limit)||0));
}

export function achievementBoard(profiles=[]){
  return (Array.isArray(profiles)?profiles:[]).map(profile=>{
    const achievements=playerAchievements(profile);
    return{
      name:profile.name,
      plays:profile.plays,
      unlocked:achievements.filter(row=>row.unlocked).length,
      total:achievements.length,
      next:nextMilestones(profile,1)[0]||null
    };
  }).sort((a,b)=>b.unlocked-a.unlocked||b.plays-a.plays||a.name.localeCompare(b.name,'ja'));
}

export function achievementSummary(profiles=[]){
  const board=achievementBoard(profiles);
  return{
    players:board.length,
    unlocked:board.reduce((sum,row)=>sum+row.unlocked,0),
    possible:board.length*(DEFINITIONS.length),
    leader:board[0]||null
  };
}
