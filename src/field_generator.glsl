precision highp float;
uniform sampler2D prevState;
uniform float spikeRatio;
varying vec2 uv;

void main() {
    // TODO - make the js pass in a value that doesn't need to be scaled 200x
    // TODO - start spikeRatio at a more reasonable value so it doesn't spin like crazy at the beginning
    vec2 offset = vec2(cos(spikeRatio*200.),sin(spikeRatio*200.)) * 0.1;
    vec2 textureCoord = uv + 0.5; // [0, 1]
    if (length(uv-offset) < 0.03) {
        gl_FragColor = vec4(1.);
        return;
    }

    vec2 sourceTextureCoord = uv * 0.995 + 0.5;
    vec4 source = texture2D(prevState, sourceTextureCoord);
    gl_FragColor = source;
}
