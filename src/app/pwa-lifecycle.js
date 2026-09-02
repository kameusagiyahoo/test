import {registerPWA,watchConnectivity,watchInstallPrompt} from '../core/pwa.js';

export function startPwaLifecycle({homeScreen}){
  watchInstallPrompt(ready=>homeScreen?.setInstallReady(ready));
  watchConnectivity(()=>homeScreen?.refreshIfVisible());
  registerPWA(registration=>homeScreen?.setUpdateRegistration(registration));
  navigator.serviceWorker?.addEventListener?.('controllerchange',()=>location.reload());
}
