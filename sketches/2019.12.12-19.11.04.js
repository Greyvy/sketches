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
const N_LIGHTS = 1

let settings = {
    context: 'webgl',
    animate: true,
    duration: 8.05,
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

    let plane = plane_make(1, 1, 16, 16)
    let torus = torus_make({ majorSegments: 128, minorSegments: 256 })
    let bgc = hsluv.hsluvToRgb([rand()*360, 100, rand()*100])

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

    let tex_fft = regl.texture({
        shape: [1, N/4, 4],
        min: 'linear',
        mag: 'linear',
        wrapS: 'repeat',
        wrapT: 'repeat'
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

        uniform float u_time, u_snap;
        uniform vec2 u_resolution;
        uniform sampler2D u_texture0;
        uniform sampler2D u_feedback;
        uniform sampler2D u_fft;

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution;
            vec2 uv = 1.0-abs(fract((v_uv*2.0)*0.5)*2.0-1.0);
            vec4 fft = texture2D(u_fft, uv);
            float t = u_time*PI;

            float noise = iqnoise(uv, 1.0, length(fft));

            vec4 color = texture2D(u_texture0, uv*noise);

            gl_FragColor = vec4(color);
        }
        `,
        vert: `
        attribute vec3 a_position;
        attribute vec2 a_uv;

        uniform mat4 u_projection, u_view, u_matrix;

        varying vec2 v_uv;

        void main() {
            v_uv = a_uv;
            gl_Position = u_projection*u_view*u_matrix*vec4(a_position, 1.0);
        }
        `,
        attributes: {
            a_position: offscreen_render_panel.positions,
            a_uv      : offscreen_render_panel.uvs,
        },
        elements      : offscreen_render_panel.cells,
        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0.0, 0.0, 1.0], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                let { u_scale, u_translate } = props
                let tra = mat4.translate([], mat4.identity([]), u_translate)
                return mat4.scale([], tra, u_scale)
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_fft: tex_fft,
            u_time: regl.prop('u_time'),
            u_snap: regl.prop('u_snap'),
            u_scale: regl.prop('u_scale'),
            u_texture0: regl.prop('u_texture0'),
            u_feedback: pixels,
            u_resolution: regl.prop('u_resolution')
        },
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


    torus_positions = regl.buffer({ data: torus.positions, usage: 'dynamic' })
    torus_normals   = regl.buffer({ data: torus.normals  , usage: 'dynamic' })

    let torus_draw = regl({
        vert: `
        precision mediump float;
        #define PI 3.141592653589793

        struct Light {
            vec3 position;
            vec4 color;
            vec4 specular;
        };

        attribute vec3 a_position, a_normal;
        attribute vec2 a_uv;

        uniform mat4 u_projection, u_view, u_model;
        uniform vec2 u_resolution;
        uniform vec3 u_random, u_light_position, u_view_position;
        uniform float u_time, u_index, u_length, u_linewidth;
        uniform Light u_lights[${N_LIGHTS}];

        varying vec4 v_vertex;
        varying vec3 v_normal, v_vertex_position;

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        void main() {
            vec4 position = vec4(a_position, 1.0);
            vec3 normal = normalize(a_normal);
            vec2 uv = a_uv;
            float t = 1.0-pow(abs(1.0-u_time*2.0), 1.5);

            gl_PointSize = 4.0+position.z;

            gl_Position = u_projection*u_view*u_model*position;

            v_normal = normalize((u_model*vec4(a_normal, 1.0)).xyz);
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
        uniform vec3 u_random, u_light_position, u_light_color, u_specular_color;
        uniform vec3 u_view_position;
        uniform vec4 u_background;
        uniform Light u_lights[${N_LIGHTS}];

        varying vec4 v_vertex;
        varying vec3 v_normal, v_vertex_position;

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec4 color = vec4(1.0-vec3(u_background), 1.0);
            vec3 light = vec3(0.0);

            vec3 U = dFdx(v_vertex.xyz);
            vec3 V = dFdy(v_vertex.xyz);
            vec3 normal = normalize(cross(U,V));
            normal = v_normal;

            for (int i = 0; i < ${N_LIGHTS}; ++i) {
                vec3 light_dir = normalize(u_lights[i].position-v_vertex_position);
                vec3 half_vector = normalize(light_dir+(u_view_position-v_vertex_position));
                float diffuse = max(dot(normal, light_dir), 0.0);
                float specular = 0.0;

                light.rgb += (diffuse*u_lights[i].color.rgb)*1.0/${N_LIGHTS}.0;
                light.rgb += specular*u_lights[i].specular.rgb;
            }

            color.rgb *= light;

            gl_FragColor = color;
        }
        `,
        attributes: {
            a_position: torus_positions,
            a_normal  : torus_normals,
            a_uv      : torus.uvs,
        },
        elements      : torus.cells,
        uniforms: Object.assign({
            u_model: function(stats, {u_time, u_random, u_translate}) {
                let random = u_random.map(function(v) { return (1.0-v*2.0)*3 })
                let translate = u_translate.map(function(v) { return v*0.85 })
                let result = mat4.create()

                result = mat4.translate([], result, translate)

                return result
            },
            u_view: view,
            u_projection: projection,
            u_view_position: [0, 0, 1.5],
            u_shininess: 150,

            u_fft: tex_fft,
            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
            u_resolution: regl.prop('u_resolution'),
            u_background: regl.prop('u_background')
        }, uniform_lights),
        primitive: 'points',
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


    let plane_draw = regl({
        vert: `
        precision mediump float;
        #define PI 3.141592653589793

        struct Light {
            vec3 position;
            vec4 color;
            vec4 specular;
        };

        attribute vec3 a_position, a_normal;

        uniform mat4 u_projection, u_view, u_model;
        uniform vec3 u_light_position, u_view_position;
        uniform Light u_lights[${N_LIGHTS}];
        uniform float u_time;

        varying vec3 v_normal, v_vertex_position;
        varying vec4 v_vertex;

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        void main() {
            vec4 position = vec4(a_position, 1.0);
            vec3 normal = normalize(a_normal);
            float t = 1.0-pow(abs(1.0-u_time*2.0), 1.5);

            gl_Position = u_projection*u_view*u_model*position;

            v_normal = a_normal;
            v_vertex_position = (u_model*position).xyz;
            v_vertex = u_projection*u_view*u_model*position;
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

        uniform float u_shininess;
        uniform vec3 u_light_position, u_light_color, u_specular_color;
        uniform vec3 u_view_position;
        uniform vec4 u_color;
        uniform Light u_lights[${N_LIGHTS}];

        varying vec3 v_normal, v_vertex_position;
        varying vec4 v_vertex;

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        void main() {
            vec4 color = u_color;
            vec3 light = vec3(0.0);
            vec3 normal = v_normal;

            for (int i = 0; i < ${N_LIGHTS}; ++i) {
                vec3 light_dir = normalize(u_lights[i].position-v_vertex_position);
                vec3 half_vector = normalize(light_dir+(u_view_position-v_vertex_position));
                float diffuse = max(dot(light_dir, normal), 0.0);
                float specular = pow(dot(normal, half_vector), u_shininess);

                light.rgb += (diffuse*u_lights[i].color.rgb)*1.0/${N_LIGHTS}.0;
                light.rgb += specular*u_lights[i].specular.rgb;
            }

            color.rgb *= light;

            gl_FragColor = color;
        }
        `,
        attributes: {
            a_position: plane.positions,
            a_normal  : plane.normals,
            a_uv      : plane.uvs
        },
        elements      : plane.cells,
        uniforms: Object.assign({
            u_model: function(context) {
                let result = mat4.create()

                result = mat4.translate([], result, [0, 0, -2])
                result = mat4.scale([], result, [8, 8, 8])
                result = mat4.rotate([], result, PI, [0, 1, 0])

                return result
            },
            u_fft: tex_fft,
            u_view: view,
            u_projection: projection,
            u_view_position: [0, 0, 1.5],
            u_shininess: 300,
            u_time: regl.prop('u_time'),
            u_color: regl.prop('u_color')
        }, uniform_lights),
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

    let player = await load_sound(`/assets/2019_11_29.mp3`)
    let fft = new Tone.FFT(N*N)
    let fft_r = new Uint8Array(N*N)
    player.connect(fft)
    player.toMaster()
    player.autostart = true
    player.loop = true

    let torusus = new Array(1)
        .fill(0)
        .map(function(v, i, a) {
            return {
                u_random: [rand(), rand(), rand()],
                u_resolution: [width, height],
                u_background: [...bgc, 1],
                u_translate: [0, 0, 0.125]
            }
        })

    let torus_twist_positions = new Array(torus.positions.length)
        .fill(0)
    let torus_twist_normals = new Array(torus.normals.length)
        .fill(0)

    let noise = 0

    return {
        begin() {
            player.restart()
        },
        render({ playhead, frame }) {
            regl.poll()

            regl.clear({color: [...bgc, 1], depth: 1})
            regl.clear({ color: bgc, depth: 1, framebuffer: render_target1024 })

            let fft_v = fft.getValue()
            for (let i = 0; i < fft_v.length; ++i) {
                fft_r[i] = Math.floor(map(fft_v[i], -40, 0, 0, 255))
            }
            tex_fft.subimage(fft_r)

            for (let i = 0; i < torus.positions.length; ++i) {
                let v = torus.positions[i]
                let vx = v[0]
                let vy = v[1]
                let vz = v[2]

                let n = torus.normals[i]
                let nx = n[0]
                let ny = n[1]
                let nz = n[2]

                let t = 1.0-Math.pow(Math.abs(1.0-playhead*2.0), 1.5)
                // noise = simplex.noise2D(vy, ease(t, 1.5))
                noise = lerp(noise, fft_r[0]*0.0125, 0.016)

                let vert_result = vec4.fromValues(vx, vy, vz, 1)
                let norm_result = vec4.fromValues(nx, ny, nz, 1)

                let transform = mat4.translate([], mat4.create(), vec3.scale([], vec3.fromValues(nx, ny, nz), noise*0.0125))
                transform = mat4.rotate([], transform, (vy+noise)+playhead*TAU,
                    [noise*0.0125, 1, 1])

                vert_result = vec4.transformMat4([], vert_result, transform)
                norm_result = vec4.transformMat4([], norm_result, transform)

                torus_twist_positions[i] = [
                    vert_result[0],
                    vert_result[1],
                    vert_result[2]
                ]
                torus_twist_normals[i] = [
                    norm_result[0],
                    norm_result[1],
                    norm_result[2]
                ]
            }
            torus_positions({ data: torus_twist_positions })
            torus_normals({ data: torus_twist_normals })

            render_target1024.use(function() {
                let lights = lights_update(playhead)

                plane_draw(Object.assign({
                    u_time: playhead,
                    u_color: [...bgc, 1]
                }, lights))

                torus_draw(torusus.map(function(torus) {
                    torus.u_time = playhead
                    return Object.assign(torus, lights)
                }))
            })

            offscreen_render({
                u_resolution: [width, height],
                u_texture0: render_target1024.color[0],
                u_time: playhead,
                u_snap: rand(),
                u_scale: [2, 2, 2],
                u_translate: [0, 0, 0],
            })

            pixels({ copy: true })
        }
    }
}

canvasSketch(sketch, settings)

