precision highp float;

#define SPIKE_SIZE 0.03
#define MAX_SPIKES 20
#define SPIN_RADIUS 0.045

uniform sampler2D prevState;
uniform vec2 spikes[MAX_SPIKES];
uniform int spikesCount;
varying vec2 uv;

void main() {
    // TODO - start spikeRatio at a more reasonable value so it doesn't spin like crazy at the beginning

    vec2 sourceTextureCoord = uv * 0.995 + 0.5;
    vec4 source = texture2D(prevState, sourceTextureCoord);

    for(int i=0; i < MAX_SPIKES; i++) {
        if (i >= spikesCount) break;

        vec2 spike = spikes[i];
        float frequencyRadians = spike.x * 3.1415296 * 2. * 8.;
        float magnitudeRatio = spike.y;

        vec2 offset = vec2(cos(frequencyRadians),sin(frequencyRadians)) * SPIN_RADIUS;
        vec2 diff = uv-offset;
        float len = length(diff);

        if (len < SPIKE_SIZE) {
            float boost = (SPIKE_SIZE - len)/SPIKE_SIZE;
            boost*=boost*0.3; //influence
            source+=vec4(vec2(boost),0.,0.);
        }
    }

    gl_FragColor = source;
}
