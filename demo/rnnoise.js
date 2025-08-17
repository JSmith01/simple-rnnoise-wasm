import { RNNoiseNode, rnnoise_loadAssets } from "../dist/rnnoise.mjs";

const inputEl = document.getElementById("input");
const outputEl = document.getElementById("output");
const startEl = document.getElementById("start");
const stopEl = document.getElementById("stop");
const vadProbEl = document.getElementById("vadProb");

const hasSink = 'setSinkId' in Audio.prototype;

const AUDIO_CONSTRAINTS = {
    channelCount: { ideal: 1 },
    noiseSuppression: { ideal: false },
    echoCancellation: { ideal: true },
    autoGainControl: { ideal: false },
    sampleRate: { ideal: 48000 }
};

async function populateDevices() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => { t.stop() });

    const devices = await navigator.mediaDevices.enumerateDevices();
    inputEl.disabled = false;

    if (hasSink) {
        outputEl.disabled = false;
    } else {
        devices.push({
            kind: 'audiooutput',
            label: 'Default'
        });
    }

    devices.filter(d => d.kind.startsWith('audio'))
        .forEach(d => {
            (d.kind === 'audioinput'  ? inputEl : outputEl).appendChild(
                Object.assign(document.createElement("option"), {
                    value: d.deviceId,
                    textContent: d.label
                })
            );
    });
}

async function run(){
    startEl.disabled = true;
    outputEl.disabled = true;
    inputEl.disabled = true;

    const context = new AudioContext({ sampleRate: 48000 });
    let rnnoise, source, stream, destination, audioNode, timer, rafId;

    function cleanup() {
        if (rnnoise) {
            rnnoise.update(false);
            rnnoise.disconnect();
            rnnoise.onstatus = null;
        }
        source?.disconnect();
        if (destination) {
            destination.disconnect();
            destination.stream.getTracks().forEach(t => t.stop());
        }
        audioNode?.pause();
        clearInterval(timer);
        cancelAnimationFrame(rafId);
        context.close();
        startEl.disabled = false;
        outputEl.disabled = false;
        inputEl.disabled = false;
        stopEl.disabled = true;
        vadProbEl.style.width = "0%";
        stream.getTracks().forEach(t => t.stop());
    }

    stopEl.onclick = cleanup;
    stopEl.disabled = false;

    try {
        destination = hasSink ? new MediaStreamAudioDestinationNode(context, {
            channelCountMode: "explicit",
            channelCount: 1,
            channelInterpretation: "speakers"
        }) : context.destination;

        if (hasSink) {
            audioNode = new Audio();
            audioNode.srcObject = destination.stream;
            audioNode.setSinkId(outputEl.value);
            audioNode.play();
        }

        const streamPromise = navigator.mediaDevices.getUserMedia({
            audio: { ...AUDIO_CONSTRAINTS, deviceId: { exact: inputEl.value } }
        });

        const rnnoiseRegisterPromise = RNNoiseNode.register(
            context,
            rnnoise_loadAssets({
                moduleSrc: "../dist/rnnoise.wasm",
                scriptSrc: "../dist/rnnoise.worklet.js"
            })
        );

        [stream] = await Promise.all([
                streamPromise,
                rnnoiseRegisterPromise
            ]);
        source = context.createMediaStreamSource(stream);
        rnnoise = new RNNoiseNode(context);

        rnnoise.connect(destination);
        source.connect(rnnoise);
        rnnoise.onstatus = data => {
            vadProbEl.style.width = data.vadProb * 100 + "%";
            if (data.stat) {
                const startData = data.stat.slice(0, data.stat.length / 2);
                const procData = data.stat.slice(data.stat.length / 2);
                console.debug(startData, procData);
                const start = getStats(startData);
                const proc = getStats(procData);
                console.log(`Average start: ${start.avg}ms, proc: ${proc.avg}ms`);
                console.log(`Max start: ${start.max}ms, proc: ${proc.max}ms`);
            }
        };

        timer = setInterval(() => {
            rnnoise.update('stat');
        }, 1000);

        function updateVad() {
            rnnoise.update();
            rafId = requestAnimationFrame(updateVad);
        }
        updateVad();
    } catch (e) {
        context.close();
        console.error(e);
    }
}

populateDevices().then(() => {
    startEl.onclick = run;
    startEl.disabled = false;
});


function movingAverage(a, n) {
    const output = structuredClone(a);
    let sum = a[0] * n;
    for (let i = 0; i < output.length; i++) {
        sum += a[i] - (i < n ? a[0] : a[i - n]);
        output[i] = sum / n;
    }

    return output;
}

function getStats(a) {
    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < a.length; i++) {
        const v = a[i];
        min = Math.min(min, v);
        max = Math.max(max, v);
        sum += v;
    }

    return { min, max, sum, avg: sum / a.length, top5: Object.fromEntries(topNfrequentValues(a)) };
}

function topNfrequentValues(a, n = 5, othersKey = "@others") {
    const freqs = new Map();
    for (const v of a) {
        freqs.set(v, (freqs.get(v) ?? 0) + 1);
    }

    const sorted = Array.from(freqs.entries()).sort((a, b) => b[1] - a[1]);

    const topN = sorted.slice(0, n);
    const others = sorted.slice(n).reduce((acc, [k, v]) => acc + v, 0);

    return others > 0 && othersKey ? topN.concat([[othersKey, others]]) : topN;
}
