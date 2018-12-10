let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let create_regl = require('regl')
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

let sketch = ({ gl }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let vlerp = (v0, v1, t) => [lerp(v0[0], v1[0], t), lerp(v0[1], v1[1], t)]
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))

    let simplex = new SimplexNoise(42)

    let geo = Array(256)
        .fill([])
        .map((_, i, a) => {
            let t = i/(a.length-1)

            let x1 = simplex.noise2D(t, t+32)
            let y1 = simplex.noise3D(t, t+32, t+64)
            let z1 = simplex.noise4D(t, t+32, t+64, t+96)

            let m = 0.02
            let x2 = simplex.noise2D(t+m, t+m+32)
            let y2 = simplex.noise3D(t+m, t+m+32, t+m+64)
            let z2 = simplex.noise4D(t+m, t+m+32, t+m+64, t+m+96)
            return [[ x1, y1, z1 ], [ x2, y2, z2 ]]
        })

    let regl = create_regl({ gl })
    let draw_strip = regl({
        frag: `
        precision mediump float;
        uniform vec4 u_color;
        void main() { gl_FragColor = u_color; }`,

        vert: `
        precision mediump float;
        uniform mat4 u_projection, u_matrix;
        attribute vec3 position;

        void main() {
            gl_Position = u_projection*u_matrix*vec4(position, 1);
        }`,

        attributes: {
            position: geo
        },

        uniforms: {
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_color: regl.prop('u_color'),
            u_matrix: regl.prop('u_matrix'),
            u_resolution: regl.prop('u_resolution')
        },

        primitive: 'lines',
        count: geo.length*2
    })

    return ({ width, height, playhead }) => {
        regl.poll()
        regl.clear({color: [0.95, 0.95, 0.95, 1], depth: 1})
        let identity = mat4.identity([])
        let pos = mat4.translate([], identity, [0.0, 0.0, -2.0])
        let mat = mat4.rotate([], pos, playhead*TAU, [1.0, 1.0, 1.0])
        draw_strip({
            u_color: [0.15, 0.15, 0.15, 1],
            u_matrix: mat,
            u_resolution: [width, height]
        })
    }
}

canvasSketch(sketch, settings)
