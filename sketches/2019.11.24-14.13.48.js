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
let shader_utils = require('../glsl')

function diamond_make() {
    let v_front = [ 0,  0,  1]
    let v_back  = [ 0,  0, -1]
    let v_left  = [-1,  0,  0]
    let v_right = [ 1,  0,  0]
    let v_bot   = [ 0,  1,  0]
    let v_top   = [ 0, -1,  0]

    let positions = [
        ...v_left , ...v_top, ...v_front,
        ...v_front, ...v_top, ...v_right,
        ...v_right, ...v_top, ...v_back ,
        ...v_back , ...v_top, ...v_left ,

        ...v_left , ...v_front, ...v_bot,
        ...v_front, ...v_right, ...v_bot,
        ...v_right, ...v_back , ...v_bot,
        ...v_back , ...v_left , ...v_bot
    ]

    let normals = new Array(positions.length)
        .fill(0)
        .map(function(v, i) { return i%3 })
    let uvs     = new Array((positions.length/3)*2).fill(0)
    let cells   = new Array(positions.length/3)
        .fill(0)
        .map(function(v, i, a) { return i })

    return {
        positions: positions,
        normals  : normals,
        uvs      : uvs,
        cells    : cells
    }
}

let settings = {
    context: 'webgl',
    animate: true,
    duration: 8,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}


let sketch = async ({ gl, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2
    const N = 128

    let N_LIGHTS = 32

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
    let diamond = diamond_make()
    // let diamond = cube_make(1, 1, 1, 16, 16, 16)
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

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution;
            vec2 uv = v_uv;
            float t = u_time*PI;
            float s = 1.0;

            float noise = iqnoise(uv, 1.0, 0.0);

            vec4 color = texture2D(u_texture0, uv);

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
            a_uv: offscreen_render_panel.uvs,
        },
        elements: offscreen_render_panel.cells,
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
            u_time: regl.prop('u_time'),
            u_snap: regl.prop('u_snap'),
            u_scale: regl.prop('u_scale'),
            u_texture0: regl.prop('u_texture0'),
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
                1.0-rand()*2.0
            ],
            position: [
                4-rand()*8,
                4-rand()*8,
                4+rand()*4,
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
            lights[`light${i}_position`] = (function(playhead) {
                    let model = mat4.create()
                    model = mat4.rotate([], model, playhead*TAU, lights_data[i].rotation)

                    let result = vec4.transformMat4([], lights_data[i].position, model)
                    return [result[0], result[1], result[2]]
                }(playhead))
            lights[`light${i}_color`] = [intensity, intensity, intensity, 1]
            lights[`light${i}_specular`] = [1, 1, 1, 1]
        }
        return lights
    }

    let diamond_draw = regl({
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

            vec3 U = dFdx(v_vertex.xyz);
            vec3 V = dFdy(v_vertex.xyz);
            vec3 normal = normalize(cross(U,V));

            for (int i = 0; i < ${N_LIGHTS}; ++i) {
                vec3 light_dir = normalize(u_lights[i].position-v_vertex_position);
                vec3 half_vector = normalize(light_dir+(u_view_position-v_vertex_position));
                float diffuse = dot(normal, light_dir);
                float specular = 0.0;
                if (diffuse > 0.0) {
                    specular = pow(dot(normal, half_vector), u_shininess);
                }
                color.rgb += (diffuse*0.5+0.5)*u_lights[i].color.rgb;
                color.rgb += specular*u_lights[i].specular.rgb;
            }

            gl_FragColor = color;
        }
        `,
        attributes: {
            a_position: diamond.positions,
            a_normal  : diamond.normals,
            a_uv      : diamond.uvs,
        },
        elements      : diamond.cells,
        uniforms: Object.assign({
            u_model: function(stats, {u_time, u_random}) {
                let random = u_random.map(function(v) { return (1.0-v*2.0)*3 })
                let result = mat4.create()

                result = mat4.translate([], result, [0, 0, 0.125])
                result = mat4.scale([], result, [0.5, 0.75, 0.5])
                result = mat4.rotate([], result, u_time*TAU, random)

                return result
            },
            u_view: function(context, {u_time}) {
                return mat4.lookAt([], [0, 0, 1.5], [0, 0, 0], [0, 1, 0])
            },
            u_projection: function({viewportWidth: width, viewportHeight: height}) {
                return mat4.perspective([], PI/2, width/height, 0.01, 50)
            },
            u_view_position: [0, 0, 1.5],
            u_shininess: 150,

            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
            u_resolution: regl.prop('u_resolution'),
            u_background: regl.prop('u_background')
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

            vec3 U = dFdx(v_vertex.xyz);
            vec3 V = dFdy(v_vertex.xyz);
            vec3 normal = normalize(cross(U,V));

            for (int i = 0; i < ${N_LIGHTS}; ++i) {
                vec3 light_dir = normalize(u_lights[i].position-v_vertex_position);
                vec3 half_vector = normalize(light_dir+(u_view_position-v_vertex_position));
                float diffuse = max(0.0, dot(light_dir, normal))*0.5+0.5;
                float specular = 0.0;
                if (diffuse > 0.0) {
                    specular = pow(dot(normal, half_vector), u_shininess);
                }
                color.rgb += diffuse*u_lights[i].color.rgb;
                color.rgb += specular*u_lights[i].specular.rgb;
            }

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
            u_model: function(stats,) {
                let result = mat4.create()

                result = mat4.scale([], result, [4, 4, 4])
                result = mat4.rotate([], result, PI, [0, 1, 0])

                return result
            },
            u_view: function(context, {u_time}) {
                return mat4.lookAt([], [0, 0, 1.5], [0, 0, 0], [0, 1, 0])
            },
            u_projection: function({viewportWidth: width, viewportHeight: height}) {
                return mat4.perspective([], PI/2, width/height, 0.01, 50)
            },
            u_view_position: [0, 0, 1.5],
            u_shininess: 300,
            u_time: regl.prop('u_time'),
            u_color: regl.prop('u_color'),
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

    let diamonds = new Array(4)
        .fill(0)
        .map(function(v, i, a) {
            return {
                u_random: [rand(), rand(), rand()],
                u_resolution: [width, height],
                u_background: [...bgc, 1]
            }
        })

    return {
        begin() {},
        render({ playhead, frame }) {
            regl.poll()

            regl.clear({color: [...bgc, 1], depth: 1})
            regl.clear({ color: bgc, depth: 1, framebuffer: render_target1024 })

            render_target1024.use(function() {
                let lights = lights_update(playhead)

                plane_draw(Object.assign({
                    u_time: playhead,
                    u_color: [...bgc, 1]
                }, lights))

                diamond_draw(diamonds.map(function(sphere) {
                    sphere.u_time = playhead
                    s = Object.assign(sphere, lights)
                    return s
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
        }
    }
}

canvasSketch(sketch, settings)

