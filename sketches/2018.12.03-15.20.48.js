let canvasSketch = require('canvas-sketch')
let create_regl = require('regl')
let seed = require('seed-random')
let mat4 = require('gl-mat4')

let settings = {
    context: 'webgl',
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}

let sketch = ({ gl }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*1000)

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let vlerp = (v0, v1, t) => [lerp(v0[0], v1[0], t), lerp(v0[1], v1[1], t)]
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))
    let col = (h=0, s=0, l=0, a=1) => `hsla(${h*360}, ${s*100}%, ${l*100}%, ${a})`
    let rand = seed(seed_value)

    let cube_position = [
        [-1.0, +1.0, +1.0], [+1.0, +1.0, +1.0], [+1.0, -1.0, +1.0], [-1.0, -1.0, +1.0],
        [+1.0, +1.0, +1.0], [+1.0, +1.0, -1.0], [+1.0, -1.0, -1.0], [+1.0, -1.0, +1.0],
        [+1.0, +1.0, -1.0], [-1.0, +1.0, -1.0], [-1.0, -1.0, -1.0], [+1.0, -1.0, -1.0],
        [-1.0, +1.0, -1.0], [-1.0, +1.0, +1.0], [-1.0, -1.0, +1.0], [-1.0, -1.0, -1.0],
        [-1.0, +1.0, -1.0], [+1.0, +1.0, -1.0], [+1.0, +1.0, +1.0], [-1.0, +1.0, +1.0],
        [-1.0, -1.0, -1.0], [+1.0, -1.0, -1.0], [+1.0, -1.0, +1.0], [-1.0, -1.0, +1.0]
    ]

    let cube_elements = [
        [ 2,  1,  0], [ 2,  0,  3],
        [ 6,  5,  4], [ 6,  4,  7],
        [10,  9,  8], [10,  8, 11],
        [14, 13, 12], [14, 12, 15],
        [18, 17, 16], [18, 16, 19],
        [20, 21, 22], [23, 20, 22]
    ]



    let regl = create_regl({ gl })
    let draw_cube = regl({
        frag: `
        precision mediump float;

        #define PI 3.14159265359
        #define TAU 6.28

        uniform float u_playhead;
        uniform vec2 u_resolution;

        varying vec4 v_color;

        float map(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            // vec3 fill = vec3(sin(u_time/1000.0*PI)*0.85);
            // vec2 st = gl_FragCoord.xy/u_resolution.xy;

            float t = sin(u_playhead*PI);
            // vec3 fill = vec3(vec2(0.85, 0.85)*t, 0.85*t);
            vec3 fill = vec3(0.25);
            // gl_FragColor = vec4(fill, 1);
            gl_FragColor = v_color;
        }`,
        vert: `
        precision mediump float;
        #define PI 3.14159265359
        #define TAU 6.28

        uniform mat4 u_projection;
        uniform mat4 u_view;
        uniform mat4 u_matrix;

        uniform float u_playhead;
        uniform vec2 u_resolution;

        attribute vec3 position;
        attribute vec4 color;

        varying vec4 v_color;

        float map(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            v_color = color;
            // float s = map(sin(u_playhead*PI), 0.0, 1.0, 0.25, 0.75);
            float s = 0.05;
            gl_Position = u_projection*u_view*
                u_matrix*vec4(position, 1);
        }`,

        attributes: {
            position: cube_position,
            color: {
                buffer: regl.buffer(Array(cube_position.length)
                    .fill([])
                    .map((v, i, a) => {
                        // let c = map(i/(a.length-1), 0, 1, 0.25, 0.75)
                        let c = map(Math.floor(i/6), 0, 4, 0.15, 0.85)
                        return [c, c, c, 1.0]
                    })
                )
            }
        },
        elements: cube_elements,
        uniforms: {
            u_view: (_, props) => {
                let t = props.playhead*PI
                /*
                    [5*Math.cos(t), 10*Math.sin(t), 5*Math.sin(t)],
                */
                return mat4.lookAt([],
                    [0.0, 0.0, 1.0],
                    [0.0, 0.0, 0.0],
                    [0.0, 1.0, 0.0]
                )
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2,
                    viewportWidth/viewportHeight,
                    0.01,
                    50)
            },
            u_matrix: regl.prop('u_matrix'),
            u_playhead: regl.prop('u_playhead'),
            u_resolution: regl.prop('u_resolution')
        },

        primitive: 'triangles',
    })

    let rotations = Array(8*8)
        .fill([])
        .map((_, i, a) => {
            return [
                Math.pow(rand(), i/(a.length-1)),
                Math.pow(rand(), i/(a.length-1)),
                Math.pow(rand(), i/(a.length-1))
            ]
        })

    let translations = Array(8*8)
        .fill([])
        .map((_, i, a) => {
            let x = (-3.5+i%8)*2
            let y = (-3.5+Math.floor(i/8))*2
            let z = ((rand()*2)-1)*8
            return [x, y, z]
        })

    let ease_table = t => 1-Math.pow(Math.max(0, Math.abs(t)*2-1), 2)
    return ({ width, height, playhead }) => {

        regl.poll()
        regl.clear({color: [1, 1, 1, 1], depth: 1})
        let identity = mat4.identity([])
        let cubes = Array(8*8)
            .fill({})
            .map((v, i, a) => {
                let tt = map(clamp(playhead, 0.15, 0.85), 0.15, 0.85, 0, 1)
                let e = ease_table((tt*2)-1)

                let x = (-3.5+i%8)*2
                let y = (-3.5+Math.floor(i/8))*2
                let pos = mat4.translate([], identity, [x, y, e*translations[i][2]])
                let scale = mat4.scale([], identity, [2/32, 2/32, 2/32])

                let mat = mat4.multiply([], scale, pos)
                return {
                    playhead: playhead,
                    u_playhead: playhead,
                    u_resolution: [width, height],
                    u_matrix: mat4.rotate([], mat,
                        Math.pow(e, 0.15+(i/(a.length-1)))*PI/2,
                        [rotations[i][0], 0, rotations[i][2]]
                    )
                }
            })

        draw_cube(cubes)

        /*
        draw_cube({
            playhead: playhead,
            u_playhead: playhead,
            u_resolution: [width, height],
            u_matrix: mat4.rotate([],
                mat4.scale([], mat4.identity([]),
                    [+0.25, +0.25, +0.25]
                ),
                playhead*TAU,
                [+0.0, +1.0, +1.0]
            )
        })
        */

    }
}

canvasSketch(sketch, settings)
