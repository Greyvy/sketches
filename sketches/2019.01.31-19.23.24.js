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

    let n = 64
    let draw_strip = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform vec3 u_color;
        uniform float u_time, u_offset, u_phase;

        void main() {
            vec3 col = u_color;
            col.x = 0.5;
            col.y = 0.5;
            col.z = 0.5;
            gl_FragColor = vec4(col, 1.0);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time, u_offset, u_phase;
        uniform vec3 u_random;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_offset;

        void main() {
            vec3 off = a_offset;
            vec3 ran = u_random;
            vec3 pos = a_position;
            float t = sin(u_time*PI*2.0);
            pos.z+=sin(t*PI)*off.z*0.5;
            // pos+=sin(t*cos(t*u_phase))*ran*2.0;
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: Array(n)
                .fill([])
                .map((_, i, a) => {
                    let s = 1.25
                    let angle = map(i, 0, n-2, 0, TAU)
                    if (i === 0) {
                        return [ 0, 0, 0 ]
                    }
                    let x = Math.cos(angle)*s
                    let y = Math.sin(angle)*s
                    let z = 0
                    return [ x, y, z ]
                }),
            a_offset: Array(n)
                .fill(0)
                .map((_, i, a) => {
                    let s = 1.25
                    let angle = map(i, 0, n-2, 0, TAU)
                    if (i === 0) {
                        return [ 0, 0, 0 ]
                    }
                    let x = Math.cos(angle)*s
                    let y = Math.sin(angle)*s
                    let z = Math.sin(angle)
                    let nx = simplex.noise2D(x, y)
                    let ny = simplex.noise3D(x, y, z)
                    let nz = simplex.noise4D(x, y, z, Math.sin(angle))
                    return [nx, ny, nz]
                })
        },

        uniforms: {
            u_view: ({time}, props) => {
                let x = Math.cos(time)*8.0
                let y = Math.sin(time)*5.0
                // let z = Math.sin(time)*8.0
                let z = 8
                return mat4.lookAt([],
                    [x  , y  , z  ], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_matrix: (_, props) => {
                let { u_t, u_random, u_time, u_phase, u_scale } = props

                let t = Math.sin(u_time*PI)
                let nx = map(simplex.noise3D(Math.sin(u_t*PI), Math.sin(u_t+32*PI), t), -1, 1, 1, 4)
                let pos = mat4.translate([], mat4.identity([]), [
                    Math.cos(u_t*TAU)*nx,
                    Math.sin(u_t*TAU)*2,
                    map(u_t, -8, 8, -4, 4)
                ])
                let rot = mat4.rotate([], pos, u_time*TAU*u_phase, [0, 0, 1])
                let mat = mat4.scale([], rot, [0.015, 0.015, 0.015])
                return mat
            },
            u_t: regl.prop('u_t'),
            u_scale: regl.prop('u_scale'),
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

        primitive: 'triangle fan',
        count: n
    })

    let strips = Array(2048)
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
                u_t: map(i/(a.length-1), 0, 1, -8, 8),
                u_scale: map(rand(), 0, 1, 0.125, 1)
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
