export function playwrightWorkerThreadAdapterSourceV1(): string {
  return String.raw`"use strict";
const childProcess=require("node:child_process");
const {EventEmitter}=require("node:events");
const {Worker}=require("node:worker_threads");
const marker=Symbol.for("ty-context.playwright-worker-thread-adapter.v1");
if(!globalThis[marker]){
  if(process.env.TY_CONTEXT_PLAYWRIGHT_WORKER_THREADS!=="1")throw new Error("playwright_worker_adapter_not_authorized");
  const bootstrap=String.raw` + "`" + String.raw`"use strict";
const {parentPort,workerData}=require("node:worker_threads");
if(!parentPort)throw new Error("fork_worker_parent_port_missing");
Object.defineProperty(process,"send",{configurable:true,value(message,callback){parentPort.postMessage(message);if(typeof callback==="function")queueMicrotask(()=>callback(null));return true;}});
Object.defineProperty(process,"connected",{configurable:true,get(){return true;}});
process.disconnect=()=>process.emit("disconnect");
const pending=[];let loaded=false;
parentPort.on("message",message=>{if(loaded)process.emit("message",message);else pending.push(message);});
import(require("node:url").pathToFileURL(workerData.entry).href).then(()=>{loaded=true;for(const message of pending)process.emit("message",message);pending.length=0;}).catch(error=>{setImmediate(()=>{throw error;});});` + "`" + String.raw`;
  class ThreadFork extends EventEmitter{
    constructor(entry,options){
      super();
      const pipeAll=options?.stdio==="pipe";
      const pipeOut=pipeAll||options?.stdio?.[1]==="pipe";
      const pipeErr=pipeAll||options?.stdio?.[2]==="pipe";
      this.connected=true;
      this.pid=undefined;
      this.exitCode=null;
      this.signalCode=null;
      this.worker=new Worker(bootstrap,{eval:true,workerData:{entry},env:options?.env,stdout:pipeOut,stderr:pipeErr});
      this.stdout=pipeOut?this.worker.stdout:null;
      this.stderr=pipeErr?this.worker.stderr:null;
      this.stdin=null;
      this.worker.on("message",message=>this.emit("message",message));
      this.worker.on("error",error=>this.emit("error",error));
      this.worker.on("exit",code=>{this.connected=false;this.exitCode=code;this.emit("exit",code,null);this.emit("close",code,null);});
    }
    send(message,sendHandle,options,callback){
      const done=typeof sendHandle==="function"?sendHandle:typeof options==="function"?options:callback;
      try{this.worker.postMessage(message);if(done)queueMicrotask(()=>done(null));return true;}catch(error){if(done)queueMicrotask(()=>done(error));else this.emit("error",error);return false;}
    }
    disconnect(){this.connected=false;this.emit("disconnect");}
    kill(signal){this.signalCode=signal??"SIGTERM";void this.worker.terminate();return true;}
    ref(){this.worker.ref();return this;}
    unref(){this.worker.unref();return this;}
  }
  childProcess.fork=function(entry,args,options){
    if(Array.isArray(args)&&args.length)throw new Error("fork_worker_argv_unsupported");
    const resolvedOptions=Array.isArray(args)?options:args;
    return new ThreadFork(entry,resolvedOptions??{});
  };
  require("node:module").syncBuiltinESMExports();
  Object.defineProperty(globalThis,marker,{value:true});
}
`;
}
