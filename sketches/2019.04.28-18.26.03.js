let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let Tone = require('tone')
let load = require('load-asset')
let create_regl = require('regl')
let plane_make = require('primitive-plane')
let hsluv = require('hsluv')
let seed = require('seed-random')
let mat4 = require('gl-mat4')
let vec3 = require('gl-vec3')

let settings = {
    context: 'webgl',
    animate: true,
    duration: 8,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}

let sketch = ({ gl, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))

    let seed_value = Math.floor(Math.random()*1000)
    let rand = seed(seed_value)
    let simplex = new SimplexNoise(seed_value)

    let regl = create_regl({
        gl,
        extensions: ['webgl_draw_buffers', 'oes_texture_float']
    })

    let pane = plane_make(1, 1, 8, 8)

    let bgc = hsluv.hsluvToRgb([0, 0, rand()*100])

    // @NOTE(Grey): reference
    // https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
    let viewport_draw = regl({
        frag: `
        precision mediump float;
        #define PI 3.141592653589793
        uniform float u_time;
        uniform vec3 u_random;
        uniform vec2 u_resolution;

        varying vec2 v_uv;

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233)))*43758.5453123);
        }

        float noise (vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);

            float a = random(i);
            float b = random(i+vec2(1.0, 0.0));
            float c = random(i+vec2(0.0, 1.0));
            float d = random(i+vec2(1.0, 1.0));

            vec2 u = f*f*(3.0-2.0*f);

            return mix(a, b, u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
        }

        mat2 rotate2d(float angle) {
            return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        }

        float lines(vec2 pos, float b) {
            float scale = 5.0;
            pos *= scale;
            return smoothstep(
                0.0,
                0.5+b*0.5,
                abs((sin(pos.x*3.1415)+b*2.0))*0.5
            );
        }

        void main() {
            vec3 rand = u_random;

            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            st.y *= u_resolution.y/u_resolution.x;

            vec2 pos = st.yx*vec2(10.0, 3.0);
            float pattern = pos.x;

            pos = rotate2d(noise(pos+vec2(rand.xy*(rand.z*128.0)))*sin(u_time*PI*2.0)+rand.z)*pos;
            pattern = lines(rotate2d(u_time*PI*2.0)*pos, 0.5);

            // vec2 pos = vec2(st)+vec2(u_random.xy);
            // pos.x *= sin(u_time*PI*2.0);
            // pos.y *= cos(u_time*PI*2.0);
            // float n = noise(pos);

            gl_FragColor = vec4(vec3(pattern), 1.0);
        }`,
        vert: `
        precision mediump float;
        #define PI 3.141592653589793
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position;
        attribute vec2 a_uv;

        uniform float u_time;
        uniform vec3 u_random;

        varying vec2 v_uv;

        void main() {
            vec2 uv = a_uv;
            uv.xy += u_time;
            v_uv = fract(uv);
            gl_Position = u_projection*u_view*u_matrix*vec4(a_position, 1.0);
        }`,

        attributes: {
            a_position: pane.positions,
            a_uv: pane.uvs
        },

        elements: pane.cells,

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0  , 0  , 0.5], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_time: regl.prop('u_time'),
            u_matrix: regl.prop('u_matrix'),
            u_random: regl.prop('u_random'),
            u_resolution: regl.prop('u_resolution')
        },
        blend: {
            enable: true,
            func: {
                srcRGB:   'src alpha',
                srcAlpha: 'src alpha',
                dstRGB:   'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        },
        primitive: 'triangles'
    })

    let viewport_element = {
        u_matrix: mat4.translate([], mat4.identity([]), [0, 0, 0]),
        u_random: [rand(), rand(), rand()],
        u_resolution: [width, height]
    }

    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [...bgc, 1], depth: 1})

        viewport_element.u_time = playhead
        viewport_draw([ viewport_element ])
    }
}

canvasSketch(sketch, settings)

