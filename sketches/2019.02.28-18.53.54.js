let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let Tone = require('tone')
let load = require('load-asset')
let create_regl = require('regl')
let hsluv = require('hsluv')
let seed = require('seed-random')
let mat4 = require('gl-mat4')
let vec3 = require('gl-vec3')

let settings = {
    context: 'webgl',
    animate: true,
    duration: 34.25,
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
    let tube = cylindar(rand()*0.5, rand()*4)

    let plane_off = plane.positions.map((v, i, a) => {
        let vv = [v[0], v[1], v[2]]
        return [
            simplex.noise2D(...vv),
            simplex.noise3D(...vv),
            simplex.noise4D(...vv, (i-1)/a.length)
        ]
    })

    /*
    let plane_c = () => r_grey()
    let tube_col = r_grey()
    let bgc = r_grey()
    */

    let plane_c = () => {
        return hsluv.hsluvToRgb([
            180+rand()*180, 20+rand()*80, 50+rand()*25
        ])
    }

    let tube_col = hsluv.hsluvToRgb([
        rand()*360, 25+rand()*75, rand()*25
    ])

    let bgc = hsluv.hsluvToRgb([
        rand()*360, 75+rand()*25, 50+rand()*25
    ])

    let current_grey = plane_c()
    let plane_col = Array(plane.positions.length)
        .fill([])
        .map((v, i) => {
            if (i%(13*13) === 0) current_grey = plane_c()
            return current_grey
        })

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
            gl_FragColor = vec4(col, 1.0-v_depth);
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
                let { u_t, u_index, u_stride, u_random, u_time, u_fft } = props
                let decay = Math.sin(u_time*PI)
                let x = map(u_index%u_stride, 0, u_stride, -5, 6)
                let y = map(Math.floor(u_index/u_stride), 0, u_stride, -5, 6)
                let xoff = Math.cos(Math.atan2(y, x))*u_fft[u_index]*decay*0.0125
                let yoff = Math.sin(Math.atan2(y, x))*u_fft[u_index]*decay*0.0125
                let tra = mat4.translate([], mat4.identity([]), [
                    x+xoff, y+yoff, u_fft[u_index]*0.05
                ])
                let sca = mat4.scale([], tra, [0.75, 0.75, 0.75])
                let mat = mat4.rotate([], sca, u_time*TAU, [
                    u_random[0], u_random[1], 0 ])
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

    let draw_tube = regl({
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
            gl_FragColor = vec4(col, 0.125);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time;
        uniform vec3 u_random;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_normal, a_color;

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

            mat4 rot = rotation_x(u_time*PI*2.0);

            v_color = a_color;
            v_depth = a_position.z;
            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: tube,
            a_color: plane_col,
            //a_normal: plane.normals,
            //a_offset: plane_off
        },

        uniforms: {
            u_view: ({time}, props) => {
                let { u_time } = props
                let x = Math.sin(u_time*TAU)
                let y = Math.sin(u_time*TAU)
                let z = 8
                return mat4.lookAt([],
                    [0.0, 0.0, z  ], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_matrix: (_, props) => {
                let { u_t, u_index, u_stride, u_random, u_offset, u_time, u_fft } = props
                let x = map((u_index%u_stride), 0, u_stride, 12, -12)
                let y = map(Math.floor(u_index/u_stride), 0, u_stride, -12, 12)
                let z = 0
                let tra = mat4.translate([], mat4.identity([]), [
                    x+u_offset[0], y+u_offset[1], u_fft[u_index%u_stride]*0.025
                ])
                let mat = mat4.scale([], tra, [0.25, 0.25, 0.25])
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
        count: tube.length
    })


    let draw_bg = regl({
        frag: `
        precision mediump float;
        uniform float u_time;
        uniform vec3 u_color;

        void main() {
            vec3 col = u_color;
            gl_FragColor = vec4(col, 1.0);
        }`,
        vert: `
        precision mediump float;
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

    let plane_elements = Array(8*8)
        .fill({})
        .map((_, i, a) => {
            return {
                u_random: [
                    map(rand(), 0, 1, -8, 8),
                    map(rand(), 0, 1, -8, 8),
                    map(rand(), 0, 1, -8, 8)
                ],
                u_index: i,
                u_stride: 8,
                u_t: i/(a.length-1),
            }
        })

    let tube_elements = Array(24*24)
        .fill({})
        .map((_, i, a) => {
            return {
                u_random: [
                    map(rand(), 0, 1, -8, 8),
                    map(rand(), 0, 1, -8, 8),
                    map(rand(), 0, 1, -8, 8)
                ],
                u_index: i,
                u_length: a.length-1,
                u_stride: 24,
                u_t: i/(a.length-1)
            }
        })

    let player = new Tone.Player('/assets/2019_03_01.mp3').toMaster()
    let fft = new Tone.Analyser('fft', 64)
    player.autostart = true
    player.loop = true
    player.connect(fft)

    return ({ playhead }) => {
        let fft_v = fft.getValue()
        regl.poll()
        regl.clear({color: [0, 0, 0, 1], depth: 1})
        draw_bg({ u_color: bgc, u_time: playhead })
        draw_plane(plane_elements.map(v =>
            Object.assign(v, { u_time: playhead, u_fft: fft_v })))
        draw_tube(tube_elements.map((v, i, a) => {
            let t = i/(a.length-1)*2
            let p = playhead
            let xo = Math.sin(p*t*TAU)
            let yo = Math.cos(t+1*TAU)
            let zo = Math.sin(t+2*TAU)
            let wo = Math.cos(p*TAU)
            let offset = [
                map(simplex.noise2D(xo, yo), -1, 1, 0, 1),
                map(simplex.noise3D(xo, yo, zo), -1, 1, 0, 1),
                map(simplex.noise4D(xo, yo, zo, wo), -1, 1, 0, 1)
            ]
            return Object.assign(v, {
                u_time: playhead,
                u_offset: offset,
                u_fft: fft_v
            })
        }))
    }
}

canvasSketch(sketch, settings)

