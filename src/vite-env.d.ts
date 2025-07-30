/// <reference types="vite/client" />

declare module "*.wasm?url" {
  const url: string;
  export default url;
}

declare module "*.wasm?init" {
  const initWasm: (
    module?: WebAssembly.Module,
  ) => Promise<WebAssembly.Instance>;
  export default initWasm;
}
