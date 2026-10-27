/* The smart coach's model runs here, off the page's thread, so the app stays smooth
   while it thinks (WebLLM's own worker handler: js/engine/llm.js talks to it). */
import {WebWorkerMLCEngineHandler} from "./web-llm.js";
var handler=new WebWorkerMLCEngineHandler();
self.onmessage=function(msg){handler.onmessage(msg);};
