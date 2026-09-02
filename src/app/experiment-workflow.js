import {
  buildExperimentBaseline,
  evaluateExperiment,
  experimentOutcomeLabel
} from '../core/experiment-evaluation.js';

export function createExperimentWorkflow({
  improvementQueue,
  playtestEvents,
  toast
}){
  function evaluation(item){
    if(!item||item.status==='planned')return null;
    if(item.status==='done'&&item.finalResult)return item.finalResult;
    return evaluateExperiment(item,playtestEvents.forGame(item.gameId));
  }

  function advanceLabel(item){
    if(item.status==='planned')return'テスト開始';
    if(item.status==='testing'){
      const result=evaluation(item);
      return result?.ready?'評価して完了':`After ${result?.afterCount||0}/3`;
    }
    return'再計画';
  }

  function outcomeClass(result){
    return result?.outcome==='improved'?'improved':result?.outcome==='worse'?'worse':result?.outcome==='flat'?'flat':'collecting';
  }

  function resultSummary(item){
    const result=evaluation(item);
    if(!result)return'';
    const delta=Number.isFinite(result.qualityDelta)?`${result.qualityDelta>0?'+':''}${result.qualityDelta.toFixed(1)}`:'—';
    return `${experimentOutcomeLabel(result.outcome)} · Before ${result.baselineCount} / After ${result.afterCount} · Quality ${delta}`;
  }

  function advance(id){
    const item=improvementQueue.all().find(row=>row.id===id);if(!item)return null;
    if(item.status==='planned'){
      const startedAt=Date.now();
      const baseline=buildExperimentBaseline(item.source,playtestEvents.forGame(item.gameId),startedAt);
      if(baseline.count<2){
        toast(`Baselineが不足しています · ${baseline.count}/2 reviews`);
        return item;
      }
      const updated=improvementQueue.startTesting(id,baseline);
      toast(`TESTING開始 · Baseline ${baseline.count}件`);
      return updated;
    }
    if(item.status==='testing'){
      const result=evaluateExperiment(item,playtestEvents.forGame(item.gameId));
      if(!result.ready){
        toast(`Afterレビューを集めてください · ${result.afterCount}/3`);
        return item;
      }
      const updated=improvementQueue.complete(id,result);
      toast(`実験結果: ${experimentOutcomeLabel(result.outcome)}`);
      return updated;
    }
    const updated=improvementQueue.reset(id);
    toast('PLANNEDへ戻しました');
    return updated;
  }

  return{evaluation,advanceLabel,outcomeClass,resultSummary,advance};
}
