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

    /* Sphere point on surface:
     * s = 0...TAU, t = 0...PI, r = radius
     let x = Math.cos(s)*Math.sin(t)*r
     let y = Math.sin(s)*Math.sin(t)*r
     let z = Math.cos(t)*r
     */

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))

    let seed_value = Math.floor(Math.random()*1000)
    let rand = seed(seed_value)

    let regl = create_regl({ gl })

    let n = 1024
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
            gl_PointSize = 4.0;
            gl_Position = u_projection*u_view*u_matrix*vec4(position, 1);
        }`,

        attributes: {
            position: Array(n)
                .fill([])
                .map((_, i, a) => {
                    /* Sphere point on surface:
                     * s = 0...TAU, t = 0...PI, r = radius
                     let x = Math.cos(s)*Math.sin(t)*r
                     let y = Math.sin(s)*Math.sin(t)*r
                     let z = Math.cos(t)*r
                     */
                    let tn = ((a.length-1)/128)
                    let s = (i/(a.length-1))*TAU
                    let t = ((i%tn)/tn)*PI
                    let x = Math.cos(s)*Math.sin(t)
                    let y = Math.sin(s)*Math.sin(t)
                    let z = Math.cos(t)
                    return [ x, y, z ]
                })
                .reduce((a, v) => a.concat([v]), [])
        },

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [
                        0.0, // 2*Math.sin(time),
                        0.0, // 2*Math.cos(time),
                        2.0
                    ], // position of camera
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
                let y = map(t, 0, 1, 0.5, -0.5)
                let z = map(Math.sin(ph*TAU), -1, 1, 0.25, 2)

                // let tra = mat4.translate([], ident, [0.0, y, z])
                let sca = mat4.scale([], ident, [z, z, z])
                let mat = mat4.rotate([], sca, ph*TAU, [1.0, 1.0, 1.0])
                return mat
            },
            u_color: regl.prop('u_color')
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


    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [0.95, 0.95, 0.95, 1], depth: 1})
        draw_strip(strips.map(v => {v.playhead = playhead; return v;}))
    }
}

canvasSketch(sketch, settings)

