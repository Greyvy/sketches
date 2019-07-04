let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let Tone = require('tone')
let load = require('load-asset')
let create_regl = require('regl')
let icosphere_make = require('primitive-icosphere')
let cube_make = require('geo-3d-box')
let hsluv = require('hsluv')
let seed = require('seed-random')
let mat4 = require('gl-mat4')
let vec3 = require('gl-vec3')

let settings = {
    context: 'webgl',
    animate: true,
    duration: 8.64,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}

let sketch = async ({ gl, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2
    const N = 128

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))
    let ease = (p, g) => {
      if (p < 0.5)
        return 0.5 * Math.pow(2*p, g)
      else
        return 1 - 0.5 * Math.pow(2*(1 - p), g)
    }

    let seed_value = Math.floor(Math.random()*1000)
    let rand = seed(seed_value)
    let simplex = new SimplexNoise(seed_value)
    let load_sound = function(str) {
        return new Promise(function(resolve, reject) {
            new Tone.Player(str, function(player) {
                resolve(player)
            })
        })
    }

    let regl = create_regl({
        gl,
        extensions: ['webgl_draw_buffers', 'oes_texture_float', 'oes_standard_derivatives']
    })

    let text_make = function(colour) {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let fs = 240

        canvas.width = width
        canvas.height = height
        ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.font = `${fs}px DINEngschriftStd,sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('MOON MOON', canvas.width/2, (height/2)+(fs/3))

        return regl.texture({ data: canvas, wrapS: 'repeat', wrapT: 'repeat' })
    }


    let icosphere = icosphere_make(1, { subdivisions: 1 })
    let text = text_make()

    let bgc = hsluv.hsluvToRgb([rand()*360, rand()*100, rand()*30])

    let icosphere_colour = hsluv.hsluvToRgb([0, 0, rand()*100])
    let icosphere_colours = icosphere.cells.map((v, i, a) => {
        return [icosphere_colour, icosphere_colour, icosphere_colour]
    })

    let icosphere_fft = regl.texture({
        shape: [N/4, N/4, 4],
        min: 'linear',
        mag: 'linear',
        wrapS: 'repeat',
        wrapT: 'repeat'
    })

    let icosphere_draw = regl({
        frag: `
        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        #endif
        precision mediump float;
        #define PI 3.141592653589793

        mat2 myt = mat2(0.12121212, 0.13131313, -0.13131313, 0.12121212);
        vec2 mys = vec2(1e4, 1e6);

        uniform float u_time;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform sampler2D u_text, u_fft;

        varying float v_depth;
        varying vec2 v_uv;
        varying vec3 v_normal, v_vertex, v_color;

        vec2 rhash(vec2 uv) {
            uv *= myt;
            uv *= mys;
            return fract(fract(uv/mys)*uv);
        }

        vec3 hash(vec3 p) {
            return fract(sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)),
                                  dot(p, vec3(57.0, 113.0, 1.0)),
                                  dot(p, vec3(113.0, 1.0, 57.0))))*
                        43758.5453);
        }

        float voronoi2d(in vec2 point) {
            vec2 p = floor(point);
            vec2 f = fract(point);
            float res = 0.0;
            for (int j = -1; j <= 1; j++) {
                for (int i = -1; i <= 1; i++) {
                    vec2 b = vec2(i, j);
                    vec2 r = vec2(b)-f+rhash(p+b);
                    res += 1.0/pow(dot(r, r), 8.0);
                }
            }
            return pow(1.0/res, 0.0625);
        }

        vec3 voronoi3d(in vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);

            float id = 0.0;
            vec2 res = vec2(100.0);
            for (int k = -1; k <= 1; k++) {
                for (int j = -1; j <= 1; j++) {
                    for (int i = -1; i <= 1; i++) {
                        vec3 b = vec3(float(i), float(j), float(k));
                        vec3 r = vec3(b)-f+hash(p+b);
                        float d = dot(r, r);

                        float cond = max(sign(res.x-d), 0.0);
                        float nCond = 1.0-cond;

                        float cond2 = nCond*max(sign(res.y-d), 0.0);
                        float nCond2 = 1.0-cond2;

                        id = (dot(p+b, vec3(1.0, 57.0, 113.0))*cond)+(id*nCond);
                        res = vec2(d, res.x)*cond+res*nCond;

                        res.y = cond2*d+nCond2*res.y;
                    }
                }
            }
            return vec3(sqrt(res), abs(id));
        }

        float map_range(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            vec3 U = dFdx(v_vertex);
            vec3 V = dFdy(v_vertex);
            vec3 normal = normalize(cross(U,V));
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec2 uv = v_uv;
            float t = sin(u_time*PI);

            vec2 uv_move = vec2(uv);
            uv_move.x += sin(u_time*PI*2.0);
            uv_move.y += cos(u_time*PI*-2.0)*0.125;

            vec4 fft = texture2D(u_fft, uv);
            vec4 text = texture2D(u_text, uv_move);
            vec4 text_distorted = texture2D(u_text, uv+fft.rg);
            vec4 color = vec4(text);
            vec3 light_direction = normalize(vec3(0.3, 0.7, 1.0));
            vec3 noise = voronoi3d(vec3(uv+fft.rg, u_time)*4.0);

            float light_intensity = dot(normal, light_direction);

            color.rgb *= noise;
            // color.rgb = mix(color.rgb, u_random*noise, 0.5);
            // color.rgba = min(color, vec4(u_random*noise, noise.r));
            color.bg *= light_intensity;

            gl_FragColor = vec4(color);
        }`,

        vert: `
        precision mediump float;
        #define PI 3.141592653589793

        mat2 myt = mat2(0.12121212, 0.13131313, -0.13131313, 0.12121212);
        vec2 mys = vec2(1e4, 1e6);

        attribute vec3 a_position, a_color, a_normal;
        attribute vec2 a_uv;

        uniform mat4 u_projection, u_view, u_matrix;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform float u_time;

        varying float v_depth;
        varying vec2 v_uv;
        varying vec3 v_normal, v_vertex, v_color;

        vec2 rhash(vec2 uv) {
            uv *= myt;
            uv *= mys;
            return fract(fract(uv/mys)*uv);
        }

        vec3 hash(vec3 p) {
            return fract(sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)),
                                  dot(p, vec3(57.0, 113.0, 1.0)),
                                  dot(p, vec3(113.0, 1.0, 57.0))))*
                        43758.5453);
        }

        float voronoi2d(in vec2 point) {
            vec2 p = floor(point);
            vec2 f = fract(point);
            float res = 0.0;
            for (int j = -1; j <= 1; j++) {
                for (int i = -1; i <= 1; i++) {
                    vec2 b = vec2(i, j);
                    vec2 r = vec2(b)-f+rhash(p+b);
                    res += 1.0/pow(dot(r, r), 8.0);
                }
            }
            return pow(1.0/res, 0.0625);
        }

        vec3 voronoi3d(in vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);

            float id = 0.0;
            vec2 res = vec2(100.0);
            for (int k = -1; k <= 1; k++) {
                for (int j = -1; j <= 1; j++) {
                    for (int i = -1; i <= 1; i++) {
                        vec3 b = vec3(float(i), float(j), float(k));
                        vec3 r = vec3(b)-f+hash(p+b);
                        float d = dot(r, r);

                        float cond = max(sign(res.x-d), 0.0);
                        float nCond = 1.0-cond;

                        float cond2 = nCond*max(sign(res.y-d), 0.0);
                        float nCond2 = 1.0-cond2;

                        id = (dot(p+b, vec3(1.0, 57.0, 113.0))*cond)+(id*nCond);
                        res = vec2(d, res.x)*cond+res*nCond;

                        res.y = cond2*d+nCond2*res.y;
                    }
                }
            }
            return vec3(sqrt(res), abs(id));
        }

        float map_range(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {

            vec4 fake_frag_coord = u_matrix*vec4(a_position, 1.0);
            fake_frag_coord.xyz /= fake_frag_coord.w;
            fake_frag_coord.w = 1.0/fake_frag_coord.w;

            fake_frag_coord.xyz *= vec3(0.5)+vec3(0.5);
            fake_frag_coord.xy *= u_resolution.xy;

            vec2 st = fake_frag_coord.xy/u_resolution.xy;

            vec4 norm = u_matrix*vec4(a_normal.xyz, 1.0);
            vec3 position = a_position;

            v_uv = a_uv;
            v_color = a_color;
            v_normal = vec3(norm.xyz);
            v_depth = position.z;
            v_vertex = (u_matrix*vec4(a_position, 1.0)).xyz;

            gl_Position = u_projection*u_view*u_matrix*vec4(position, 1.0);
        }`,

        attributes: {
            a_position: icosphere.positions,
            a_uv: icosphere.uvs,
            a_normal: icosphere.normals,
            a_color: icosphere_colours,
        },

        elements: icosphere.cells,

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0.0, 0.0, 1.5], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                let { u_time, u_index, u_random, u_resolution } = props
                let tra = mat4.translate([], mat4.identity([]), [0, 0, 0])
                let rot = mat4.rotate([], tra, Math.sin(u_time*PI*2.0)*(PI/4), [-u_random[0], u_random[1], 0])
                return mat4.scale([], rot, [0.5, 0.5, 0.5])
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
            u_resolution: regl.prop('u_resolution'),
            u_position: regl.prop('u_position'),
            u_text: regl.prop('u_text'),
            u_fft: regl.prop('u_fft')
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


    let icosphere_elements = new Array(1)
        .fill({})
        .map(function(value, i) {
            return {
                u_resolution: [width, height],
                u_random: [rand(), rand(), rand()],
                u_index: i,
                u_text: text
            }
        })

    let player = await load_sound(`/assets/2019_07_05.mp3`)
    let fft = new Tone.FFT(N*N)
    let fft_r = new Uint8Array(N*N)
    player.connect(fft)
    player.toMaster()
    player.autostart = true
    player.loop = true

    return {
        begin() {
            player.restart()
        },
        render ({ playhead }) {
            regl.poll()
            regl.clear({color: [...bgc, 1], depth: 1})

            let fft_v = fft.getValue()
            for (let i = 0; i < fft_v.length; i++) {
                fft_r[i] = Math.floor(map(fft_v[i], -20, 0, 0, 255))
            }
            icosphere_fft.subimage(fft_r)

            icosphere_draw(icosphere_elements.map(function(value) {
                return Object.assign(value, { u_time: playhead, u_fft: icosphere_fft })
            }))
        }
    }
}

canvasSketch(sketch, settings)


