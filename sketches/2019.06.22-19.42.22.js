let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
// let Tone = require('tone')
let load = require('load-asset')
let create_regl = require('regl')
let plane_make = require('primitive-plane')
let box_make = require('geo-3d-box')
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
    const N = 64

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

    let text_make = function(str) {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let fs = N/4

        canvas.width = N
        canvas.height = N
        ctx.fillStyle = 'hsla(0, 50%, 50%, 1)'

        ctx.strokeRect(4, (canvas.height/2)-((fs+10)/2), canvas.width-8, fs+10)

        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.font = `${fs}px OfficinaSansStd-Bold`
        ctx.textAlign = 'center'
        ctx.fillText(str, canvas.width/2, (canvas.height/2)+(fs/3))

        return canvas
    }

    let text_canvas = text_make('NOISE')
    let text_texture = regl.texture({ data: text_canvas, wrapS: 'repeat', wrapT: 'repeat' })

    let box = box_make()

    let bgc = hsluv.hsluvToRgb([0, 0, rand()*100])

    let box_colour = hsluv.hsluvToRgb([0, 0, rand()*100])
    let box_colours = box.cells.map((v, i, a) => {
        return [box_colour, box_colour, box_colour]
    })

    let box_draw = regl({
        frag: `
        precision mediump float;
        #define PI 3.141592653589793

        mat2 myt = mat2(0.12121212, 0.13131313, -0.13131313, 0.12121212);
        vec2 mys = vec2(1e4, 1e6);

        uniform float u_time;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform sampler2D u_text;

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
            float n = voronoi2d(vec2(st.y, t)*4.0);

            uv.y += sin((st.x*16.0)+u_time*PI*8.0)*0.125;
            vec4 color = texture2D(u_text, uv);
            color.rgb = vec3(v_color)*u_random.x;

            // gl_FragColor = vec4(color);
            gl_FragColor = vec4(vec3(n*(u_random.x*0.5)), v_depth+0.75);
        }`,

        vert: `
        precision mediump float;
        #define PI 3.141592653589793

        mat2 myt = mat2(0.12121212, 0.13131313, -0.13131313, 0.12121212);
        vec2 mys = vec2(1e4, 1e6);

        attribute vec3 a_position, a_color;
        attribute vec2 a_uv;

        uniform mat4 u_projection, u_view, u_matrix;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform sampler2D u_text;

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
            v_depth = position.z;

            vec4 text = texture2D(u_text, v_uv);


            gl_Position = u_projection*u_view*u_matrix*vec4(position, 1.0);
        }`,

        attributes: {
            a_position: box.positions,
            a_uv: box.uvs,
            a_normal: box.normals,
            a_color: box_colours,
        },

        elements: box.cells,

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0.0, 0.0, 1.5], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                let { u_time, u_index, u_random, u_resolution, u_position, u_n } = props
                let rot = mat4.rotate([], mat4.identity([]), Math.sin(u_time*PI*2.0)*(PI/16),
                    [1, 1, 0]
                )
                // let rot = mat4.identity([])
                let x = u_position[0]
                let y = u_position[1]
                let z = u_position[2]*Math.sin(u_time*PI)
                let tra = mat4.translate([], rot, [x, y, z])
                return mat4.scale([], tra, [2/(u_n+2), 2/(u_n+2), 2/(u_n+2)])
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_time: regl.prop('u_time'),
            u_random: regl.prop('u_random'),
            u_resolution: regl.prop('u_resolution'),
            u_text: regl.prop('u_text'),
            u_position: regl.prop('u_position')
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

    let text_context = text_canvas.getContext('2d')
    let image_data = text_context.getImageData(0, 0, N, N)

    console.log(image_data.data.length)

    let box_elements = new Array(N*N)
        .fill({})
        .map(function(value, i) {
            let s = 1/N
            let x = map((i%N), 0, N-1, -1+s, 1-s)
            let y = map(Math.floor(i/N), 0, N-1, -1+s, 1-s)
            let z = map(image_data.data[(i*4)+3], 0, 255, 0, 0.5)

            /*
            let r = image_data.data[(i*4)+0]
            let g = image_data.data[(i*4)+1]
            let b = image_data.data[(i*4)+2]
            let a = image_data.data[(i*4)+3]
            console.log(a)
            */


            return {
                u_resolution: [width, height],
                u_random: [rand(), rand(), rand()],
                u_text: text_texture,
                u_index: i,
                u_position: [x, y, z],
                u_n: N
            }
        })

    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [...bgc, 1], depth: 1})

        box_draw(box_elements.map(function(value) {
            return Object.assign(value, {u_time: playhead})
        }))

    }
}

canvasSketch(sketch, settings)


