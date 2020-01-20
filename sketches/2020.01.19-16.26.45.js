let canvasSketch = require('canvas-sketch')
let create_regl = require('regl')
let Tone = require('tone')
let load = require('load-asset')

let seed = require('seed-random')
let SimplexNoise = require('simplex-noise')
let hsluv = require('hsluv')
let mat4 = require('gl-mat4')
let vec3 = require('gl-vec3')
let vec4 = require('gl-vec4')

let extrude = require('extrude')
let text_make = require('vectorize-text')
let plane_make = require('primitive-plane')
let icosphere_make = require('primitive-icosphere')
let cube_make = require('primitive-cube')
let torus_make = require('primitive-torus')

// @NOTE(Grey): These are all my utilities
let { clamp, lerp, map, ease, load_sound } = require('../utils')
let line_make = require('../line')
let diamond_make = require('../diamond')
let shader_utils = require('../glsl')

const PI = Math.PI
const TAU = PI * 2
const N = 128
const N_LIGHTS = 4

let settings = {
    context: 'webgl',
    animate: true,
    duration: 8,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}

function view() {
    return mat4.lookAt([], [0, 0, 4.0], [0, 0, 0], [0, 1, 0])
}

function projection({viewportWidth: width, viewportHeight: height}) {
    return mat4.perspective([], PI/4, width/height, 0.01, 1000)
}

function spring(val, xt, zeta, omega, h) {
    let x = val[0]
    let v = val[1]

    let f = 1.0+2.0*h*zeta*omega
    let oo = omega*omega
    let hoo = h*oo
    let hhoo = h*hoo
    let det_inv = 1.0/(f+hhoo)
    let det_x = f*x+h*v+hhoo*xt
    let det_v = v+hoo*(xt-x)

    return [
        det_x*det_inv,
        det_v*det_inv
    ]
}

function vec3_spring(val, xt, zeta, omega, h) {
    return [
        spring(val[0], xt, zeta, omega, h),
        spring(val[1], xt, zeta, omega, h),
        spring(val[2], xt, zeta, omega, h)
    ]
}

