let instance, heapFloat32;

class RNNoiseAudioWorklet extends AudioWorkletProcessor {
    constructor(options) {
        super({
            ...options,
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1]
        });
        if (!instance)
            heapFloat32 = new Float32Array((instance = new WebAssembly.Instance(options.processorOptions.module).exports).memory.buffer);
        this.state = instance.newState();
        this.alive = true;
        this.statSize = Math.ceil(sampleRate / 128);
        this.stat = new Float32Array(2 * this.statSize); //1s
        this.statPtr = 0;
        this.ts = 0;
        this.port.onmessage = ({ data: keepalive }) => {
            if (this.alive) {
                if (keepalive) {
                    const message = { vadProb: instance.getVadProb(this.state) };
                    if (keepalive === 'stat') {
                        message.stat = this.stat;
                    }

                    this.port.postMessage(message);
                } else {
                    this.alive = false;
                    instance.deleteState(this.state);
                }
            }
        };
    }

    process(input, output) {
        if (!this.alive) return false;

        const ts = Date.now();

        heapFloat32.set(input[0][0], instance.getInput(this.state) / 4);
        const o = output[0][0];
        const ptr4 = instance.pipe(this.state, o.length) / 4;

        if (ptr4) {
            o.set(heapFloat32.subarray(ptr4, ptr4 + o.length));
        }

        if (this.ts !== 0) {
            this.stat[this.statPtr] = ts - this.ts;
            this.stat[this.statPtr + this.statSize] = Date.now() - this.ts;
            this.statPtr = (this.statPtr + 1) % this.statSize;
        }
        this.ts = ts;

        return true;
    }
}

registerProcessor("rnnoise", RNNoiseAudioWorklet);
