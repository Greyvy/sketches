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

let sketch = ({ gl, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let vlerp = (v0, v1, t) => [lerp(v0[0], v1[0], t), lerp(v0[1], v1[1], t)]
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))

    let seed_value = Math.floor(Math.random()*1000)
    // 563
    let simplex = new SimplexNoise(seed_value)

    let geo = Array(128)
        .fill([])
        .map((_, i, a) => {
            let xoff = (i/128)*TAU
            let zoff = (i/128)/128
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
            u_matrix: ({}, props) => {
                let i = mat4.identity([])
                let t = props.t
                let ph = props.playhead

                let p = mat4.translate([], i, [t*0.5, t*0.5, -2.5])
                return mat4.rotate([], p, ph*TAU, [ph*0.5, t*1.0, 1.0])
            },
            u_color: regl.prop('u_color')
        },

        primitive: 'lines',
        count: geo.length
    })


    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [0.95, 0.95, 0.95, 1], depth: 1})
        let strips = Array(128)
            .fill({})
            .map((_, i, a) => ({
                u_color: [0.15, 0.15, 0.15, 1],
                t: map((i/(a.length-1)), 0, 1, -1, 1),
                playhead: playhead
            }))
        draw_strip(strips)
    }
}

canvasSketch(sketch, settings)

