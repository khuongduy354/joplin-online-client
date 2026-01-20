// Stub for http/https modules in browser environment

export default {
  request: () => {
    throw new Error("HTTP module not supported in browser - use fetch instead");
  },
  get: () => {
    throw new Error("HTTP module not supported in browser - use fetch instead");
  },
  createServer: () => {
    throw new Error("HTTP server not supported in browser");
  },
  Agent: class {
    constructor() {
      // No-op agent for browser
    }
  },
  globalAgent: {},
};

export const request = () => {
  throw new Error("HTTP module not supported in browser - use fetch instead");
};

export const get = () => {
  throw new Error("HTTP module not supported in browser - use fetch instead");
};

export const Agent = class {
  constructor() {
    // No-op agent for browser
  }
};

export const globalAgent = {};
