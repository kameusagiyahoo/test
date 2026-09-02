export function createShellUi({
  badge,
  toastElement,
  session
}){
  function toast(text){
    toastElement.textContent=text;
    toastElement.classList.add('show');
    clearTimeout(toast.t);
    toast.t=setTimeout(()=>toastElement.classList.remove('show'),1500);
  }

  function updateBadge(text){
    badge.textContent=text||`${session.players.length}人`;
  }

  return{toast,updateBadge};
}
