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

    let d = 16
    let n = d*d*d
    let draw_strip = regl({
        frag: `
        precision mediump float;
        uniform vec4 u_color;
        uniform float u_time;

        void main() {
            gl_FragColor = u_color;
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 position;
        attribute float offset;

        void main() {
            gl_PointSize = 8.0;
            vec3 pos = position;
            pos.z += offset*1.0*sin(u_time*PI*2.0);
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            position: Array(n)
                .fill([])
                .map((_, i, a) => {
                    let stride = d
                    let scale = 2
                    let x = map(i%stride, 0, stride, -scale, scale)
                    let y = map(Math.floor(i/(stride))%stride, 0, stride, -scale, scale)
                    let z = map(Math.floor(i/(stride*stride)), 0, stride, -scale, scale)
                    return [ x, y, z ]
                })
                .reduce((a, v) => a.concat([v]), []),
            offset: Array(n)
                .fill(0)
                .map((_, i, a) => {
                    let stride = d
                    let scale = 2
                    let x = map(i%stride, 0, stride, -scale, scale)
                    let y = map(Math.floor(i/(stride))%stride, 0, stride, -scale, scale)
                    let z = map(simplex.noise2D(x/d, y/d), -1, 1, -scale, scale)
                    return z
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
                let { ident, r, t, playhead: ph } = props
                let tra = mat4.translate([], ident, [0, 0, 0])
                let mat = mat4.rotate([], tra, ph*TAU, [1.5, 1.0, 1.0])
                return mat
            },
            u_color: regl.prop('u_color'),
            u_time: regl.prop('u_time'),
        },

        primitive: 'points',
        count: n
    })

    let strips = Array(1)
        .fill({})
        .map((_, i, a) => {
            let c = rand()
            return {
                u_color: [c, c, c, 1],
                ident: mat4.identity([]),
                t: i/(a.length-1),
                r: rand()
            }
        })


    let c = rand()
    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [c, c, c, 1], depth: 1})
        draw_strip(strips.map(v => {
            v.playhead = playhead
            v.u_time = playhead
            return v
        }))
    }
}

canvasSketch(sketch, settings)

