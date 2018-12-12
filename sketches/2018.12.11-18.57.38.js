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

    let seed_value = Math.floor(Math.random()*1000)
    // 563
    let simplex = new SimplexNoise(seed_value)

    let geo = Array(128*128)
        .fill([])
        .map((_, i, a) => {
            /*
            let xoff = (i%128)/128
            let zoff = Math.floor(i/128)/128
            let x = (xoff*2)-1
            let y = simplex.noise2D(i/(a.length), x)
            */

            let xoff = ((i%128)/128)*TAU
            let zoff = Math.floor(i/128)/128
            let r = map(Math.sin(zoff*TAU), -1, 1, 0.5, 0.75)
            let x = Math.cos(xoff)*r
            let y = (Math.sin(xoff)*r)+(simplex.noise2D(i/(a.length), x)*0.5)

            return [x, y, map(zoff, 0, 1, -0.5, 0.5)]
        })
        .reduce((a, v, i, s) => {
            return i === 0 ? a : a.concat([s[i-1], s[i]])
        }, [])

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
        count: geo.length
    })

    return ({ width, height, playhead }) => {
        regl.poll()
        regl.clear({color: [0.95, 0.95, 0.95, 1], depth: 1})
        let identity = mat4.identity([])
        let pos = mat4.translate([], identity, [0.0, 0.0, -2.5])
        let mat = mat4.rotate([], pos, playhead*TAU, [1.0, 1.0, 1.0])
        draw_strip({
            u_color: [0.15, 0.15, 0.15, 1],
            u_matrix: mat,
            u_resolution: [width, height]
        })
    }
}

canvasSketch(sketch, settings)

