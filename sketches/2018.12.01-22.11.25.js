let canvasSketch = require('canvas-sketch')
let create_regl = require('regl')
let seed = require('seed-random')
let mat4 = require('gl-mat4')

let settings = {
    context: 'webgl',
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}

let sketch = ({ gl }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*1000)


    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let vlerp = (v0, v1, t) => [lerp(v0[0], v1[0], t), lerp(v0[1], v1[1], t)]
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))
    let col = (h=0, s=0, l=0, a=1) => `hsla(${h*360}, ${s*100}%, ${l*100}%, ${a})`
    let rand = seed(seed_value)

    let regl = create_regl({ gl })
    let draw_triangle = regl({
        frag: `
        precision mediump float;

        #define PI 3.14159265359
        #define TAU 6.28

        uniform float u_playhead;
        uniform vec2 u_resolution;

        float map(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            // vec3 fill = vec3(sin(u_time/1000.0*PI)*0.85);
            // vec2 st = gl_FragCoord.xy/u_resolution.xy;

            float t = sin(u_playhead*PI);
            // vec3 fill = vec3(vec2(0.85, 0.85)*t, 0.85*t);
            vec3 fill = vec3(0.25);
            gl_FragColor = vec4(fill, 1);
        }`,
        vert: `
        precision mediump float;
        #define PI 3.14159265359
        #define TAU 6.28

        uniform mat4 u_projection;
        uniform mat4 u_view;
        uniform mat4 u_matrix;

        uniform float u_playhead;
        uniform vec2 u_resolution;
        uniform float u_scale;
        // uniform vec2 u_offset;

        attribute vec3 position;

        float map(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            // float s = map(sin(u_playhead*PI), 0.0, 1.0, 0.25, 0.75);
            float s = 0.05;
            gl_Position = u_projection*u_view*vec4(
                u_matrix*vec4(position, 1));
        }`,

        attributes: {
            position: [
                [-1, -1, +0],
                [-1, +1, -0],
                [+1, +1, +0],

                [-1, -1, +0],
                [+1, +1, -0],
                [+1, -1, +0]
            ]
        },

        uniforms: {
            u_view: (_, props) => {
                let t = props.playhead*PI
                /*
                    [5*Math.cos(t), 10*Math.sin(t), 5*Math.sin(t)],
                */
                return mat4.lookAt([],
                    [0.0, 0.0, 1.0],
                    [0.0, 0.0, 0.0],
                    [0.0, 1.0, 0.0]
                )
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2,
                    viewportWidth/viewportHeight,
                    0.01,
                    50)
            },
            u_matrix: regl.prop('u_matrix'),
            u_playhead: regl.prop('u_playhead'),
            u_resolution: regl.prop('u_resolution'),
            // u_offset: regl.prop('u_offset'),
        },

        primitive: 'triangles',
        count: 6
    })

    let stale = Array(30)
        .fill(0)
        .map((v) => {
            return map(rand(), 0, 1, 0.05, 0.95)
        })

    let scale = Array(30)
        .fill(0)
        .map((v) => {
            return map(rand(), 0, 1, 0.05, 0.5)
        })

    return ({ width, height, playhead }) => {

        regl.poll()
        regl.clear({color: [1, 1, 1, 1], depth: 1})
        let tris = Array(30)
            .fill({})
            .map((v, i, a) => {
                return {
                    playhead: playhead,
                    u_playhead: playhead,
                    u_resolution: [width, height],
                    u_matrix: mat4.rotate([],
                        mat4.translate([],
                            mat4.scale([],
                                mat4.identity([]),
                                [scale[i], scale[i], scale[i]]
                            ),
                            [
                                stale[i]*i-Math.floor((a.length-1)/2),
                                (i/(a.length-1)*2)-1,
                                0
                            ]
                        ),
                        playhead*PI,
                        [
                            1.0,
                            1.0,
                            0
                        ]
                    )
                }
            })
        draw_triangle(tris)

    }
}

canvasSketch(sketch, settings)

