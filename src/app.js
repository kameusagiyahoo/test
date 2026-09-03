import {createAppState} from './app/state.js';
import {createAppRuntime} from './app/runtime.js';

const APP_VERSION='8.32.16';

const runtime=createAppRuntime({
  state:createAppState(),
  app:document.querySelector('#app'),
  badge:document.querySelector('#sessionBadge'),
  homeButton:document.querySelector('#homeButton'),
  toastElement:document.querySelector('#toast'),
  appVersion:APP_VERSION
});

runtime.start();
