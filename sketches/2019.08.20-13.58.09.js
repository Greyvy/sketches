let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let Tone = require('tone')
let load = require('load-asset')
let create_regl = require('regl')
let icosphere_make = require('primitive-icosphere')
let cube_make = require('primitive-cube')
let plane_make = require('primitive-plane')
let torus_make = require('primitive-torus')
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
    let ease = (p, g) => {
      if (p < 0.5)
        return 0.5 * Math.pow(2*p, g)
      else
        return 1 - 0.5 * Math.pow(2*(1 - p), g)
    }

    let seed_value = Math.floor(Math.random()*1000)
    let rand = seed(seed_value)
    let simplex = new SimplexNoise(seed_value)

    let regl = create_regl({
        gl,
        extensions: ['webgl_draw_buffers', 'oes_texture_float', 'oes_standard_derivatives']
    })

    let text_make = function(colour) {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let scale = 8.0
        let fs = 24*scale

        canvas.width = 128*scale
        canvas.height = 128*scale
        ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.font = `${fs}px TradeGothicLTStd-Bold,sans-serif`
        ctx.textAlign = 'left'
        ctx.fillText('juggle', 8*scale, fs*2.0)

        return regl.texture({ data: canvas, wrapS: 'repeat', wrapT: 'repeat' })
    }



    let torus = torus_make({ majorSegments: 16, minorSegments: 8, arc: Math.PI*2.0 })
    let text = text_make()

    let bgc = hsluv.hsluvToRgb([0, 0, rand()*100])

    let torus_colour = hsluv.hsluvToRgb([0, 0, rand()*100])
    let torus_colours = torus.cells.map((v, i, a) => {
        return [torus_colour, torus_colour, torus_colour]
    })

    let torus_target1024 = regl.framebuffer({
        color: [ regl.texture({ type: 'float', width: 1024, height: 1024 }) ]
    })
    let torus_target64 = regl.framebuffer({
        color: [ regl.texture({ type: 'float', width: 64, height: 64 }) ]
    })
    let torus_render_panel = plane_make()

    let torus_render = regl({
        frag: `
        precision mediump float;
        #define PI 3.141592653589793

        varying vec2 v_uv;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform sampler2D u_texture0, u_texture1;

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution;
            vec2 uv = v_uv;
            float t = sin(u_time*PI);
            float s = 1.0;

            vec4 tex0 = texture2D(u_texture0, uv);
            vec4 tex1 = texture2D(u_texture1, uv);

            // vec3 color = smoothstep(tex1.rgb, tex0.rgb, vec3(st.y*t, st.y*t, st.y*t));
            vec4 color = tex0;

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
            a_position: torus_render_panel.positions,
            a_uv: torus_render_panel.uvs,
        },
        elements: torus_render_panel.cells,
        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0.0, 0.0, 1.0], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                return mat4.scale([], mat4.identity([]), props.u_scale || [1, 1, 1])
            },
            u_projection: ({viewportWidth, viewportHeight}) => {
                return mat4.perspective([],
                    PI/2, viewportWidth/viewportHeight, 0.01, 50)
            },
            u_resolution: regl.prop('u_resolution'),
            u_texture0: regl.prop('u_texture0'),
            u_texture1: regl.prop('u_texture1'),
            u_time: regl.prop('u_time')
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

    let torus_draw = regl({
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
        uniform sampler2D u_text;

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

        mat2 rotate2d(float angle) {
            return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        }

        float map_range(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec2 uv = v_uv;
            vec2 uv_t = uv;

            float noise = voronoi2d((uv_t+u_random.xy)*1.25);
            uv_t.y -= u_time+noise;

            vec4 text = texture2D(u_text, uv_t);
            vec4 color = vec4(v_color, 1.0);


            vec3 U = dFdx(v_vertex);
            vec3 V = dFdy(v_vertex);
            vec3 normal = normalize(cross(U,V));
            vec3 light_direction = normalize(
                vec3(0.2, 0.3, 0.7)*u_random
            );
            float light_intensity = dot(normal, light_direction);

            float t = sin(u_time*PI);

            color.rgb += noise*0.125;
            color.rgb *= light_intensity;
            color.rgb = mix(color.rgb, vec3(1.0)-color.rgb, text.r);

            vec2 st_n = (st-1.0)+1.0;
            float dist = length(st);

            color.rgb *= dist;

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
        uniform float u_time, u_index, u_length;
        uniform sampler2D u_text;

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

        mat2 rotate2d(float angle) {
            return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        }

        float map_range(float v, float ds, float de, float rs, float re) {
            return rs+(re-rs)*((v-ds)/(de-ds));
        }

        float ease(float p, float g) {
            if (p < 0.5) {
                return 0.5 * pow(2.0*p, g);
            } else {
                return 1.0 - 0.5 * pow(2.0*(1.0 - p), g);
            }
        }

        void main() {

            vec4 fake_frag_coord = u_matrix*vec4(a_position, 1.0);
            fake_frag_coord.xyz /= fake_frag_coord.w;
            fake_frag_coord.w = 1.0/fake_frag_coord.w;

            fake_frag_coord.xyz *= vec3(0.5)+vec3(0.5);
            fake_frag_coord.xy *= u_resolution.xy;

            vec2 st = fake_frag_coord.xy/u_resolution.xy;
            vec2 uv = a_uv;

            vec4 text = texture2D(u_text, uv);
            vec4 norm = u_matrix*vec4(a_normal.xyz, 1.0);
            vec3 position = a_position;

            float t = u_time*PI;
            float noise1 = voronoi2d((st+norm.xy+u_random.xy)*2.0);
            float noise2 = voronoi2d((st+uv.xy+u_random.xz)*6.0);
            float noise3 = voronoi2d((st+norm.xy+u_random.yz)*8.0);
            float noise = noise1+noise2+noise3;


            position.z += noise*(ease(sin(t), 1.5)*(1.0-(u_index/u_length)));

            mat2 rotation = rotate2d(u_index+ease(u_time, 1.5)*PI*2.0);
            float offset = voronoi2d(vec2(u_index/u_length, ease(sin(t), 1.5))*2.0);

            position.y += ease(sin(u_time*PI), 1.5);
            // position.z += u_time*4.0;

            position.xy += ((offset*2.0)-1.0)*0.25;
            position.xy *= rotation;

            v_uv = a_uv;
            v_color = a_color;
            v_normal = vec3(norm.xyz);
            v_depth = position.z;
            v_vertex = (u_matrix*vec4(position, 1.0)).xyz;

            gl_Position = u_projection*u_view*u_matrix*vec4(position, 1.0);
        }`,

        attributes: {
            a_position: torus.positions,
            a_uv: torus.uvs,
            a_normal: torus.normals,
            a_color: torus_colours,
        },

        elements: torus.cells,

        uniforms: {
            u_view: ({time}, props) => {
                return mat4.lookAt([],
                    [0.0, 0.0, 1.5], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                let { u_time, u_index, u_length, u_random, u_resolution } = props
                let scale = 2/6

                let tra = mat4.translate([], mat4.identity([]), [
                    0,
                    map(u_index, 0, u_length, -0.75, 0.75),
                    0
                ])
                let rot = mat4.rotate([], tra, PI*1.5, [1, 0, 0])
                return mat4.scale([], rot, [scale, -scale, scale])
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
            u_index: regl.prop('u_index'),
            u_length: regl.prop('u_length')
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


    let torus_elements = new Array(9)
        .fill({})
        .map(function(value, i, a) {
            return {
                u_resolution: [width, height],
                u_random: [rand(), rand(), rand()],
                u_text: text,
                u_index: i,
                u_length: a.length
            }
        })

    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [...bgc, 1], depth: 1})

        regl.clear({ color: bgc, depth: 1, framebuffer: torus_target1024 })
        regl.clear({ color: bgc, depth: 1, framebuffer: torus_target64 })

        torus_target1024.use(() => {
            torus_draw(torus_elements.map(function(value) {
                return Object.assign(value, {u_time: playhead})
            }))
        })

        torus_target64.use(() => {
            torus_draw(torus_elements.map(function(value) {
                return Object.assign(value, {u_time: playhead})
            }))
        })

        torus_render({
            u_resolution: [width, height],
            u_texture0: torus_target1024.color[0],
            u_texture1: torus_target64.color[0],
            u_scale: [2, 2, 2],
            u_time: playhead
        })

    }
}

canvasSketch(sketch, settings)


