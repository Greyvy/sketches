let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let load = require('load-asset')
let create_regl = require('regl')
let seed = require('seed-random')
let mat4 = require('gl-mat4')

let settings = {
    context: 'webgl',
    animate: true,
    duration: 6,
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

    let regl = create_regl({ gl })

    let n = 240
    let draw_strip = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform vec3 u_color;
        uniform float u_time, u_offset, u_phase;

        void main() {
            vec3 col = u_color;
            gl_FragColor = vec4(col, 1.0);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time, u_offset, u_phase;
        uniform vec3 u_random;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_offset;

        void main() {
            vec3 off = a_offset;
            vec3 ran = u_random;
            vec3 pos = a_position;
            float t = sin(u_time*PI*2.0);
            pos+=sin(u_time*t*u_phase)*off*(cos(t*PI*2.0)*2.0);
            pos+=sin(t*cos(t*PI)*u_phase)*ran*0.85;
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: Array(n)
                .fill([])
                .map((_, i, a) => {
                    let s = 0.25
                    let angle = (i/(a.length-1))*TAU
                    let x = map(i/(a.length-1), 0, 1, -s, s)
                    let y = i%2 === 0 ? s : -s
                    let z = map(i/(a.length-1), 0, 1, -s, s)
                    return [ x, y, z ]
                }),
            a_offset: Array(n)
                .fill(0)
                .map((_, i, a) => {
                    let t = map(i/(a.length-1), 0, 1, -0.0125, 0.0125)
                    let x = simplex.noise2D(t*t, i*t)
                    let y = simplex.noise3D(t*t, i*t, t+32)
                    let z = simplex.noise4D(t*t, i*t, t+32, t*i+32)
                    return [x, y, z]
                })
        },

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0.0, 0.0, 8.0], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_matrix: (_, props) => {
                let { t, u_random, u_time } = props
                let tra = mat4.translate([], mat4.identity([]), u_random)
                let sca = mat4.scale([], tra, [1, 1, 1])
                let mat = mat4.rotate([], sca, u_time*TAU, u_random)
                return mat
            },
            u_time: regl.prop('u_time'),
            u_color: regl.prop('u_color'),
            u_phase: regl.prop('u_phase'),
            u_random: regl.prop('u_random')
        },

        blend: {
            enable: true,
            func: {
                srcRGB: 'src alpha',
                srcAlpha: 'src alpha',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        },

        primitive: 'triangle strip',
        count: n
    })

    let strips = Array(256)
        .fill({})
        .map((_, i, a) => {
            let c = rand()
            return {
                u_color: [c, c, c],
                u_phase: Math.floor(map(rand(), 0, 1, 1, 3))*2,
                u_random: [
                    map(rand(), 0, 1, -2, 2),
                    map(rand(), 0, 1, -2, 2),
                    map(rand(), 0, 1, -2, 2)
                ],
                direction: rand() > 0.5 ? 1 : -1,
                t: map(i/(a.length-1), 0, 1, -2, 2)
            }
        })

    let c = rand()
    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [c, c, c, 1], depth: 1})
        draw_strip(strips.map(v => Object.assign(v, { u_time: playhead })))
    }
}

canvasSketch(sketch, settings)
