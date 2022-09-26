import './index.css';
import { Resizer } from './resizer'
import { SoundController } from './sound_controller'
const REGL = require("regl");

const initialGraphX = 0;
const initialGraphY = 0;
const initialZoom = .4;

document.addEventListener('DOMContentLoaded', function () {
    const regl = REGL({
        //extensions: ['OES_texture_float'],
        // optionalExtensions: ['oes_texture_float_linear'],
    });

    SoundController.requestPermissions().then((soundController) => {
        const urlParams = new URLSearchParams(window.location.search);
        let graphX = initialGraphX;
        let graphY = initialGraphY;
        let graphZoom = initialZoom;

        const resizer = new Resizer(window, 2 / graphZoom);

        const draw = regl({
            frag: `
                // override default, see basic_julia.glsl
                #define MAX_ITERATIONS 120
            ` + require('./basic_julia.glsl'),

            vert: `
                precision highp float;
                attribute vec2 position;
                varying vec2 uv;
                void main() {
                    uv = position / 2.;
                    gl_Position = vec4(position, 0, 1);
                }
            `,

            attributes: {
                position: regl.buffer([
                    [-1, -1],
                    [1, -1],
                    [-1, 1],
                    [1, 1]
                ])
            },

            uniforms: {
                graphWidth: (context, props) => (props as any).graphWidth,
                graphHeight: (context, props) => (props as any).graphHeight,
                graphX: (context, props) => (props as any).graphX,
                graphY: (context, props) => (props as any).graphY,
                juliaX: (context, props) => (props as any).juliaX,
                juliaY: (context, props) => (props as any).juliaY,
            },

            depth: { enable: false },

            count: 4,

            primitive: 'triangle strip'
        })

        //let seenFocus = false;
        let lastTime = performance.now();
        let threshold = 150.;
        let lastFreqPercent = 0.066;
        regl.frame(() => {
            const thisTime = performance.now();

            // dTime always assumes between 1 and 144 fps
            const dTime = Math.min(1000, Math.max(1000 / 144, thisTime - lastTime)) / 1000.;

            lastTime = thisTime;

            soundController.update(dTime)
            const freqPercent = (soundController.spikeRatio - 0.05)*20. // scaled roughly from 0 to 1
            const volume = (soundController.currentMax / 255.)
            const juliaX = Math.cos(freqPercent * Math.PI) * (volume + 0.5);
            const juliaY = Math.sin(freqPercent * Math.PI) * (volume + 0.5);

            //const tempThreshold = currentMax * 0.6;
            //const diff = tempThreshold - threshold;
            //threshold = threshold + diff * 0.00001;

            //fftBuffer.subdata(frequencies)

            //debugger

            //drawSpectrum()

            // It burns a lot of juice running this thing so cool it while it's not in the very foreground
            // if (document.hasFocus() && document.visibilityState == "visible") {
            //     seenFocus = true;
            // } else if (seenFocus) {
            //     // only skip rendering if focus has been confirmed at least once
            //     return;
            // }

            draw({
                graphWidth: resizer.graphWidth,
                graphHeight: resizer.graphHeight,
                graphX: graphX,
                //graphX: freqPercent*12.-0.5,
                //graphX: Math.max(...frequencies)/255.,
                graphY: graphY,
                juliaX: juliaX,
                juliaY: juliaY

            })
        })
    })
}, false);
