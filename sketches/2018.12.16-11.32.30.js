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

    let regl = create_regl({ gl })

    let draw_strip = regl({
        frag: `
        precision mediump float;
        uniform vec4 u_color;
        void main() { gl_FragColor = u_color; }`,
        vert: `
        precision mediump float;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 position;

        void main() {
            gl_PointSize = 2.0;
            gl_Position = u_projection*u_view*u_matrix*vec4(position, 1);
        }`,

        attributes: {
            position: Array(128)
                .fill([])
                .map((_, i, a) => {
                    return [
                        map(i/(a.length-1), 0, 1, -1, 1),
                        map(rand(), 0, 1, -0.25, 0.25),
                        0
                    ]
                })
                .reduce((a, v) => a.concat([v]), [])
        },

        uniforms: {
            u_view: (_, props) => {
                return mat4.lookAt([],
                    [0.0, 0.0, 2.0], // position of camera
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
                let y = map(t, 0, 1, 1, -1)
                let z = Math.sin(ph*TAU)*(r)

                let tra = mat4.translate([], ident, [0.0, y, z])
                let sca = mat4.scale([], tra, [y, z, y])
                let mat = mat4.rotate([], sca, ph*TAU, [r, t, 0.0])
                return mat
            },
            u_color: regl.prop('u_color')
        },

        primitive: 'points',
        count: 128
    })

    let strips = Array(256)
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


    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [0.95, 0.95, 0.95, 1], depth: 1})
        draw_strip(strips.map(v => {v.playhead = playhead; return v;}))
    }
}

canvasSketch(sketch, settings)

