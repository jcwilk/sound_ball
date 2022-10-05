precision highp float;
uniform float graphWidth;
uniform float graphHeight;
uniform float graphX;
uniform float graphY;
uniform sampler2D prevState;
uniform float screenWidth;
uniform float screenHeight;
uniform float orbitsWidth;
uniform float orbitsHeight;
varying vec2 uv;

// Default - overridable by prepending a matching define
#ifndef MAX_ITERATIONS
#define MAX_ITERATIONS 100
#endif

const float COLOR_CYCLES = 3.;
// used for scaling iterations into colors

vec2 screenRegion;
vec2 graphXY;
vec2 graphScale;
vec2 graphResolution;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 valAt(vec2 coord) {
    vec2 screenRatio = (coord - graphXY) / graphResolution + vec2(0.5);
    if (screenRatio.x < 0. || screenRatio.y < 0. || screenRatio.x > 1. || screenRatio.y > 1.) {
        return vec2(0.);
    }

    vec4 prev = texture2D(prevState, screenRatio);
    return prev.xy;
}

float julia(vec2 orbit) {
    vec2 val;
    float sum = 0.;

    for(int i=0; i <= MAX_ITERATIONS; i++) {
        sum+=length(orbit);
        val = valAt(orbit);

        orbit = vec2(
            orbit.x*orbit.x - orbit.y*orbit.y + val.x,
            2.*orbit.x*orbit.y + val.y
        );
        if (abs(orbit.x) > 2. || abs(orbit.y) > 2.) return sum;
    }

    return sum;
}

void main() {
    graphXY = vec2(graphX, graphY);
    graphResolution = vec2(graphWidth, graphHeight);
    graphScale = graphResolution / vec2(screenWidth/orbitsWidth, screenHeight/orbitsHeight);


    // gl_FragColor = vec4(1.);
    // return;


    // These transformations can hypothetically happen in the vertex, but that means when you're running up against the
    // lower bounds of floats you'll get the edges wobbling back and forth as you zoom because the rounding errors are
    // happening during the plane interpolation step. Keeping the vertex ranging from -0.5 to 0.5 dodges that issue.
    vec2 start = graphXY + uv * graphResolution;
    float sum = julia(start);

    float scaled=log(float(sum))/log(float(MAX_ITERATIONS));
    gl_FragColor = vec4(
        hsv2rgb(
            vec3(
                mod(scaled, 1./COLOR_CYCLES) * COLOR_CYCLES,
                .2+scaled*1.5, // tops out at 1
                scaled*1.5
            )
        ), 1.0
    );
}
