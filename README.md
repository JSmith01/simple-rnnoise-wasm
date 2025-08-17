# RNNoise WebAssembly

To test locally, run `npm start`, then a browser should automatically open `http://localhost:8080/demo/`.


## API

The RNNoiseNode class is a custom WebAudioNode with additional `update(keepalive = true)` method,
that emits the recent VAD status in a `status` event `data` property. It could use `onstatus` callback instead.
It is also possible to get execution stats if calling `rnnoiseNode.update('stat')`. Please check the demo for more details.

RNNoiseNode has a static `register(audioContext)` method that registers the node to the given AudioContext and preloads
the wasm module and the audio worklet. The method has an optional `assetData` argument to provide a custom source
for the worklet and the wasm module as `[string | URL, Promise<WebAssembly.Module>]`. To prepare `assetData`, additional
helper `rnnoise_loadAssets(options: { scriptSrc?: string | URL, moduleSrc?: string | BufferSource })` is provided.


## Usage

```js
import { RNNoiseNode } from 'simple-rnnoise-wasm';

const ctx = new AudioContext();
ctx.resume();
await RNNoiseNode.register(ctx);

const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = context.createMediaStreamSource(stream);
const rnnoise = new RNNoiseNode(ctx);
rnnoise.connect(ctx.destination);
source.connect(rnnoise);

rnnoise.update();
rnnoise.onstatus = (e) => {
  console.log(e.data);
};
rnnoise.connect(ctx.destination);
rnnoise.update(false); // disable keepalive
```

## Building the WebAssembly (WASM) binary

This project includes a build.sh script that compiles rnnoise to WebAssembly (rnnoise.wasm) using Emscripten.

Output location:
- dist/rnnoise.wasm

Prerequisites:
- Emscripten SDK (emsdk) installed and activated so that emcc is available in your shell PATH.
- Alternatively, Docker can be used with the official emscripten/emsdk image.

### Quick commands
- Local toolchain (emsdk):
  - npm run build:wasm
- Using Docker (no local emsdk needed):
  - npm run build:wasm:docker


### Setup instructions

#### Windows
Option A — Git Bash + emsdk:
1. Install Git for Windows (includes Git Bash).
2. Install Emscripten SDK:
   - In Git Bash:
     - git clone https://github.com/emscripten-core/emsdk.git
     - cd emsdk
     - ./emsdk install latest
     - ./emsdk activate latest
     - source ./emsdk_env.sh
3. From the project root in the same Git Bash session:
   - npm run build:wasm

Option B — WSL (Ubuntu) + emsdk:
1. Install WSL and an Ubuntu distro.
2. In Ubuntu shell, install prerequisites (git, python3, cmake if needed), then follow the macOS/Linux steps below to install emsdk.
3. In the project directory mounted inside WSL, run:
   - npm run build:wasm

Option C — Docker Desktop:
1. Install Docker Desktop for Windows and ensure docker command works in your shell.
2. From Git Bash or PowerShell in the project root, run:
   - npm run build:wasm:docker

#### macOS
1. Install Emscripten SDK:
   - git clone https://github.com/emscripten-core/emsdk.git
   - cd emsdk
   - ./emsdk install latest
   - ./emsdk activate latest
   - source ./emsdk_env.sh
2. From the project root in the same terminal session:
   - npm run build:wasm

Alternatively with Docker (no emsdk install):
- npm run build:wasm:docker

#### Linux
1. Install Emscripten SDK:
   - git clone https://github.com/emscripten-core/emsdk.git
   - cd emsdk
   - ./emsdk install latest
   - ./emsdk activate latest
   - source ./emsdk_env.sh
2. From the project root in the same terminal session:
   - npm run build:wasm

Alternatively with Docker (no emsdk install):
- npm run build:wasm:docker

Notes:
- If your shell cannot find emcc, re-run the emsdk_env script (or open a new terminal) to refresh your PATH.
- On Windows cmd/PowerShell, npm scripts that invoke bash require Git Bash or WSL. Use the Docker variant if neither is available.
