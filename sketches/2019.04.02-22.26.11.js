let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let Tone = require('tone')
let load = require('load-asset')
let create_regl = require('regl')
let icosphere = require('icosphere')
let hsluv = require('hsluv')
let seed = require('seed-random')
let mat4 = require('gl-mat4')
let vec3 = require('gl-vec3')

let settings = {
    context: 'webgl',
    animate: true,
    duration: 8,
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

    let regl = create_regl({
        gl,
        extensions: ['webgl_draw_buffers', 'oes_texture_float']
    })

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

    let cone_make = (r=1, height=1, sides=12) => {
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

    let ball = icosphere(0)
    let cube = require('geo-3d-box')({ size: 4, segments: 8 })


    let bgc = hsluv.hsluvToRgb([0, 0, rand()*100])
    let ball_colour = hsluv.hsluvToRgb([0, 0, rand()*100])
    let ball_colours = ball.positions.map(() => {
        return hsluv.hsluvToRgb([0, 0, rand()*100])
    })

    let ball_offsets = ball.positions.map((v, i, a) => {
        let result = [
            simplex.noise2D(v[0], v[1]),
            simplex.noise3D(v[0], v[1], v[2]),
            simplex.noise4D(v[0], v[1], v[2], i/(a.length-1))
        ]
        return result
    })

    let cube_offset = cube.positions.map((v, i, a) => {
        let result = [
            simplex.noise2D(v[0], v[1]),
            simplex.noise3D(v[0], v[1], v[2]),
            simplex.noise4D(v[0], v[1], v[2], i/(a.length-1))
        ]
        return result
    })


    let ball_fbo = regl.framebuffer({
        color: [
            regl.texture({ type: 'float', width: 1024, height: 1024 })
        ]
    })

    let ball_draw_fbo = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time, u_offset;
        uniform vec3 u_color, u_random;

        varying vec3 v_color;
        varying float v_depth, v_opacity;

        void main() {
            vec3 col = v_color;
            gl_FragColor = vec4(col+(v_depth*0.125), 0.5+u_random*0.124);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time;
        uniform vec3 u_random;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_offset, a_color;

        varying vec3 v_color;
        varying float v_depth, v_opacity;

        float map(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            vec3 pos = a_position;
            vec3 off = a_offset;

            pos += (off*sin(u_time*PI))*0.125;

            v_color = a_color;
            v_depth = a_position.z;
            v_opacity = map(u_random.x, -8.0, 8.0, 0.0, 1.0);

            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: ball.positions,
            a_color: ball_colours,
            a_offset: ball_offsets
        },

        elements: ball.cells,

        uniforms: {
            u_view: ({time}, props) => {
                let { u_time } = props
                // @NOTE(Grey): Dis scary random ass view math
                let x = 0
                let y = 0
                let z = -8
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
                let { u_t, u_index, u_stride, u_random, u_time } = props
                let scale = Math.sin(u_time*PI*4)*2

                let tra = mat4.translate([], mat4.identity([]), [
                    Math.sin(u_t*TAU)*4,
                    Math.cos(u_t*TAU)*(Math.sin(u_t*TAU)*4),
                    0
                ])
                let rot = mat4.rotate([], tra, u_time*TAU, [ 1, 0, 0 ])
                let mat = mat4.scale([], rot, [scale, scale, scale])
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
        depth: { enable: true, mask: true },
        framebuffer: ball_fbo
    })

    let cube_draw = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time, u_offset;
        uniform sampler2D u_texture;

        varying float v_depth, v_opacity;
        varying vec2 v_uv;

        void main() {
            vec4 texture = texture2D(u_texture, v_uv);
            gl_FragColor = vec4(texture);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_offset;
        attribute vec2 a_uv;

        varying float v_depth;
        varying vec2 v_uv;

        float map(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            vec3 pos = a_position;
            vec3 off = a_offset;

            pos += sin(u_time*PI)*off;

            v_depth = pos.z;
            v_uv = a_uv;

            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: cube.positions,
            a_normal: cube.normals,
            a_uv: cube.uvs,
            a_offset: cube_offset
        },

        elements: cube.cells,

        uniforms: {
            u_view: ({time}, props) => {
                let { u_time } = props
                // @NOTE(Grey): Dis scary random ass view math
                let x = 0
                let y = 0
                let z = -8
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
                let { u_random, u_time } = props
                let sca = mat4.scale([], mat4.identity([]), [2, 2, 2])
                let mat = mat4.rotate([], sca, u_time*TAU, [1, 0, 1])
                return mat
            },
            u_time: regl.prop('u_time'),
            u_color: regl.prop('u_color'),
            u_texture: regl.prop('u_texture')
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

        primitive: 'triangles'
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
                srcRGB:   'src alpha',
                srcAlpha: 'src alpha',
                dstRGB:   'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        },

        primitive: 'triangles',
        count: 3

    })

    let ball_elements = Array(32)
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
                u_t: i/(a.length-1)
            }
        })

    let cube_elements = Array(1)
        .fill({})

    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [0, 0, 0, 1], depth: 1})
        draw_bg({ u_color: bgc, u_time: playhead })

        regl.clear({
            color: bgc,
            depth: 1,
            framebuffer: ball_fbo
        })
        ball_draw_fbo(ball_elements.map((v, i, a) => {
            return Object.assign(v, { u_time: playhead }) }))
        cube_draw({ u_time: playhead, u_texture: ball_fbo.color[0] })

    }
}

canvasSketch(sketch, settings)
