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

    let r_grey = () => {
        let c = rand()
        return [c, c, c]
    }

    let cylindar = (r=1, height=1, sides=12) => {
        let geo = []
        for (let i = 0; i < sides; ++i) {
            let a1 = (i/sides)*TAU
            let a2 = ((i+1)/sides)*TAU

            geo.push([Math.cos(a1)*r, Math.sin(a1)*r, -height])
            geo.push([Math.cos(a2)*r, Math.sin(a2)*r, -height])
            geo.push([0, 0, -height])

            geo.push([Math.cos(a1)*r, Math.sin(a1)*r, -height])
            geo.push([Math.cos(a1)*r, Math.sin(a1)*r, height])
            geo.push([Math.cos(a2)*r, Math.sin(a2)*r, -height])

            geo.push([Math.cos(a2)*r, Math.sin(a2)*r, -height])
            geo.push([Math.cos(a1)*r, Math.sin(a1)*r, height])
            geo.push([Math.cos(a2)*r, Math.sin(a2)*r, height])

            geo.push([Math.cos(a1)*r, Math.sin(a1)*r, height])
            geo.push([Math.cos(a2)*r, Math.sin(a2)*r, height])
            geo.push([0, 0, height])

        }

        return geo
    }

    let cone = (r=1, height=1, sides=12) => {
        let geo = []
        for (let i = 0; i < sides; ++i) {
            let a1 = (i/sides)*TAU
            let a2 = ((i+1)/sides)*TAU

            geo.push([Math.cos(a1)*r, Math.sin(a1)*r, -height])
            geo.push([Math.cos(a2)*r, Math.sin(a2)*r, -height])
            geo.push([0, 0, -height])

            geo.push([Math.cos(a1)*r, Math.sin(a1)*r, -height])
            geo.push([Math.cos(a2)*r, Math.sin(a2)*r, -height])
            geo.push([0, 0, height])

        }

        return geo
    }

    let cylindar_geo = cylindar(0.5, 2, 6)
    let cylindar_col = Array(cylindar_geo.length).fill([]).map(v => { return r_grey() })

    let cone_geo = cone(0.5, 1, 6)
    let cone_col = Array(cone_geo.length).fill([]).map(v => { return r_grey() })

    let draw_cylindar = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time, u_offset;
        varying vec3 v_color;
        varying float v_depth;

        void main() {
            vec3 col = v_color;
            gl_FragColor = vec4(col, 1.0+v_depth);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time;
        uniform vec3 u_random;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_color;

        varying vec3 v_color;
        varying float v_depth;

        void main() {
            v_color = a_color;
            v_depth = a_position.z;
            vec3 pos = a_position;
            float t = sin(u_time*PI*2.0);
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: cylindar_geo,
            a_color: cylindar_col
        },

        uniforms: {
            u_view: ({time}, props) => {
                let x = 0
                let y = 0
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
                let { u_t, u_random, u_time } = props
                let tra = mat4.translate([], mat4.identity([]), [
                    0.0,
                    map(u_t, 0, 1, -4, 4),
                    0.0
                ])
                let rot = mat4.rotate([], tra, u_t*TAU, [0, 1, 1])
                let cyc = mat4.rotate([], rot, u_time*TAU, [0, 1, 0])
                let poi = mat4.rotate([], cyc, PI*0.5, [0, 1, 0])
                let mat = mat4.scale([], poi, [
                    1+Math.sin(u_t+u_time*TAU)*4,
                    1+Math.sin(u_t+u_time*TAU)*4,
                    1
                ])
                return mat
            },
            u_t: regl.prop('u_t'),
            u_time: regl.prop('u_time'),
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

        primitive: 'triangles',
        count: cylindar_geo.length
    })

    let draw_cone = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time, u_offset;
        varying vec3 v_color;
        varying float v_depth;

        void main() {
            vec3 col = v_color;
            gl_FragColor = vec4(col, 1.0+v_depth);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time;
        uniform vec3 u_random;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_color;

        varying vec3 v_color;
        varying float v_depth;

        void main() {
            v_color = a_color;
            v_depth = a_position.z;
            vec3 pos = a_position;
            // float t = sin(u_time*PI*2.0);
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: cone_geo,
            a_color: cone_col
        },

        uniforms: {
            u_view: ({time}, props) => {
                let x = 0
                let y = 0
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
                let { u_t, u_random, u_offset, u_time } = props
                let st = Math.sin((u_time*TAU)%(PI))
                let tra = mat4.translate([], mat4.identity([]), [
                    Math.cos(u_t*TAU)*((st*12)+(u_offset[0]*1)),
                    Math.sin(u_t*TAU)*((st*12)+(u_offset[1]*1)),
                    u_t
                ])
                let rot = mat4.rotate([], tra, u_t*PI, [1, 1, 0])
                let cyc = mat4.rotate([], rot, u_time*TAU, [0, 0, 1])
                let mat = mat4.scale([], cyc, u_offset)
                return mat
            },
            u_t: regl.prop('u_t'),
            u_time: regl.prop('u_time'),
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

        primitive: 'triangles',
        count: cone_geo.length
    })


    let cylindar_elements = Array(32)
        .fill({})
        .map((_, i, a) => {
            let c = rand()
            return {
                u_random: [
                    map(rand(), 0, 1, -2, 2),
                    map(rand(), 0, 1, -2, 2),
                    map(rand(), 0, 1, -2, 2)
                ],
                u_t: i/(a.length-1),
            }
        })

    let cone_elements = Array(64)
        .fill({})
        .map((_, i, a) => {
            let c = rand()
            let t = i/(a.length-1)
            let st = Math.sin(t*TAU*8)
            return {
                u_random: [
                    map(rand(), 0, 1, -4, 4),
                    map(rand(), 0, 1, -4, 4),
                    map(rand(), 0, 1, -4, 4)
                ],
                u_offset: [
                    map(simplex.noise2D(st, st+16), -1, 1, 0, 1),
                    map(simplex.noise3D(st, st+16, st+32), -1, 1, 0, 1),
                    map(simplex.noise4D(st, st+16, st+32, st+64), -1, 1, 0, 1)
                ],
                u_t: t,
            }
        })


    let c = rand()
    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [c, c, c, 1], depth: 1})
        /*
        draw_cylindar(cylindar_elements.map(v =>
            Object.assign(v, { u_time: playhead })))
        */
        draw_cone(cone_elements.map(v =>
            Object.assign(v, { u_time: playhead })))
    }
}

canvasSketch(sketch, settings)
