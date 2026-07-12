import { registerHooks } from "node:module";

const replacement = new URL("./externally-blocked-host-client.mjs", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith("/lib/long-task-host-client.js") || specifier === "../lib/long-task-host-client.js") {
      return { url: replacement, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
});