let sketch = async ({ gl, width, height }) => {

    let seed_value = Math.floor(Math.random()*1000)
    let rand = seed(seed_value)
    let simplex = new SimplexNoise(seed_value)

    let regl = create_regl({
        gl,
        extensions: [
            'webgl_draw_buffers',
            'oes_texture_float',
            'oes_standard_derivatives',
            'oes_texture_float_linear'
        ]
    })

    let sphere = icosphere_make()

    let fgc = hsluv.hsluvToRgb([0, 0, 25+rand()*50])
    let bgc = hsluv.hsluvToRgb([0, 0, rand()*100])

    let render_target1024 = regl.framebuffer({
        color: [
            regl.texture({
                type: 'float',
                width: 1024,
                height: 1024,
                wrap: ['mirror', 'mirror']
            })
        ]
    })

    let pixels = regl.texture()
    let offscreen_render_panel = plane_make()

    let offscreen_render = regl({
        frag: `
        precision mediump float;
        #define PI 3.141592653589793

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        varying vec2 v_uv;

        uniform float u_time;
        uniform sampler2D u_feedback;
        uniform sampler2D u_texture0;

        void main() {
            vec2 uv = v_uv;

            vec2 warp = uv+0.01*sin(u_time)*vec2(0.5-uv.y, uv.x-0.5)-0.01*(uv-0.5);

            float n = iqnoise(uv, 1.0, 0.0);

            vec4 color = vec4(0.98*texture2D(u_feedback, n-warp*n).rgb, 0.95);
            color = texture2D(u_texture0, uv);

            // float r = texture2D(u_feedback, uv+vec2(0.00125)).r;
            // float g = texture2D(u_feedback, uv-vec2(0.00125)).g;
            // float b = texture2D(u_feedback, uv*vec2(0.00125)).b;

            // color.r = r;
            // color.g = g;
            // color.b = b;

            gl_FragColor = color;
        }
        `,
        vert: `
        attribute vec3 a_position;
        attribute vec2 a_uv;

        uniform mat4 u_matrix;

        varying vec2 v_uv;

        void main() {
            v_uv = a_uv;
            gl_Position = u_matrix*vec4(a_position, 1.0);
        }
        `,
        attributes: {
            a_position: offscreen_render_panel.positions,
            a_uv      : offscreen_render_panel.uvs,
        },
        elements      : offscreen_render_panel.cells,
        uniforms: {
            u_matrix: function() {
                return mat4.scale([], mat4.create(), [2, 2, 2])
            },
            u_feedback: pixels,
            u_texture0: regl.prop('u_texture0'),
            u_time: regl.prop('u_time')
        },
        depth: { enable: false },
        blend: {
            enable: true,
            func: {
                srcRGB:   'src alpha',
                srcAlpha: 'src alpha',
                dstRGB:   'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        }
    })

    let lights_data = []
    let uniform_lights = {}
    for (let i = 0; i < N_LIGHTS; ++i) {
        lights_data[i] = {
            rotation: [
                1.0-rand()*2.0,
                1.0-rand()*2.0,
                rand()
            ],
            position: [
                4-rand()*8,
                4-rand()*8,
                16,
                1
            ],
            color: [
                rand(),
                rand(),
                rand(),
                1
            ]
        }
        uniform_lights[`u_lights[${i}].position`] = regl.prop(`light${i}_position`)
        uniform_lights[`u_lights[${i}].color`]    = regl.prop(`light${i}_color`)
        uniform_lights[`u_lights[${i}].specular`] = regl.prop(`light${i}_specular`)
    }

    function lights_update(playhead) {
        let lights = {}
        for (let i = 0; i < N_LIGHTS; ++i) {
            let intensity = (1/N_LIGHTS)*0.025
            intensity = 1.0;
            lights[`light${i}_position`] = (function(playhead) {
                let model = mat4.create()

                model = mat4.rotate([], model, playhead*TAU, lights_data[i].rotation)

                let result = vec4.transformMat4([], lights_data[i].position, model)
                return [result[0], result[1], result[2]]
            }(playhead))
            lights[`light${i}_color`] = [
                intensity,
                intensity,
                intensity,
                1
            ]
            lights[`light${i}_specular`] = [1, 1, 1, 1]
        }
        return lights
    }

    let particle_draw = regl({
        vert: `
        precision mediump float;
        #define PI 3.141592653589793

        struct Light {
            vec3 position;
            vec4 color;
            vec4 specular;
        };

        attribute vec3 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_uv;

        uniform mat4 u_projection, u_view, u_model;
        uniform vec2 u_resolution;
        uniform vec3 u_random, u_light_position, u_view_position;
        uniform float u_time;
        uniform Light u_lights[${N_LIGHTS}];

        varying vec4 v_vertex;
        varying vec3 v_vertex_position;
        varying vec3 v_normal;

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        void main() {
            vec4 position = vec4(a_position, 1.0);
            float t = 1.0-pow(abs(1.0-u_time*2.0), 1.5);

            gl_Position = u_projection*u_view*u_model*position;

            v_normal = a_normal;
            v_vertex = u_projection*u_view*u_model*position;
            v_vertex_position = (u_model*position).xyz;
        }
        `,
        frag: `
        #extension GL_OES_standard_derivatives : enable
        precision mediump float;
        #define PI 3.141592653589793

        struct Light {
            vec3 position;
            vec4 color;
            vec4 specular;
        };

        uniform float u_time, u_shininess;
        uniform vec2 u_resolution;
        uniform vec2 u_scale;
        uniform vec3 u_random, u_light_position, u_light_color, u_specular_color;
        uniform vec3 u_view_position;
        uniform vec3 u_color;
        uniform vec4 u_background;
        uniform Light u_lights[${N_LIGHTS}];

        varying vec4 v_vertex;
        varying vec3 v_vertex_position;
        varying vec3 v_normal;

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec4 color = vec4(u_color, 1.0);
            vec3 light = vec3(0.0);

            vec3 U = dFdx(v_vertex.xyz);
            vec3 V = dFdy(v_vertex.xyz);
            vec3 normal = normalize(cross(U,V));
            normal = normalize(v_normal);

            for (int i = 0; i < ${N_LIGHTS}; ++i) {
                vec3 light_dir = normalize(u_lights[i].position-v_vertex_position);
                vec3 half_vector = normalize(light_dir+(u_view_position-v_vertex_position));
                float diffuse = max(dot(normal, light_dir), 0.0);
                float specular = 0.0;

                light.rgb += diffuse*u_lights[i].color.rgb;
                light.rgb += specular*u_lights[i].specular.rgb;
            }

            color.rgb *= light;

            gl_FragColor = color;
        }
        `,
        attributes: {
            a_position: sphere.positions,
            a_normal  : sphere.normals,
            a_uv      : sphere.uvs
        },
        elements      : sphere.cells,
        uniforms: Object.assign({
            u_model: function(stats, {u_time, u_offset, u_scale}) {
                let result = mat4.create()
                // result = mat4.rotate([], result, u_time*TAU, [1, 0, 1])
                result = mat4.translate([], result, u_offset)
                result = mat4.scale([], result, [u_scale, u_scale, u_scale])

                return result
            },
            u_view: view,
            u_projection: projection,
            u_view_position: [0, 0, 4.0],
            u_shininess: 150,

            u_time: regl.prop('u_time'),
            u_color: fgc,
            u_scale: regl.prop('u_scale'),
            u_random: [rand(), rand(), rand()],
            u_offset: regl.prop('u_offset'),
            u_resolution: [width, height],
            u_background: [...bgc, 1]
        }, uniform_lights),
        primitive: 'triangles',
        blend: {
            enable: true,
            func: {
                srcRGB:   'src alpha',
                srcAlpha: 'src alpha',
                dstRGB:   'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        }
    })

    let parts = new Array(900)
        .fill(0)
        .map(function(v, i, a) {
            return {
                u_offset: [1.0-rand()*2.0, -2.0, 0],
                u_velocity: [0, 0.0005+rand()*0.015, 0]
            }
        })

    return {
        begin() {},
        render({ playhead, frame }) {
            regl.poll()
            regl.clear({color: [...bgc, 1], depth: 1})

            regl.clear({ color: bgc, depth: 1, framebuffer: render_target1024 })

            let lights = lights_update(playhead)

            render_target1024.use(function() {
                particle_draw(parts.map(function(part) {
                    part.u_offset[0] += part.u_velocity[0]
                    part.u_offset[1] += part.u_velocity[1]
                    part.u_offset[2] += part.u_velocity[2]

                    part.u_velocity[0] += (1.0-rand()*2.0)*0.000125
                    part.u_velocity[1] += (1.0-rand()*2.0)*0.000125
                    part.u_velocity[2] += (1.0-rand()*2.0)*0.000125

                    let result = Object.assign(part, Object.assign({
                        u_time: playhead,
                        u_scale: 0.05
                    }, lights))

                    return result
                }))
            })

            offscreen_render({
                u_time: playhead,
                u_texture0: render_target1024.color[0]
            })

            // particle_draw(parts.map(function(part) {
            //     let result = Object.assign(part, Object.assign({
            //         u_time: playhead,
            //         scale: 0.5
            //     }, lights))
            //     return result
            // }))

            // pixels({ copy: true, min: 'linear', mag: 'linear' })
        }
    }
}

canvasSketch(sketch, settings)

