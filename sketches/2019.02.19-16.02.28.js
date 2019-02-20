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
        let stride = Math.sqrt(n)
        for (let i = 0; i < n; ++i) {
            let x = (i%stride)/stride
            let y = Math.floor(i/stride)/stride
            let z = simplex.noise2D(x, y)
            geo.push([-8+x*16, -8+y*16, z])
        }
        return {positions: geo}
    }

    let plane = require('geo-3d-box')({ size: 1, segments: 12 })
    let web = web_make(128*128)

    let current_grey = r_grey()
    /*hsluv.hsluvToRgb([
        rand()*360, 25+rand()*50, 25+rand()*25
    ])*/
    let plane_col = Array(plane.positions.length)
        .fill([])
        .map((v, i) => {
            if (i%(13*13) === 0) current_grey = r_grey()
            /*hsluv.hsluvToRgb([
                rand()*360, 25+rand()*50, 25+rand()*25
            ])*/
            return current_grey
        })

    /*
    let plane_off = Array(plane.positions.length)
        .fill([])
        .map((v, i, a) => {
            let t = Math.sin((i%(13*13))/(13*13)*PI)
            //let t = ((i-1)/a.length)*6
            let x = simplex.noise2D(t, t+16)
            let y = simplex.noise3D(t, t+16, t+32)
            let z = simplex.noise4D(t, t+16, t+32, t+64)
            return [x, y, z]
        })
    */

    let plane_off = plane.positions.map((v, i, a) => {
        let vv = [v[0], v[1], v[2]]
        return [
            simplex.noise2D(...vv),
            simplex.noise3D(...vv),
            simplex.noise4D(...vv, (i-1)/a.length)
        ]
    })

    let web_col = r_grey()
    /*hsluv.hsluvToRgb([
        rand()*360, 25+rand()*50, 50+rand()*25
    ])*/

    let bgc = r_grey()
    /*hsluv.hsluvToRgb([
        rand()*360, rand()*100, rand()*100
    ])*/

    let draw_plane = regl({
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
            gl_FragColor = vec4(col, 1.0);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time;
        uniform vec3 u_random;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_normal, a_color, a_offset;

        varying vec3 v_color;
        varying float v_depth;

        mat4 rotation_x(float angle) {
            return mat4(1.0, 0.0,        0.0,         0.0,
                        0.0, cos(angle), -sin(angle), 0,
                        0.0, sin(angle),  cos(angle), 0,
                        0.0, 0.0,        0.0,         1.0);
        }

        void main() {
            vec3 pos = a_position;
            vec3 off = a_offset;
            pos += (a_offset*sin(u_time*PI*2.0))*0.25;

            mat4 rot = rotation_x(u_time*PI*2.0);

            v_color = a_color;
            v_depth = a_position.z;
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: plane.positions,
            a_normal: plane.normals,
            a_color: plane_col,
            a_offset: plane_off
        },
        elements: plane.cells,

        uniforms: {
            u_view: ({time}, props) => {
                let { u_time } = props
                let x = Math.sin(u_time*TAU)
                let y = Math.sin(u_time*TAU)
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
                let rot_modifier = Math.floor(map(u_random[1], -8, 8, 1, 3))*2
                let tra = mat4.translate([], mat4.identity([]), [
                    Math.cos(u_t*TAU*rot_modifier)*(u_t*2),
                    Math.sin(u_t*TAU*rot_modifier)*(u_t*2),
                    Math.sin(u_time*TAU)*2*(u_t*2)
                ])
                let sca = mat4.scale([], tra, [u_t, u_t, u_t])
                let mat = mat4.rotate([], sca, u_time*TAU, [u_random[0], u_random[1], 0])
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
            gl_FragColor = vec4(col, v_depth);
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
            pos.z *= sin(u_time*PI*2.0);
            gl_PointSize = (pos.z/0.09);

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
                let n = 0.125
                let x = Math.sin(u_time*TAU)*u_random[0]*n
                let y = Math.sin(u_time*TAU)*u_random[1]*n
                let z = Math.sin(u_time*TAU)*u_random[2]*n
                let tra = mat4.translate([], mat4.identity([]), [x, y, z])
                let sca = mat4.scale([], tra, [8, 8, 8])
                let mat = mat4.rotate([], sca, u_time*TAU, [0, 0, 1])
                return mat4.identity([])
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

    let plane_elements = Array(128)
        .fill({})
        .map((_, i, a) => {
            let c = rand()
            return {
                u_random: [
                    map(rand(), 0, 1, -8, 8),
                    map(rand(), 0, 1, -8, 8),
                    map(rand(), 0, 1, -8, 8)
                ],
                u_color: r_grey(),
                /*
                u_color: hsluv.hsluvToRgb([
                    10+rand()*70,
                    40+rand()*10,
                    20+rand()*10
                ]),
                */
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
                u_color: web_col,
                u_t: i/(a.length-1)
            }
        })

    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [0, 0, 0, 1], depth: 1})
        draw_bg({ u_color: bgc, u_time: playhead })
        draw_web(web_elements.map(v =>
            Object.assign(v, { u_time: playhead })))
        draw_plane(plane_elements.map(v =>
            Object.assign(v, { u_time: playhead })))
    }
}

canvasSketch(sketch, settings)
