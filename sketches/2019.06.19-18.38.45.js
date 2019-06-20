let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let Tone = require('tone')
let load = require('load-asset')
let create_regl = require('regl')
let plane_make = require('primitive-plane')
let hsluv = require('hsluv')
let seed = require('seed-random')
let mat4 = require('gl-mat4')
let vec3 = require('gl-vec3')

let settings = {
    context: 'webgl',
    animate: true,
    duration: 7.42,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}

let sketch = async ({ gl, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))

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
        extensions: ['webgl_draw_buffers', 'oes_texture_float']
    })

    let text_make = function(str) {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let fs = 160

        canvas.width = 1024
        canvas.height = fs+96
        ctx.fillStyle = 'hsla(0, 50%, 50%, 1)'

        // ctx.strokeRect(0, 0, 1024, fs+90)

        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.font = `${fs}px SFCompactRounded-Black`
        ctx.textAlign = 'center'
        ctx.fillText(str, canvas.width/2, fs)

        return regl.texture({ data: canvas, wrapS: 'repeat', wrapT: 'repeat' })
    }

    let text0 = text_make('engagement')
    let text1 = text_make('sedation')
    let plane = plane_make(1, (160+96)/1024, 32, 32)

    let bgc = hsluv.hsluvToRgb([rand()*360, rand()*100, rand()*100])

    let plane_colour = hsluv.hsluvToRgb([0, 0, rand()*100])
    let plane_colours = plane.cells.map((v, i, a) => {
        /*
        return [
            hsluv.hsluvToRgb([0, 0, rand()*100]),
            hsluv.hsluvToRgb([0, 0, rand()*100]),
            hsluv.hsluvToRgb([0, 0, rand()*100])
        ]
        */
        return [ plane_colour, plane_colour, plane_colour ]
    })

    let N = 8192
    let plane_fft = regl.texture({
        shape: [1, N/4, 4],
        min: 'linear',
        mag: 'linear',
        wrapS: 'repeat',
        wrapT: 'repeat'
    })


    let plane_draw = regl({
        frag: `
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
        varying vec3 v_color;

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
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec2 uv = v_uv;

            float t = sin(u_time*PI);
            float n = voronoi2d(vec2(length(st)+v_depth, t)*2.0);

            vec4 fft = texture2D(u_fft, uv);

            uv.y += sin((st.x*16.0)+u_time*PI*8.0)*n*(length(fft)*0.075);
            uv.x += u_time+(length(fft.xyz)*0.05);

            vec4 color = texture2D(u_text, uv);
            color.rgb = fft.rgb*u_random;

            gl_FragColor = vec4(color);
            gl_FragColor.rgb *= gl_FragColor.a;
        }`,

        vert: `
        precision mediump float;
        #define PI 3.141592653589793

        mat2 myt = mat2(0.12121212, 0.13131313, -0.13131313, 0.12121212);
        vec2 mys = vec2(1e4, 1e6);

        attribute vec3 a_position, a_color;
        attribute vec2 a_uv;

        uniform mat4 u_projection, u_view, u_matrix;
        uniform sampler2D u_fft;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform float u_time;

        varying float v_depth;
        varying vec2 v_uv;
        varying vec3 v_color;

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

            v_uv = a_uv;
            v_color = a_color;
            vec3 position = a_position;

            // float t = sin(u_time*PI);
            // position.xyz *= voronoi3d(vec3(st+u_random.xy, t)*2.0);

            // v_depth = position.z;

            gl_Position = u_projection*u_view*u_matrix*vec4(position, 1.0);
        }`,

        attributes: {
            a_position: plane.positions,
            a_uv: plane.uvs,
            a_color: plane_colours,
        },

        elements: plane.cells,

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0  , 0  , -1],  // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                let { u_time, u_index, u_length, u_random } = props
                let rot = mat4.rotate([], mat4.identity([]), u_time*PI*2.0, [-1, 0, 0])
                let tra = mat4.translate([], rot, [
                    0,
                    Math.cos(map(u_index, 0, u_length, 0, 1)*PI*2.0)*0.5,
                    Math.sin(map(u_index, 0, u_length, 0, 1)*PI*2.0)*0.5
                ])
                let rit = mat4.rotate([], tra, u_time*PI*2.0, [1, 0, 0])
                return mat4.scale([], rit, [ -1, -1, 1 ])
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
            u_resolution: regl.prop('u_resolution'),
            u_text: regl.prop('u_text'),
            u_fft: regl.prop('u_fft'),
            u_length: regl.prop('u_length'),
            u_index: regl.prop('u_index')
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
        depth: {
            enable: false
        },
        primitive: 'triangles'
    })

    let plane_elements = new Array(16)
        .fill({})
        .map(function(value, i, a) {
            return {
                u_resolution: [width, height],
                u_random: [rand(), rand(), rand()],
                u_text: i % 2 === 0 ? text0 : text1,
                u_index: i,
                u_length: a.length
            }
        })

    let player = await load_sound(`/assets/2019_06_21.mp3`)
    let fft = new Tone.FFT(N)
    let fft_r = new Uint8Array(N)
    player.connect(fft)
    player.toMaster()
    player.autostart = true
    player.loop = true

    return {
        begin() {
            player.restart()
        },
        render({ playhead }){
            regl.poll()
            regl.clear({color: [...bgc, 1], depth: 1})

            let fft_v = fft.getValue()
            for (let i = 0; i < fft_v.length; i += 1) {
                fft_r[i] = Math.floor(map(fft_v[i], -80, 0, 0, 255))
            }
            plane_fft.subimage(fft_r)

            plane_draw(plane_elements.map(function(value) {
                return Object.assign(value, {
                    u_time: playhead,
                    u_fft: plane_fft
                })
            }))
        }
    }
}

canvasSketch(sketch, settings)


