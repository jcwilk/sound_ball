import './index.css';
import { Resizer } from './resizer'
import { SoundController } from './sound_controller'
import { Framebuffer2D } from 'regl'
const REGL = require("regl");

const initialGraphX = 0;
const initialGraphY = 0;
const initialZoom = .4;

let dataBuffers: Array<Framebuffer2D>;

const INITIAL_RADIUS = 512;
const MAX_RADIUS = 4096;
let orbitsWidth = INITIAL_RADIUS;
let orbitsHeight = INITIAL_RADIUS;



document.addEventListener('DOMContentLoaded', function () {
    const regl = REGL({
        extensions: ['OES_texture_float'],
        // optionalExtensions: ['oes_texture_float_linear'],
    });

    dataBuffers = (Array(2)).fill(0).map(() =>
        regl.framebuffer({
            color: regl.texture({
                width: orbitsWidth,
                height: orbitsHeight,
                wrap: 'repeat',

                // note that firefox and mobile refused to run it with just 'rgb'
                format: 'rgba', // there's room to add a whole extra channel here wew!
                type: 'float',

                // These two are nice when there's not a 1:1 between the orbit texture and the render texture.
                // However, since we're carefully maintaining that ratio these are no longer useful.
                // mag: 'linear',
                // min: 'linear'
            }),
            depthStencil: false
        })
    )

    SoundController.requestPermissions().then((soundController) => {
        const urlParams = new URLSearchParams(window.location.search);
        let graphX = initialGraphX;
        let graphY = initialGraphY;
        let graphZoom = initialZoom;
        let resetBuffer = false;

        const resizer = new Resizer(window, 2 / graphZoom);

        const onResize = () => {
            // these need to be a power of two and should only ever be resized upwards
            if ((resizer.screenWidth > orbitsWidth && orbitsWidth < MAX_RADIUS) || (resizer.screenHeight > orbitsHeight && orbitsHeight < MAX_RADIUS)) {
                while (resizer.screenWidth > orbitsWidth && orbitsWidth < MAX_RADIUS) {
                    orbitsWidth *= 2
                }
                while (resizer.screenHeight > orbitsHeight && orbitsHeight < MAX_RADIUS) {
                    orbitsHeight *= 2
                }

                dataBuffers[0].resize(orbitsWidth, orbitsHeight);
                dataBuffers[1].resize(orbitsWidth, orbitsHeight);

                //console.log(`resizing to ${orbitsWidth}x${orbitsHeight}`);
            }

            resetBuffer = true;
        }
        onResize();
        resizer.onResize = onResize;

        const update = regl({
            frag: require('./field_generator.glsl'),

            vert: `
                precision highp float;
                attribute vec2 position;
                varying vec2 uv;
                void main() {
                    uv = position / 2.;
                    gl_Position = vec4(position, 0, 1);
                }
            `,

            framebuffer: ({ tick }, props) => (props as any).dataBuffers[(tick + 1) % 2],

            uniforms: {
                prevState: ({ tick }, props) => (props as any).dataBuffers[tick % 2],
                spikeRatio: (context, props) => (props as any).spikeRatio
            }
        })

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
                prevState: ({ tick }, props) => (props as any).dataBuffers[(tick + 1) % 2],
                graphWidth: (context, props) => (props as any).graphWidth,
                graphHeight: (context, props) => (props as any).graphHeight,
                graphX: (context, props) => (props as any).graphX,
                graphY: (context, props) => (props as any).graphY,
                screenWidth: (context, props) => (props as any).screenWidth,
                screenHeight: (context, props) => (props as any).screenHeight,
                orbitsWidth: (context, props) => (props as any).orbitsWidth,
                orbitsHeight: (context, props) => (props as any).orbitsHeight,
                resetBuffer: (context, props) => (props as any).resetBuffer,
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
                graphY: graphY,
                dataBuffers: dataBuffers,
                resetBuffer: resetBuffer,
                screenWidth: resizer.screenWidth,
                screenHeight: resizer.screenHeight,
                orbitsWidth: orbitsWidth,
                orbitsHeight: orbitsHeight

            }, () => {
                update({
                    dataBuffers: dataBuffers,
                    spikeRatio: soundController.spikeRatio
                })

                regl.draw()
            })
        })
    })
}, false);
