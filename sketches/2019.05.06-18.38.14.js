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

    let cone_make = (n=8,r1=1,r2=0.25) => {
        let positions = []
        let uvs = []
        let cells = []

        for (i = 0; i <= TAU; i+=(TAU/n)) {
            positions.push([ Math.cos(i)*r1, Math.sin(i)*r1, -1 ])
            positions.push([ Math.cos(i)*r2, Math.sin(i)*r2, +1 ])
        }

        // @NOTE(Grey): I think there is a bug in this, n=16 or 32 (etc.)
        // leaves a big gap in the mesh
        for (i = 0; i < positions.length-3; i+=2) {
            cells.push([i, i+1, i+3])
            cells.push([i, i+2, i+3])
        }

        return { positions, uvs, cells }
    }


    let cone = cone_make(24, 1, 0.125)
    let pane = plane_make(1, 1, 8, 8)

    let bgc = hsluv.hsluvToRgb([0, 0, rand()*100])
    let cone_colours = cone.cells.map((v) => {
        return [
            hsluv.hsluvToRgb([0, 0, rand()*100]),
            hsluv.hsluvToRgb([0, 0, rand()*100]),
            hsluv.hsluvToRgb([0, 0, rand()*100])
        ]
    })

    let cone_draw = regl({
        frag: `
        precision mediump float;
        #define PI 3.141592653589793
        uniform float u_time;
        uniform vec3 u_random;
        uniform vec2 u_resolution;

        varying float v_depth;
        varying vec2 v_uv;
        varying vec3 v_color;


        float map_range(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            float depth = v_depth;
            depth = map_range(depth, -1.0, 1.0, 0.0, 1.0);
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            gl_FragColor = vec4(v_color*pow(depth, u_random.x), u_random.z*2.0);
        }`,

        vert: `
        precision mediump float;
        #define PI 3.141592653589793
        uniform mat4 u_projection, u_view, u_matrix;
        attribute vec3 a_position, a_color;
        attribute vec2 a_uv;

        uniform float u_time;

        varying float v_depth;
        varying vec2 v_uv;
        varying vec3 v_color;

        void main() {
            vec2 uv = a_uv;
            v_color = a_color;
            v_depth = a_position.z;
            gl_Position = u_projection*u_view*u_matrix*vec4(a_position, 1.0);
        }`,

        attributes: {
            a_position: cone.positions,
            a_uv: cone.uvs,
            a_color: cone_colours
        },

        elements: cone.cells,

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0  , 0  , -4], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                let { u_time, u_random } = props
                let tra = mat4.translate([], mat4.identity([]), [
                    map(u_random[0], 0, 1, -4, 4)+Math.cos(u_time*TAU)*1.5,
                    map(u_random[1], 0, 1, -4, 4)+Math.sin(u_time*TAU)*0.5,
                    0
                ])
                let directions = [
                    map(u_random[0], 0, 1, -1, 1),
                    map(u_random[1], 0, 1, -1, 1),
                    map(u_random[2], 0, 1, -1, 1)
                ]
                return mat4.rotate([], tra, u_time*TAU, directions)
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
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
        },
        primitive: 'triangles'
    })


    let cone_elements = Array(16)
        .fill(0)
        .map(function(v, i, a) {
            return {
                u_resolution: [width, height],
                u_random: [rand(), rand(), rand()]
            }
        })



    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [...bgc, 1], depth: 1})

        cone_draw(cone_elements.map(function(v) {
            return Object.assign(v, {
                u_time: playhead
            })
        }))

    }
}

canvasSketch(sketch, settings)

