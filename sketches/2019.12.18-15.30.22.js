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
const N_LIGHTS = 4

let settings = {
    context: 'webgl',
    animate: true,
    duration: 8.62,
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
    let torus = torus_make()
    let fgc = hsluv.hsluvToRgb([rand()*360, rand()*100, 25+rand()*50])
    let bgc = hsluv.hsluvToRgb([rand()*360, rand()*100, rand()*100])

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
            vec2 uv = v_uv;
            vec4 fft = texture2D(u_fft, uv);
            float t = u_time*PI;

            float noise = iqnoise(uv, 1.0, 0.0);

            vec4 color = texture2D(u_texture0, uv+vec2(fft.y*0.25, 0.0));

            gl_FragColor = vec4(color);
        }
        `,
        vert: `
        attribute vec3 a_position;
        attribute vec2 a_uv;

        uniform mat4 u_projection, u_view, u_matrix;
        uniform sampler2D u_fft;

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
            lights[`light${i}_color`] = lights_data[i].color
            lights[`light${i}_specular`] = [1, 1, 1, 1]
        }
        return lights
    }


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
        uniform sampler2D u_fft;

        varying vec4 v_vertex;
        varying vec3 v_normal, v_vertex_position;
        varying vec2 v_uv;

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        void main() {
            vec4 position = vec4(a_position, 1.0);
            vec4 fft = texture2D(u_fft, a_uv);
            vec3 normal = normalize(a_normal);
            vec2 uv = a_uv;
            float t = 1.0-pow(abs(1.0-u_time*2.0), 1.5);

            position.xyz += fft.xyz;

            gl_Position = u_projection*u_view*u_model*position;

            v_uv = a_uv;
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
        uniform vec3 u_color;
        uniform vec4 u_background;
        uniform Light u_lights[${N_LIGHTS}];
        uniform sampler2D u_fft;

        varying vec4 v_vertex;
        varying vec3 v_normal, v_vertex_position;
        varying vec2 v_uv;

        ${shader_utils.utils}
        ${shader_utils.voronoi}
        ${shader_utils.voronoise}
        ${shader_utils.fbm}

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec4 color = vec4(u_color, 1.0);
            vec4 fft = texture2D(u_fft, v_uv);
            vec3 light = vec3(0.0);

            color.rgb = fft.rgb;

            vec3 U = dFdx(v_vertex.xyz);
            vec3 V = dFdy(v_vertex.xyz);
            vec3 normal = normalize(cross(U,V));
            normal = v_normal;

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
            a_position: torus.positions,
            a_normal  : torus.normals,
            a_uv      : torus.uvs,
        },
        elements      : torus.cells,
        uniforms: Object.assign({
            u_model: function(stats, {u_time, u_row, u_random, u_translate}) {
                let random = u_random.map(function(v) { return (1.0-v*2.0) })
                let scale = 0.0125+(0.24*u_random[0])
                let result = mat4.create()

                let x = 2.0-((((1.0+u_translate[0]+u_time)/2.0))%0.5)*8.0
                let translate = [x, u_translate[1], u_translate[2]]

                result = mat4.rotate([], result, PI, [0, 0, 1])
                result = mat4.scale([], result, [u_row%2 === 0 ? -1 : 1, 1, 1])
                result = mat4.translate([], result, translate)
                result = mat4.rotate([], result, random[0]+random[1]+u_time*TAU*4.0, [
                    x,
                    u_translate[1],
                    u_random[2]
                ])
                result = mat4.scale([], result, [scale, scale, scale])

                return result
            },
            u_view: view,
            u_projection: projection,
            u_view_position: [0, 0, 1.5],
            u_shininess: 150,

            u_fft: tex_fft,
            u_time: regl.prop('u_time'),
            u_color: fgc,
            u_random: regl.prop('u_random'),
            u_resolution: regl.prop('u_resolution'),
            u_background: regl.prop('u_background')
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

    let player = await load_sound(`/assets/2019_12_20.mp3`)
    let fft = new Tone.FFT(N*N)
    let fft_r = new Uint8Array(N*N)
    player.connect(fft)
    player.toMaster()
    player.autostart = true
    player.loop = true

    const NUM_COLS = 7
    const NUM_ROWS = 4

    let torusus = new Array(NUM_COLS*NUM_ROWS)
        .fill(0)
        .map(function(v, i, a) {
            let t = i/(a.length-1)
            let x = 1.0-((i%NUM_COLS)/(NUM_COLS))*2.0
            let y = 1.0-(Math.floor(i/NUM_COLS)/(NUM_ROWS-1))*2.0
            let row = Math.floor(i/NUM_COLS-1)
            return {
                u_random: [rand(), rand(), rand()],
                u_resolution: [width, height],
                u_background: [...bgc, 1],
                u_translate: [x, y, 0],
                u_row: row
            }
        })

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
                fft_r[i] = lerp(fft_r[i], Math.floor(map(fft_v[i], -40, 0, 0, 255)), 0.006)
            }
            tex_fft.subimage(fft_r)

            render_target1024.use(function() {
                let lights = lights_update(playhead)

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


