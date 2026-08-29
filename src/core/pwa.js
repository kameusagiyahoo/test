let deferredPrompt=null;

export function isStandalone(){
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone===true
  );
}

export function isIOS(){
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent||'');
}

export function isOnline(){
  return window.navigator.onLine!==false;
}

export async function registerPWA(onUpdate){
  if(!('serviceWorker' in navigator))return null;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
    registration.update().catch(()=>{});

    if(registration.waiting)onUpdate?.(registration);
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller)onUpdate?.(registration);
      });
    });
    return registration;
  }catch{
    return null;
  }
}

export function watchInstallPrompt(callback){
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    callback?.(true);
  });
  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    callback?.(false);
  });
}

export async function requestInstall(){
  if(!deferredPrompt)return false;
  const prompt=deferredPrompt;
  deferredPrompt=null;
  await prompt.prompt();
  const result=await prompt.userChoice;
  return result?.outcome==='accepted';
}

export function canPromptInstall(){return Boolean(deferredPrompt)}

export function watchConnectivity(callback){
  const emit=()=>callback?.(isOnline());
  window.addEventListener('online',emit);
  window.addEventListener('offline',emit);
  return()=>{
    window.removeEventListener('online',emit);
    window.removeEventListener('offline',emit);
  };
}
