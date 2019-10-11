let canvasSketch = require('canvas-sketch')
let polyline_normals = require('polyline-normals')
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
    duration: 7.42,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}

let sketch = async ({ gl, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2
    const N = 128

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

        /*
        float aastep(float threshold, float dist) {
            float afwidth = fwidth(dist)*0.5;
            return smoothstep(threshold-afwidth, threshold+afwidth, dist);
        }
        */

        float lines(in vec2 pos, float b) {
            float scale = 30.0;
            pos *= scale;
            return smoothstep(0.0, 0.5+b*0.5, abs((sin(pos.x*3.1415)+b*2.0))*0.5);
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

    let bgc = hsluv.hsluvToRgb([rand()*360, 25+rand()*50, rand()*100])

    let line_target1024 = regl.framebuffer({
        color: [ regl.texture({ type: 'float', width: 1024, height: 1024 }) ]
    })
    let line_target64 = regl.framebuffer({
        color: [ regl.texture({ type: 'float', width: 64, height: 64 }) ]
    })

    let cube_render_panel = plane_make()

    let line_fft = regl.texture({
        shape: [N/4, N/4, 4],
        min: 'linear',
        mag: 'linear',
        wrapS: 'repeat',
        wrapT: 'repeat'
    })

    let cube_render = regl({
        frag: `
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
        uniform sampler2D u_fft;

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
            vec2 uv_t = uv;

            vec4 fft = texture2D(u_fft, uv_t);
            vec4 base = texture2D(u_texture0, uv_t);
            vec4 lowr = texture2D(u_texture1, uv);
            vec4 text = texture2D(u_text, uv);
            vec4 blur = vec4(0.0);
            blur += texture2D(u_texture0, uv)*0.1964825501511404;
            blur += texture2D(u_texture0, uv+(off1/u_resolution))*0.2969069646728344;
            blur += texture2D(u_texture0, uv-(off1/u_resolution))*0.2969069646728344;
            blur += texture2D(u_texture0, uv+(off2/u_resolution))*0.09447039785044732;
            blur += texture2D(u_texture0, uv-(off2/u_resolution))*0.09447039785044732;
            blur += texture2D(u_texture0, uv+(off3/u_resolution))*0.010381362401148057;
            blur += texture2D(u_texture0, uv-(off3/u_resolution))*0.010381362401148057;

            vec4 glitch = mix(lowr, blur, step(u_snap, 0.95));

            // vec4 color = mix(base, blur, noise);
            // vec4 color = mix(text, base, text.a);
            vec4 color = mix(base, fft, 1.0-(24.0+st.y*24.0));

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
            u_scale: regl.prop('u_scale'),
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
     * @NOTE(Grey): Base geo, keeping so I know what it’s un-messyness looks like
     *
    let line = {
        positions: [-1, -1, 0, 0, 1, 1],
        uvs: [0, 0, 0.5, 0, 1, 0],
        normals: [1, -1, 1, -1, 1, -1],
        mitres: [],
        cells: [[0, 1], [1, 2]]
    }
     */

    function vec2_sub(v0, v1) {
        return [v0[0]-v1[0], v0[1]-v1[1]]
    }

    function vec2_add(v0, v1) {
        return [v0[0]+v1[0], v0[1]+v1[1]]
    }

    function vec2_scale(v0, scaler) {
        return [v0[0]*scaler, v0[1]*scaler]
    }

    function vec2_dot(v0, v1) {
        return [v0[0]*v1[0]+v0[1]*v1[1]]
    }

    function vec2_normalize(v0) {
        let v_length = Math.sqrt(v0[0]*v0[0]+v0[1]*v0[1])
        if (v_length > 0) {
            return vec2_scale(v0, 1/v_length)
        }
        return v0
    }

    function vec2_normal(v0) {
        return [-v0[1], v0[0]]
    }

    function line_make(points) {
        let N = points.length
        let positions = []
        let uvs = []
        let normals = []
        let mitres = []

        let line_a = [0, 0]
        let line_b = [0, 0]
        let current_normal = null

        for (let i = 2; i < N; i += 2) {
            let prev = [points[i-2], points[i-1]]
            let curr = [points[i+0], points[i+1]]
            let next = i < N-2 ? [points[i+2], points[i+3]] : null

            // @TODO(Grey): Fix uv's
            let uvx = i/N
            let uvy = (i/N)

            line_a = vec2_normalize(vec2_sub(curr, prev))
            if (!current_normal) {
                current_normal = vec2_normal(line_a)
            }

            if (i === 2) {
                positions.push(...prev, ...prev)
                uvs.push(uvx, uvy, uvx, uvy)

                normals.push(...current_normal, ...current_normal)
                mitres.push(-1, 1)
            }

            if (!next) {
                positions.push(...curr, ...curr)
                uvs.push(uvx, uvy, uvx, uvy)

                current_normal = vec2_normal(line_a)
                normals.push(...current_normal, ...current_normal)
                mitres.push(-1, 1)

            } else {
                positions.push(...curr, ...curr)
                uvs.push(uvx, uvy, uvx, uvy)

                line_b = vec2_normalize(vec2_sub(next, curr))

                // @NOTE(Grey): Calculate the mitre length
                let tangent = vec2_normalize(vec2_add(line_a, line_b))
                let mitre = [-tangent[1], tangent[0]]
                let tmp = [-line_a[1], line_a[0]]
                let len = 1.0/vec2_dot(mitre, tmp)
                normals.push(...mitre, ...mitre)
                mitres.push(-len, len)
            }

        }
        return {
            positions,
            uvs,
            normals,
            mitres
        }
    }

    let N_POINTS = 120
    let line_geometry = []
    for (let i = 0; i <= N_POINTS; ++i) {
        let it = i/N_POINTS
        let x = simplex.noise2D(Math.pow(it, 1.5), 2.0-it*4.0)*0.5
        let y = 2.0-it*4.0
        line_geometry.push(x, y)
    }

    let line = line_make(line_geometry)

    // let positions = regl.buffer({ usage: 'dynamic', data: line.positions })

    let line_draw = regl({
        vert: `
        precision mediump float;
        #define PI 3.141592653589793

        attribute vec2 a_position, a_normal, a_uv;
        attribute float a_mitre;

        uniform mat4 u_projection, u_view, u_matrix;
        uniform sampler2D u_fft;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform float u_time, u_index, u_length;

        varying vec4 v_vertex;
        varying vec2 v_uv;
        varying float v_edge;

        ${glsl_utils}
        ${glsl_voronoi}
        ${glsl_voronoise}

        void main() {
            vec2 normal = normalize(a_normal);
            vec2 position = a_position;
            float mitre = a_mitre;

            vec4 fft = texture2D(u_fft, v_uv);
            vec4 fftime = texture2D(u_fft, vec2(v_uv.x, sin(u_time*PI)*0.5));

            vec2 nl = position.yx+u_random.yx;
            nl.x += (u_random.x*2.0)*length(fftime)*0.25; // sin(u_time*PI);
            float noise = iqnoise(nl, u_random.x, u_random.y);

            // position.x *= 1.0-noise*2.0;

            float line_width = noise*u_random.x*(length(fft)*0.25);
            // float line_width = position.x;
            vec2 p = position.xy+vec2(normal*line_width/2.0*mitre);

            gl_Position = u_projection*u_view*u_matrix*vec4(p, 0.0, 1.0);
            gl_PointSize = 1.0;

            v_edge = sign(mitre);
            v_uv = a_uv;
            v_vertex = u_projection*u_view*u_matrix*vec4(p, 0.0, 1.0);
        }
        `,
        frag: `
        #extension GL_OES_standard_derivatives : enable
        precision mediump float;
        #define PI 3.141592653589793

        uniform sampler2D u_fft;
        uniform vec4 u_background, u_color;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform float u_time;

        varying vec4 v_vertex;
        varying vec2 v_uv;
        varying float v_edge;

        ${glsl_utils}
        ${glsl_voronoi}
        ${glsl_voronoise}

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec2 uv = v_uv;

            vec2 nl = vec2(sin(u_time*PI)+v_vertex.x+u_random.x, v_vertex.y+u_random.x);
            float noise = iqnoise(nl*8.0, u_random.x, u_random.y);

            vec4 fft = texture2D(u_fft, uv);
            // vec4 color = vec4(1.0-vec3(u_background), u_random.z);
            vec4 color = vec4(u_color.rgb-length(fft), u_random.z);

            float inner = noise;
            float v = 1.0-abs(v_edge);
            v = smoothstep(0.65, 0.7, v*inner);

            gl_FragColor = mix(color, vec4(0.0), v);
        }
        `,
        attributes: {
            a_position: line.positions,
            a_uv: line.uvs,
            a_normal: line.normals,
            a_mitre: line.mitres
        },
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
                let { u_time, u_random } = props

                let translate = mat4.translate([], mat4.identity([]), [1.0-u_random[0]*2.0, 0, 0])
                let rotate = mat4.rotate([], translate, u_random[1]*PI*0.125, [0, 0, 1])
                return rotate
            },
            u_projection: ({viewportWidth: width, viewportHeight: height}) => {
                return mat4.perspective([], PI/2, width/height, 0.01, 50)
            },
            u_fft: regl.prop('u_fft'),
            u_time: regl.prop('u_time'),
            u_index: regl.prop('u_index'),
            u_color: regl.prop('u_color'),
            u_random: regl.prop('u_random'),
            u_length: regl.prop('u_length'),
            u_resolution: regl.prop('u_resolution'),
            u_background: regl.prop('u_background')
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
        primitive: 'triangle strip',
        count: line.positions.length/2,
    })

    let player = await load_sound(`/assets/2019_10_11.mp3`)
    let fft = new Tone.FFT(N*N)
    let fft_r = new Uint8Array(N*N)
    player.connect(fft)
    player.toMaster()
    player.autostart = true
    player.loop = true

    let lines = new Array(8)
        .fill({})
        .map(function(value, i, a) {
            return {
                u_time: 0,
                u_index: i,
                u_random: [rand(), rand(), rand()],
                u_length: a.length,
                u_resolution: [width, height],
                u_background: [...bgc, 1],
                u_color: [...hsluv.hsluvToRgb([rand()*360, rand()*100, rand()*100]), 1]
            }
        })

    return {
        begin() {
            player.restart()
        },
        render({ playhead }) {
            regl.poll()
            regl.clear({color: [...bgc, 1], depth: 1})

            regl.clear({ color: bgc, depth: 1, framebuffer: line_target1024 })
            regl.clear({ color: bgc, depth: 1, framebuffer: line_target64 })

            /*
            line_geometry[0] = Math.sin(playhead*PI)
            for (let i = 2; i < line_geometry.length; i += 2) {
                let x0 = line_geometry[i+0]
                let y0 = line_geometry[i+1]

                let x2 = line_geometry[i+2]
                let y2 = line_geometry[i+3]

                line_geometry[i+0] = lerp(x0, x2, 0.6)
                line_geometry[i+1] = lerp(y0, y2, 0.6)
            }
            line.positions({ data: line_geometry })
            */

            let fft_v = fft.getValue()
            for (let i = 0; i < fft_v.length; ++i) {
                fft_r[i] = Math.floor(map(fft_v[i], -80, 0, 0, 255))
            }
            line_fft.subimage(fft_r)

            line_target1024.use(() => {
                line_draw(lines.map(function(value) {
                    value.u_time = playhead;
                    value.u_fft = line_fft
                    return value
                }))
            })

            line_target64.use(() => {
                line_draw(lines.map(function(value) {
                    value.u_time = playhead;
                    value.u_fft = line_fft
                    return value
                }))
            })

            cube_render({
                u_resolution: [width, height],
                u_texture0: line_target1024.color[0],
                u_texture1: line_target64.color[0],
                u_text: text,
                u_time: playhead,
                u_snap: rand(),
                u_scale: [2, 2, 2],
                u_translate: [0, 0, 0],
                u_fft: line_fft
            })
        }
    }
}

canvasSketch(sketch, settings)

