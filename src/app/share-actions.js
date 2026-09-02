import {listGames} from '../core/registry.js';
import {
  partyShareModel,
  profileShareModel,
  renderPartyShareSvg,
  renderProfileShareSvg,
  shareCardFilename,
  shareSvgCard
} from '../core/share-card.js';

export function gameNameMap(){
  return Object.fromEntries(listGames().map(game=>[game.id,game.title]));
}

export function createShareActions({toast}){
  async function sharePartyCard(entry){
    if(!entry)return toast('共有できるParty結果がありません');
    try{
      const model=partyShareModel(entry,{gameNames:gameNameMap()});
      const svg=renderPartyShareSvg(model);
      const label=entry.winners?.length
        ?entry.winners.map(index=>entry.players[index]).filter(Boolean).join('-')
        :'party';
      const result=await shareSvgCard(svg,{
        filename:shareCardFilename('party',label),
        title:'Party Pocket · Party Result'
      });
      if(result==='downloaded')toast('結果画像を保存しました');
    }catch(error){
      toast(error?.message||'画像を共有できませんでした');
    }
  }

  async function shareProfileCard(profile,achievements=[]){
    if(!profile)return toast('共有できるプロフィールがありません');
    try{
      const model=profileShareModel(profile,{gameNames:gameNameMap(),achievements});
      const svg=renderProfileShareSvg(model);
      const result=await shareSvgCard(svg,{
        filename:shareCardFilename('profile',profile.name),
        title:'Party Pocket · Player Profile'
      });
      if(result==='downloaded')toast('プロフィール画像を保存しました');
    }catch(error){
      toast(error?.message||'画像を共有できませんでした');
    }
  }

  return{sharePartyCard,shareProfileCard};
}
