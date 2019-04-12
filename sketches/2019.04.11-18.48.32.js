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

    let pane_make = (rows=5) => {
        let positions = []
        let cells = []
        let uvs = []

        for (let i = 0; i < rows; ++i) {
            positions.push([-1, map(i/(rows-1), 0, 1, 1, -1), 0])
            positions.push([ 1, map(i/(rows-1), 0, 1, 1, -1), 0])
            uvs.push([0, map(i/(rows-1), 0, 1, 1, 0)])
            uvs.push([1, map(i/(rows-1), 0, 1, 1, 0)])
        }

        for (let i = 0; i < positions.length-2; i+=2) {
            cells.push([i+0, i+1, i+2])
            cells.push([i+1, i+3, i+2])
        }

        return { positions, cells, uvs }
    }

    let pane = pane_make(128)

    let bgc = hsluv.hsluvToRgb([rand()*360, rand()*100, rand()*100])
    let pane_colour = rand()*360
    let pane_colours = pane.positions.map((_, i) => {
        return hsluv.hsluvToRgb([pane_colour, rand()*i, rand()*100])
    })

    let pane_offsets = pane.positions.map((v, i, a) => {
        let result = [
            simplex.noise2D(...v),
            simplex.noise3D(...v),
            simplex.noise4D(...v, i/(a.length-1))
        ]
        return result
    })

    let pane_draw = regl({
        frag: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time, u_offset;
        uniform vec3 u_color, u_random;
        uniform sampler2D u_fft;

        varying vec3 v_color;
        varying float v_depth, v_opacity;
        varying vec2 v_uv;

        float map(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            vec3 col = v_color;
            vec4 off = texture2D(u_fft, v_uv);

            off.r = map(off.r, 0.0, 100.0, 0.0, 0.75);
            off.g = map(off.g, 0.0, 100.0, 0.0, 0.75);
            off.b = map(off.b, 0.0, 100.0, 0.0, 0.75);

            col.rgb += off.rgb;
            // gl_FragColor = vec4(col+(v_depth), 0.5+u_random*0.124);

            gl_FragColor = vec4(col.rgb, v_opacity);
        }`,
        vert: `
        precision mediump float;

        #define PI 3.141592653589793

        uniform float u_t, u_time;
        uniform vec3 u_random;
        uniform sampler2D u_fft;
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_offset, a_color;
        attribute vec2 a_uv;

        varying vec3 v_color;
        varying float v_depth, v_opacity;
        varying vec2 v_uv;

        float map(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            vec3 pos = a_position;
            vec4 off = texture2D(u_fft, a_uv);

            off.x = map(off.x, 0.0, 100.0, 0.0, 1.0);
            off.y = map(off.y, 0.0, 100.0, 0.0, 1.0);
            off.z = map(off.z, 0.0, 100.0, 0.0, 1.0);

            pos.xyz *= off.xyz;

            v_color = a_color;
            v_depth = pos.z;
            v_opacity = map(u_random.x, -8.0, 8.0, 0.0, 1.0);
            v_uv = a_uv;

            gl_Position = u_projection*u_view*u_matrix*vec4(pos, 1);
        }`,

        attributes: {
            a_position: pane.positions,
            a_uv: pane.uvs,
            a_color: pane_colours,
            a_offset: pane_offsets
        },

        elements: pane.cells,

        uniforms: {
            u_view: ({time}, props) => {
                let { u_time } = props
                return mat4.lookAt([],
                    [0  , 0  , -8 ], // position of camera
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
                let scale = 3

                let tra = mat4.translate([], mat4.identity([]), [0, 0, 0])
                let rot = mat4.rotate([], tra, PI, [ 0.25, 1, 0 ])
                let mat = mat4.scale([], rot, [scale, scale, scale])
                return mat
            },
            u_t: regl.prop('u_t'),
            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
            u_color: regl.prop('u_color'),
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

    /*
    let pane_elements = Array(1)
        .fill({})
        .map((_, i, a) => {
            return {
                u_random: [rand(), rand(), rand()],
                u_index: i,
                u_length: a.length-1,
                u_t: i/(a.length-1)
            }
        })
    */

    let pane_element = {
        u_random: [rand(), rand(), rand()],
        u_index: 0,
        u_length: 0,
        u_t: 0
    }

    let player = new Tone.Player('/assets/2019_04_12.mp3').toMaster()
    let fft = new Tone.Analyser('fft', 256, 1)
    player.autostart = true
    player.loop = true
    player.connect(fft)

    let pane_texture = regl.texture({
        width: 8,
        height: 8,
        // data: new Array(256).fill(0)
    })

    return ({ playhead }) => {

        regl.poll()
        regl.clear({color: [...bgc, 1], depth: 1})
        pane_element.u_time = playhead
        pane_texture({ width: 8, height: 8, data: fft.getValue() })
        pane_element.u_fft = pane_texture
        // pane_element.u_fft = fft.getValue()
        pane_draw(pane_element);
        /*
        pane_draw(pane_elements.map((v, i, a) => {
            return Object.assign(v, { u_time: playhead }) }))
        */
    }
}

canvasSketch(sketch, settings)
