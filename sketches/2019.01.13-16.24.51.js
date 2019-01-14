let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
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
        uniform float u_time, u_offset;

        void main() {
            gl_FragColor = vec4(u_color, 1.0-u_time);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time;
        uniform float u_offset;
        uniform float u_phase;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 position;
        attribute float offset;

        void main() {
            // gl_PointSize = 4.0;
            vec3 pos = position;
            pos.z += u_offset;
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            position: Array(n)
                .fill([])
                .map((_, i, a) => {
                    let angle = (i/(a.length-1))*TAU
                    let x = Math.cos(angle)*2
                    let y = i%2 === 0 ? 0.0125 : -0.0125
                    let z = Math.sin(angle)*2
                    return [ x, y, z ]
                }),
            offset: Array(n)
                .fill(0)
                .map((_, i, a) => {
                    let t = map(i/(a.length-1), 0, 1, -2, 2)
                    let x = map(simplex.noise2D(t+t, Math.pow(t, i)), -1, 1, -2, 2)
                    let y = map(simplex.noise2D(t*t, i*t), -1, 1, -2, 2)
                    let z = map(simplex.noise2D(t, t+32), -1, 1, -2, 2)
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
                let { ident, r, t, u_time: ph } = props
                let tra = mat4.translate([], ident,
                    [r[0], 0, r[1]])
                let sca = mat4.scale([], tra, [ph*8, ph*8, 1])
                let mat = mat4.rotate([], sca, TAU*0.125, [1, 1, 0])
                return mat
            },
            u_color: regl.prop('u_color'),
            u_time: regl.prop('u_time'),
            u_phase: regl.prop('u_phase'),
            u_offset: regl.prop('u_offset')
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

    let strips = Array(32)
        .fill({})
        .map((_, i, a) => {
            let c = rand()
            return {
                u_color: [c, c, c],
                u_offset: simplex.noise2D(i/(a.length-1), i*2),
                u_phase: 2,
                // u_phase: Math.floor(map(rand(), 0, 1, 1, 4))*2,
                ident: mat4.identity([]),
                t: i/(a.length-1),
                r: [map(rand(), 0, 1, -2, 2), map(rand(), 0, 1, -2, 2)]
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
