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
    duration: 10,
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

    let regl = create_regl({
        gl,
        extensions: ['webgl_draw_buffers', 'oes_texture_float']
    })

    let text_make = function(colour) {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let s = 1.0
        let fs = 164*s

        canvas.width = 1024*s
        canvas.height = 256*s
        ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
        ctx.font = `${fs}px UniversLTStd-UltraCn,sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('HEAVY & FRAGILE', canvas.width/2, fs+(fs/6))

        return regl.texture({ data: canvas, wrapS: 'repeat', wrapT: 'repeat' })
    }

    let noise_make = function() {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let s = 1.0

        canvas.width = 1024*s
        canvas.height = 256*s
        for (let i = 0; i < canvas.width*canvas.height; ++i)  {
            let m = 10
            let x = i%canvas.width
            let y = Math.floor(i/canvas.width)
            let n = simplex.noise2D((x/canvas.width)*m, (y/canvas.height)*m)
            ctx.fillStyle = `hsla(0, 0%, ${map(n, -1, 1, 0, 100)}%, 1)`
            ctx.fillRect(x, y, 1, 1)
        }

        return regl.texture({ data: canvas, wrapS: 'repeat' })
    }

    let load_sound = function(str) {
        return new Promise(function(resolve, reject) {
            new Tone.Player(str, function(player) {
                resolve(player)
            })
        })
    }

    let text = text_make()
    let noise = noise_make()
    let plane = plane_make(1, 256/1024, 64, 64)

    let bgc = hsluv.hsluvToRgb([rand()*360, rand()*50, rand()*100])

    let plane_colours = plane.cells.map((v) => {
        return [
            hsluv.hsluvToRgb([rand()*360, rand()*50, rand()*100]),
            hsluv.hsluvToRgb([rand()*360, rand()*50, rand()*100]),
            hsluv.hsluvToRgb([rand()*360, rand()*50, rand()*100])
        ]
    })

    let plane_fft = regl.buffer({
        usage: 'dynamic',
        type: 'float'
    })

    let plane_draw = regl({
        frag: `
        precision mediump float;
        #define PI 3.141592653589793
        uniform float u_time;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform sampler2D u_text, u_noise;

        varying float v_depth, v_fft;
        varying vec2 v_uv;
        varying vec3 v_color;


        float map_range(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec2 uv = v_uv;
            float fft = v_fft;
            uv.x += sin(st.x*PI)*(clamp(fft, -0.125, 0.125));
            // uv.y += sin(fft*0.5*st.y*PI*2.0);
            vec4 color = texture2D(u_text, uv);
            color.rgb = v_color.rgb;

            vec4 noise = texture2D(u_noise, uv);
            noise.rgb -= sin(u_time*(PI/2.0))*1.5;

            float fade_in = clamp(pow(u_time*16.0, 8.0), 0.0, 1.0);
            float fade_out = pow(clamp(length(noise.rgb), 0.0, 1.0), 4.0);

            color.a *= clamp(fade_in-fade_out, 0.0, 1.0);
            gl_FragColor = vec4(color);
        }`,

        vert: `
        precision mediump float;
        #define PI 3.141592653589793
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_color;
        attribute vec2 a_uv;
        attribute float a_fft;

        uniform float u_time;

        varying float v_depth, v_fft;
        varying vec2 v_uv;
        varying vec3 v_color;

        void main() {
            v_uv = a_uv;
            v_color = a_color;
            v_depth = a_position.z;
            v_fft = a_fft;
            vec3 position = a_position;
            position.x *= 1.0+sin(u_time*PI/2.0)*a_fft;
            gl_Position = u_projection*u_view*u_matrix*vec4(position, 1.0);
        }`,

        attributes: {
            a_position: plane.positions,
            a_uv: plane.uvs,
            a_color: plane_colours,
            a_fft: plane_fft
        },

        elements: plane.cells,

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0  , 0  , -0.5], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                let { u_time, u_index, u_random } = props
                let tra = mat4.translate([], mat4.identity([]), [
                    0,
                    0,
                    0
                ])
                return mat4.scale([], tra, [ -1, -1, 1 ])
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
            u_resolution: regl.prop('u_resolution'),
            u_text: regl.prop('u_text'),
            u_noise: regl.prop('u_noise')
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

    let plane_elements = [
        {
            u_resolution: [width, height],
            u_random: [rand(), rand(), rand()],
            u_text: text,
            u_noise: noise,
            u_index: 0
        }
    ]

    let player = await load_sound(`/assets/2019_05_31.mp3`)
    let fft = new Tone.FFT(plane.cells.length)
    player.connect(fft)
    player.toMaster()
    player.autostart = true
    player.loop = true

    return {
        begin() {
            player.restart()
        },
        render({ playhead }) {
            regl.poll()
            regl.clear({color: [...bgc, 1], depth: 1})

            let fft_v = fft.getValue().map(function(value) {
                return map(value, -200, 0, -1, 1)
            })

            plane_fft({ data: fft.getValue().map(v => map(v, -200, 0, -1, 1))})

            plane_draw(plane_elements.map(function(value) {
                return Object.assign(value, {u_time: playhead})
            }))

        }
    }
}

canvasSketch(sketch, settings)


