/**
 * Prepare the assets for the RNNoise processor
 *
 * @param {string|URL} [scriptSrc]
 * @param {string|BufferSource} [moduleSrc]
 * @returns {[string|URL, Promise<WebAssembly.Module>]}
 */
function rnnoise_loadAssets({ scriptSrc, moduleSrc } = {}) {
    const { origin, pathname } = window.document.location;
    const base = origin + pathname.substring(0, pathname.lastIndexOf('/') + 1);
    scriptSrc = scriptSrc || base + 'rnnoise.worklet.js';
    moduleSrc = moduleSrc || base + 'rnnoise.wasm';
    const module = typeof moduleSrc == 'string' ? WebAssembly.compileStreaming(fetch(moduleSrc)) : WebAssembly.compile(moduleSrc);

    return [scriptSrc, module];
}

class RNNoiseNode extends AudioWorkletNode {
    /**
     * Register the RNNoise processor with the AudioContext
     *
     * @param context
     * @param {[string|URL, Promise<WebAssembly.Module>]} [assetData]
     * @returns {Promise<void>}
     */
    static async register(context, assetData) {
        if (RNNoiseNode.ready) {
            return context.audioWorklet.addModule(RNNoiseNode.scriptSrc);
        }

        assetData = assetData || await rnnoise_loadAssets();
        let [scriptSrc, module] = assetData;
        RNNoiseNode.scriptSrc = scriptSrc;

        return Promise.all([
            context.audioWorklet.addModule(scriptSrc),
            module.then(m => { this.module = m; })
        ]).then(() => { this.ready = true; });
    }

    /**
     * @type {null | WebAssembly.Module}
     */
    static module = null;

    /**
     * @type {null | string | URL}
     */
    static scriptSrc = null;

    static ready = false;

    /**
     * @type {function(Event):void | null}
     */
    onstatus = null;

    /**
     * @param {AudioContext} context
     */
    constructor(context) {
        if (!RNNoiseNode.ready) throw new Error('Call RNNoiseNode.register() first');

        super(context, 'rnnoise', {
            channelCountMode: 'explicit',
            channelCount: 1,
            channelInterpretation: 'speakers',
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
            processorOptions: {
                module: RNNoiseNode.module
            }
        });

        this.port.onmessage = ({ data }) => {
            const e = Object.assign(new Event('status'), data);
            this.dispatchEvent(e);
            if (this.onstatus)
                this.onstatus(e);
        };
    }

    /**
     * Update the VAD probability, if keepalive is false, the processor will be terminated
     *
     * @param {boolean} [keepalive]
     */
    update(keepalive= true) { this.port.postMessage(keepalive); }
}

export { RNNoiseNode, rnnoise_loadAssets };
