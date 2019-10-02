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

let sketch = async ({ gl, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let glsl_utils = `
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
    `

    let glsl_voronoi = `
        mat2 myt = mat2(0.12121212, 0.13131313, -0.13131313, 0.12121212);
        vec2 mys = vec2(1e4, 1e6);

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
    `

    let glsl_voronoise = `
        //  <https://www.shadertoy.com/view/Xd23Dh>
        //  by inigo quilez <http://iquilezles.org/www/articles/voronoise/voronoise.htm>

        vec3 hash3(vec2 p) {
            vec3 q = vec3( dot(p, vec2(127.1, 311.7)),
                                            dot(p, vec2(269.5, 183.3)),
                                            dot(p, vec2(419.2, 371.9)) );
            return fract(sin(q)*43758.5453);
        }

        float iqnoise(in vec2 x, float u, float v) {
            vec2 p = floor(x);
            vec2 f = fract(x);
            float k = 1.0+63.0*pow(1.0-v,4.0);
            float va = 0.0;
            float wt = 0.0;
            for (int j=-2; j<=2; j++)
            for (int i=-2; i<=2; i++) {
                vec2 g = vec2(float(i), float(j));
                vec3 o = hash3(p+g)*vec3(u,u,1.0);
                vec2 r = g-f+o.xy;
                float d = dot(r,r);
                float ww = pow(1.0-smoothstep(0.0,1.414,sqrt(d)), k);
                va += o.z*ww;
                wt += ww;
            }
            return va/wt;
        }
    `

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
        extensions: [
            'webgl_draw_buffers',
            'oes_texture_float',
            'oes_standard_derivatives'
        ]
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
        ctx.textAlign = 'center'
        ctx.fillText('MI{ERROR}', canvas.width/2, canvas.height/2)

        return regl.texture({ data: canvas, wrapS: 'repeat', wrapT: 'repeat' })
    }



    let cube = cube_make()
    let text = text_make()

    let bgc = hsluv.hsluvToRgb([0, 0, rand()*100])

    let cube_colour = hsluv.hsluvToRgb([0, 0, rand()*100])
    let cube_colours = cube.cells.map((v, i, a) => {
        return [cube_colour, cube_colour, cube_colour]
    })

    let cube_target1024 = regl.framebuffer({
        color: [ regl.texture({ type: 'float', width: 1024, height: 1024 }) ]
    })
    let cube_target64 = regl.framebuffer({
        color: [ regl.texture({ type: 'float', width: 64, height: 64 }) ]
    })

    let cube_render_panel = plane_make()

    let cube_render = regl({
        frag: `
        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        #endif
        precision mediump float;
        #define PI 3.141592653589793

        ${glsl_utils}
        ${glsl_voronoi}
        ${glsl_voronoise}

        varying vec2 v_uv;

        uniform float u_time, u_snap;
        uniform vec2 u_resolution;
        uniform sampler2D u_texture0;
        uniform sampler2D u_texture1;
        uniform sampler2D u_text;

        float aastep(float threshold, float dist) {
            float afwidth = fwidth(dist)*0.5;
            return smoothstep(threshold-afwidth, threshold+afwidth, dist);
        }

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution;
            vec2 uv = v_uv;
            float t = u_time*PI;
            float s = 1.0;

            float radius = 4.0;
            vec2 direction = vec2(sin(t)*radius, cos(t)*radius);
            vec2 off1 = vec2(1.411764705882353)*direction;
            vec2 off2 = vec2(3.294117647058823)*direction;
            vec2 off3 = vec2(5.176470588235294)*direction;

            float noise = iqnoise(uv, 1.0, 0.0);

            // vec2 uv_t = uv; // ((uv-vec2(0.5))+vec2(0.5));
            // vec2 uv_t = uv+vec2(0.25);

            vec4 lowr = texture2D(u_texture1, uv);
            vec4 blur = vec4(0.0);
            blur += texture2D(u_texture0, uv)*0.1964825501511404;
            blur += texture2D(u_texture0, uv+(off1/u_resolution))*0.2969069646728344;
            blur += texture2D(u_texture0, uv-(off1/u_resolution))*0.2969069646728344;
            blur += texture2D(u_texture0, uv+(off2/u_resolution))*0.09447039785044732;
            blur += texture2D(u_texture0, uv-(off2/u_resolution))*0.09447039785044732;
            blur += texture2D(u_texture0, uv+(off3/u_resolution))*0.010381362401148057;
            blur += texture2D(u_texture0, uv-(off3/u_resolution))*0.010381362401148057;


            vec2 uv_tl = uv;
            uv_tl = vec2(1.0)-uv_tl;

            vec2 uv_tr = uv;
            uv_tr.y = 1.0-uv_tr.y;

            vec2 uv_br = uv;
            uv_br.x = uv_br.x;

            vec2 uv_bl = uv;
            uv_bl.x = 1.0-uv_br.x;

            vec4 br = texture2D(u_texture0, uv_br);
            vec4 bl = texture2D(u_texture0, uv_bl);
            vec4 tr = texture2D(u_texture0, uv_tr);
            vec4 tl = texture2D(u_texture0, uv_tl);

            vec4 top_row = mix(tr, tl, step(st.x, 0.5));
            vec4 bot_row = mix(br, bl, step(st.x, 0.5));

            vec4 color = mix(top_row, bot_row, step(st.y, 0.5));

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
            a_position: cube_render_panel.positions,
            a_uv: cube_render_panel.uvs,
        },
        elements: cube_render_panel.cells,
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
            u_resolution: regl.prop('u_resolution'),
            u_texture0: regl.prop('u_texture0'),
            u_texture1: regl.prop('u_texture1'),
            u_time: regl.prop('u_time'),
            u_snap: regl.prop('u_snap'),
            u_text: regl.prop('u_text'),
            u_scale: regl.prop('u_scale')
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

    let cube_draw = regl({
        frag: `
        #extension GL_OES_standard_derivatives : enable
        precision mediump float;
        #define PI 3.141592653589793

        uniform float u_time;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform sampler2D u_text;

        varying float v_depth;
        varying vec2 v_uv;
        varying vec3 v_normal, v_vertex, v_color;

        ${glsl_utils}
        ${glsl_voronoi}
        ${glsl_voronoise}

        float aastep(float threshold, float dist) {
            float afwidth = fwidth(dist)*0.5;
            return smoothstep(threshold-afwidth, threshold+afwidth, dist);
        }

        float lines(in vec2 pos, float b) {
            float scale = 30.0;
            pos *= scale;
            return smoothstep(0.0, 0.5+b*0.5, abs((sin(pos.x*3.1415)+b*2.0))*0.5);
        }

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec2 uv = v_uv;
            vec2 uv_t = uv;
            vec2 uv_s = uv;

            uv_t.y += ease(u_time, 1.5);
            uv_t.y = mod(uv_t.y, 1.0);

            vec2 lookup = vec2(1.0)-pow(abs(uv_t+u_random.xy)*20.0, vec2(1.0));
            float noise = iqnoise(lookup, 1.0, 0.0);

            uv_s.y -= 0.06;
            uv_s.x += ease(u_time, 1.5)*noise;
            uv_s.x = mod(uv_s.x, 1.0);

            vec4 text = texture2D(u_text, uv_s);
            vec4 color = vec4(v_color, 1.0);

            vec3 stripes = vec3(lines(uv*noise, 0.0125));

            // vec3 U = dFdx(v_vertex);
            // vec3 V = dFdy(v_vertex);
            // vec3 normal = normalize(cross(U,V));
            vec3 normal = v_normal;
            vec3 light_direction = normalize(vec3(0.2, 0.3, 0.7)*u_random);
            float light_intensity = dot(normal, light_direction);

            // color.rgb *= stripes;
            // color.rgb = mix(color.rgb, vec3(1.0)-color.rgb, text.r);
            color.rgb *= light_intensity;

            gl_FragColor = vec4(color);
        }`,

        vert: `
        precision mediump float;
        #define PI 3.141592653589793

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

        ${glsl_utils}
        ${glsl_voronoi}
        ${glsl_voronoise}

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
            float noise1 = iqnoise(uv*2.0, 1.0, 0.0);
            float noise2 = iqnoise(uv*6.0, 1.0, 0.0);
            float noise3 = iqnoise(uv*8.0, 1.0, 0.0);
            float noise = (noise1+noise2+noise3)/3.0;


            float offset = iqnoise(vec2(u_index/u_length, ease(sin(t), 1.5))*2.0, 1.0, 0.0);

            // position.z += noise*(ease(sin(t), 1.5))*0.5;
            // position.xy += ((offset*2.0)-1.0)*0.25;

            v_uv = a_uv;
            v_color = a_color;
            v_normal = vec3(norm.xyz);
            v_depth = position.z;
            v_vertex = (u_matrix*vec4(position, 1.0)).xyz;

            gl_Position = u_projection*u_view*u_matrix*vec4(position, 1.0);
        }`,

        attributes: {
            a_position: cube.positions,
            a_uv: cube.uvs,
            a_normal: cube.normals,
            a_color: cube_colours,
        },

        elements: cube.cells,

        uniforms: {
            u_view: ({time}, props) => {
                let { u_time } = props
                return mat4.lookAt([],
                    [0.0, 0.0, 1.5], // position of camera
                    [0.0, 0.0, 0.0], // point of view looking at
                    [0.0, 1.0, 0.0]  // pointing up
                )
            },
            u_matrix: (stats, props) => {
                let { u_time, u_index, u_length, u_random, u_resolution, u_scale } = props

                let rt = vec3.mul([], u_random, [u_time, u_time, u_time])

                let r0 = u_random.map(function(value) { return map(value, 0, 1, 0, 1) })
                // let r0 = u_random
                let r1 = [r0[0]*0.1111, r0[1]*0.1111, r0[2]*0.1111]
                let r2 = [r0[0]*0.2222, r0[1]*0.2222, r0[2]*0.2222]
                let r3 = [r0[0]*0.3333, r0[1]*0.3333, r0[2]*0.3333]
                let res = null

                let spin = mat4.rotate([], mat4.identity([]), u_time*PI*2.0, [1, 1, 1])

                let tra0 = mat4.translate([], spin, r0)
                let rot0 = mat4.rotate([], tra0, r3[0]*PI*4.0, r3)
                let sca0 = mat4.scale([], rot0, rt)
                res = sca0
                if (u_index%4 === 2) {
                    let tra1 = mat4.translate([], sca0, r3)
                    let rot1 = mat4.rotate([], tra1, r3[2]*PI*4.0, r0)
                    let sca1 = mat4.scale([], rot1, r3)
                    res = sca1
                    if (u_index%4 === 0) {
                        let tra2 = mat4.translate([], rot1, r3)
                        let rot2 = mat4.rotate([], tra2, r3[1]*PI*4.0, r1)
                        let sca2 = mat4.scale([], rot2, r0)
                        res = sca2
                    }
                }

                return res
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
            u_length: regl.prop('u_length'),
            u_scale: regl.prop('u_scale')
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


    let cube_elements = new Array(128)
        .fill({})
        .map(function(value, i, a) {
            return {
                u_resolution: [width, height],
                u_random: [rand(), rand(), rand()],
                u_text: text,
                u_index: i,
                u_length: a.length,
                u_scale: 0.25
            }
        })

    return ({ playhead }) => {
        regl.poll()
        regl.clear({color: [...bgc, 1], depth: 1})

        regl.clear({ color: bgc, depth: 1, framebuffer: cube_target1024 })
        regl.clear({ color: bgc, depth: 1, framebuffer: cube_target64 })

        cube_target1024.use(() => {
            cube_draw(cube_elements.map(function(value) {
                return Object.assign(value, { u_time: playhead })
            }))
        })

        cube_target64.use(() => {
            cube_draw(cube_elements.map(function(value) {
                return Object.assign(value, { u_time: playhead })
            }))
        })

        cube_render({
            u_resolution: [width, height],
            u_texture0: cube_target1024.color[0],
            u_texture1: cube_target64.color[0],
            u_text: text,
            u_time: playhead,
            u_snap: rand(),
            u_scale: [2, -2, 2],
            u_translate: [0, 0, 0],
        })
    }
}

canvasSketch(sketch, settings)

