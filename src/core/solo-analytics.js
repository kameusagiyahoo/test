import {SOLO_DIFFICULTIES,normalizeSoloDifficulty} from './solo.js';

function safeNumber(value){return Number.isFinite(Number(value))?Number(value):0}

export function buildSoloDifficultyAnalytics(gameId,statsEntries=[],progress=null){
  const entries=(Array.isArray(statsEntries)?statsEntries:[])
    .filter(entry=>entry?.gameId===gameId&&entry.mode==='single'&&Array.isArray(entry.players)&&entry.players.length===1);

  const rows=SOLO_DIFFICULTIES.map(difficulty=>{
    const tierEntries=entries.filter(entry=>normalizeSoloDifficulty(entry.difficulty||'normal')===difficulty);
    const roundEntries=tierEntries.filter(entry=>Number.isInteger(entry.clearRounds)&&entry.clearRounds>0);
    const totalRounds=roundEntries.reduce((sum,entry)=>sum+entry.clearRounds,0);
    const totalPoints=roundEntries.reduce((sum,entry)=>sum+safeNumber(entry.scores?.[0]),0);
    const progressTier=progress?.difficulties?.[difficulty]||{};
    const trackedBest=roundEntries.length?Math.min(...roundEntries.map(entry=>entry.clearRounds)):null;
    const bestRounds=Number.isInteger(progressTier.bestRounds)?progressTier.bestRounds:trackedBest;
    return{
      difficulty,
      clears:Number(progressTier.clears)||tierEntries.length,
      trackedRuns:tierEntries.length,
      roundTrackedRuns:roundEntries.length,
      averageRounds:roundEntries.length?totalRounds/roundEntries.length:null,
      bestRounds,
      bestStreak:Number(progressTier.bestStreak)||0,
      averagePointsPerRound:totalRounds?totalPoints/totalRounds:null
    };
  });

  const knownRuns=rows.reduce((sum,row)=>sum+row.roundTrackedRuns,0);
  return{
    gameId,
    rows,
    totalClears:rows.reduce((sum,row)=>sum+row.clears,0),
    trackedRuns:rows.reduce((sum,row)=>sum+row.trackedRuns,0),
    roundTrackedRuns:knownRuns,
    hasRoundMetrics:knownRuns>0
  };
}
