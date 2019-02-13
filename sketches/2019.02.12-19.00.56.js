let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let load = require('load-asset')
let create_regl = require('regl')
let hsluv = require('hsluv')
let seed = require('seed-random')
let mat4 = require('gl-mat4')
let vec3 = require('gl-vec3')

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

    let web_make = (n=1200) => {
        let geo = []
        for (let i = 0; i < n; ++i) {
            let t = i/(n-1)*16
            let x = simplex.noise2D(t, Math.floor(t/0.0125))
            let y = simplex.noise3D(t, Math.floor(t/0.0125), t%0.025)
            let z = simplex.noise4D(t, Math.floor(t/0.0125), t%0.025, t*t)
            /*
            let x = simplex.noise2D(t, t+16)
            let y = simplex.noise3D(t, t+16, t+32)
            let z = simplex.noise4D(t, t+16, t+32, t+64)
            */
            geo.push([x, y, z])
        }
        return {positions: geo}
    }

    let box = require('geo-3d-box')({ size: 1, segments: 2 })
    let web = web_make(9001)

    // @NOTE(Grey): LOL, ‘cubes’
    let current_grey = r_grey()
    let box_col = Array(box.positions.length)
        .fill([])
        .map((v, i) => {
            if (i%9 === 0) current_grey = r_grey()
            return current_grey
        })


    let bgc = r_grey()

    let draw_box = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time, u_offset;
        uniform vec3 u_color;
        varying vec3 v_color;
        varying float v_depth;

        void main() {
            vec3 col = v_color;
            float alpha = sin(u_time*PI);
            gl_FragColor = vec4(col, v_depth);
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

        mat4 rotation_x(float angle) {
            return mat4(1.0, 0.0,        0.0,         0.0,
                        0.0, cos(angle), -sin(angle), 0,
                        0.0, sin(angle),  cos(angle), 0,
                        0.0, 0.0,        0.0,         1.0);
        }

        void main() {
            v_color = a_color;
            v_depth = a_position.z;
            vec3 pos = a_position;
            float t = sin(u_time*PI*2.0);
            pos.x += sin(pos.x)*t;

            mat4 rot = rotation_x(t);
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: box.positions,
            a_normal: box.normals,
            a_color: box_col
        },
        elements: box.cells,

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

                let tra = mat4.translate([], mat4.identity([]), u_random)
                let rot = mat4.rotate([], tra, u_t*TAU, [0, 1, 1])
                let cyc = mat4.rotate([], rot, u_time*TAU, [1, 1, 0])
                let mat = mat4.rotate([], cyc, PI*0.5, [0, 1, 0])
                return mat
            },
            u_t: regl.prop('u_t'),
            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
            u_color: regl.prop('u_color')
        },

        blend: {
            enable: true,
            func: {
                srcRGB:   'src alpha',
                srcAlpha: 'src alpha',
                dstRGB:   'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        },

        primitive: 'triangles',
    })

    let draw_web = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time, u_offset;
        uniform vec3 u_color;

        varying float v_depth;

        void main() {
            vec3 col = u_color;
            gl_FragColor = vec4(col, 1.0);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time;
        uniform vec3 u_random;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position;

        varying float v_depth;

        void main() {
            vec3 pos = a_position;
            gl_PointSize = (pos.z/0.1);
            v_depth = pos.z;
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: web.positions,
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
                // let n = simplex.noise2D(Math.sin(u_time*TAU)/8, Math.cos(u_time*TAU)/8)
                let n = 0.125
                let x = Math.sin(u_time*TAU)*u_random[0]*n
                let y = Math.sin(u_time*TAU)*u_random[1]*n
                let z = Math.sin(u_time*TAU)*u_random[2]*n
                let tra = mat4.translate([], mat4.identity([]), [x, y, z])
                let sca = mat4.scale([], tra, [8, 8, 8])
                let mat = mat4.rotate([], sca, u_time*TAU, [0, 0, 1])
                return mat
            },
            u_time: regl.prop('u_time'),
            u_color: regl.prop('u_color')
        },

        blend: {
            enable: true,
            func: {
                srcRGB:   'src alpha',
                srcAlpha: 'src alpha',
                dstRGB:   'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        },

        primitive: 'points',
        count: web.positions.length
    })

    let draw_bg = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time;
        uniform vec3 u_color;

        void main() {
            vec3 col = u_color;
            gl_FragColor = vec4(col, 1.0);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_time;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_color;

        void main() {
            vec3 pos = a_position;
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: [
                [-80, -80, 0], [-80, 80, 0], [80, 0, 0]
            ]
        },

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0.0, 0.0, 16], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_matrix: (_, props) => {
                return mat4.identity([])
            },
            u_time: regl.prop('u_time'),
            u_color: regl.prop('u_color')
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
        count: 3

    })

    let box_elements = Array(128)
        .fill({})
        .map((_, i, a) => {
            let c = rand()
            return {
                u_random: [
                    map(rand(), 0, 1, -8, 8),
                    map(rand(), 0, 1, -8, 8),
                    map(rand(), 0, 1, -4, 4)
                ],
                u_color: hsluv.hsluvToRgb([
                    10+rand()*70,
                    40+rand()*10,
                    20+rand()*10
                ]),
                u_t: i/(a.length-1),
            }
        })

    let web_elements = Array(1)
        .fill({})
        .map((_, i, a) => {
            return {
                u_random: [
                    map(rand(), 0, 1, -4, 4),
                    map(rand(), 0, 1, -4, 4),
                    map(rand(), 0, 1, -4, 4)
                ],
                u_color: r_grey(),
                u_t: i/(a.length-1)
            }
        })

    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [0, 0, 0, 1], depth: 1})
        draw_bg({ u_color: bgc, u_time: playhead })
        draw_web(web_elements.map(v =>
            Object.assign(v, { u_time: playhead })))
        draw_box(box_elements.map(v =>
            Object.assign(v, { u_time: playhead })))
    }
}

canvasSketch(sketch, settings)
