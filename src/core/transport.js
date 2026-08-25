export class LocalTransport{
  constructor(){this.listeners=new Map();this.kind='local'}
  connect(){return Promise.resolve()}
  disconnect(){this.listeners.clear()}
  subscribe(type,handler){
    if(!this.listeners.has(type))this.listeners.set(type,new Set());
    this.listeners.get(type).add(handler);
    return()=>this.listeners.get(type)?.delete(handler);
  }
  publish(type,payload){for(const fn of this.listeners.get(type)||[])fn(structuredClone(payload))}
}

export function createLocalTransport(){return new LocalTransport()}

/*
Future remote adapter contract:
- connect({roomCode,playerId})
- disconnect()
- subscribe(eventType, handler)
- publish(eventType, payload)
A Cloudflare Durable Object + WebSocket adapter can implement this interface
without changing the game modules or SessionStore API.
*/
