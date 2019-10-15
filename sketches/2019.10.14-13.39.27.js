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
    duration: 8,
    dimensions: [ 1024, 1024 ],
    attributes: {
        antialiase: true
    }
}


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

function vec2_dir(v0, v1, v2) {
    let line_a = vec2_normalize(vec2_sub(v0, v1))
    let line_b = vec2_normalize(vec2_sub(v2, v0))
    let tangent = vec2_normalize(vec2_add(line_a, line_b))

    let mit = [-tangent[1], tangent[0]]
    let len = [1.0/vec2_dot(mit, [-line_a[1], line_a[0]])]

    return { normal: mit, length: len }
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

    let bgc = hsluv.hsluvToRgb([0, 0, rand()*100])

    let line_target1024 = regl.framebuffer({
        color: [ regl.texture({ type: 'float', width: 1024, height: 1024 }) ]
    })
    let line_target64 = regl.framebuffer({
        color: [ regl.texture({ type: 'float', width: 64, height: 64 }) ]
    })

    let cube_render_panel = plane_make()

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

            vec2 uv_t = uv;

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

            // vec4 glitch = mix(lowr, blur, step(u_snap, 0.95));
            // vec4 color = mix(text, base, text.a);
            // vec4 color = mix(base, blur, noise);

vec4 color = base;

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

    function line_make(points) {
        let N = points.length
        // @TODO(Grey): Convert these to Float32Arrays, which will require
        // me removing `.push()` calls and replacing them with indexing
        let positions  = []
        let uvs        = []
        let normals    = []
        let mitres     = []
        let velocities = []

        for (let i = 0; i < N; i += 2) {
            let prev = i > 0 ? [points[i-2], points[i-1]] : null
            let curr = [points[i+0], points[i+1]]
            let next = i < N-2 ? [points[i+2], points[i+3]] : null

            // @NOTE(Grey): Defaults
            let pos   = curr
            let uv    = [0, i/N] // @TODO(Grey): Fix uv's
            let vel   = [0, 0]
            let norm  = [0, 0]
            let mitre = [-1, 1]

            if (prev === null) {
                let res = vec2_dir(next, curr, next)
                norm = res.normal
            } else if (next === null) {
                norm = vec2_normal(vec2_normalize(vec2_sub(curr, prev)))
            } else {
                let res = vec2_dir(curr, prev, next)
                norm  = res.normal
                mitre = [-res.length, res.length]
            }

            positions.push(...pos, ...pos)
            uvs.push(...uv, ...uv)
            velocities.push(...vel, ...vel)
            normals.push(...norm, ...norm)
            mitres.push(...mitre)
        }
        return {
            positions,
            uvs,
            normals,
            mitres,
            velocities
        }
    }

    let N_LINES  = 8
    let N_POINTS = 128

    let lines_geo = []
    for (let i = 0; i < N_LINES; ++i) {
        let line_geo = []
        for (let j = 0; j <= N_POINTS; ++j) {
            let jt = j/(N_POINTS-1)
            let x = simplex.noise2D(i+jt, i+2.0-jt*4.0)
            let y = (1.0-jt*2.0)*0.95
            // let rt = Math.sin(jt*PI)
            // let r = 0.5+simplex.noise2D(i+rt, rt)*0.125
            // let x = Math.cos(jt*TAU)*r
            // let y = Math.sin(jt*TAU)*r
            line_geo.push(x, y)
        }
        lines_geo.push(line_make(line_geo))
    }

    let line_buffer_positions = regl.buffer({
        usage: 'dynamic', data: lines_geo[0].positions
    })
    let line_buffer_normals = regl.buffer({
        usage: 'dynamic', data: lines_geo[0].normals
    })
    let line_buffer_mitres = regl.buffer({
        usage: 'dynamic', data: lines_geo[0].mitres
    })
    let line_buffer_velocities = regl.buffer({
        usage: 'dynamic', data: lines_geo[0].velocities
    })

    let line_draw = regl({
        vert: `
        precision mediump float;
        #define PI 3.141592653589793

        attribute vec2 a_position, a_normal, a_uv, a_velocity;
        attribute float a_mitre;

        uniform mat4 u_projection, u_view, u_matrix;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform float u_time, u_index, u_length, u_linewidth;

        varying vec4 v_vertex;
        varying vec2 v_uv;
        varying float v_edge;

        ${glsl_utils}
        ${glsl_voronoi}
        ${glsl_voronoise}

        void main() {
            vec2 normal = normalize(a_normal);
            vec2 position = a_position;
            vec2 velocity = a_velocity;
            float mitre = a_mitre;

            float noise = iqnoise(vec2(position.y+sin(u_time*PI), position.x), 1.0, 1.0);

            float line_width = u_linewidth; // +length(velocity);
            vec2 p = position.xy+vec2(normal*line_width/2.0*mitre);

            gl_Position = u_projection*u_view*u_matrix*vec4(p, 0.0, 1.0);
            gl_PointSize = 8.0;

            v_edge = sign(mitre);
            v_uv = a_uv;
            v_vertex = u_projection*u_view*u_matrix*vec4(p, 0.0, 1.0);
        }
        `,
        frag: `
        #extension GL_OES_standard_derivatives : enable
        precision mediump float;
        #define PI 3.141592653589793

        uniform float u_time;
        uniform vec3 u_random;
        uniform vec2 u_resolution;
        uniform vec4 u_background;

        varying vec4 v_vertex;
        varying vec2 v_uv;
        varying float v_edge;

        ${glsl_utils}
        ${glsl_voronoi}
        ${glsl_voronoise}

        void main() {
            vec2 st = gl_FragCoord.xy/u_resolution.xy;
            vec2 uv = v_uv;

            float noise = iqnoise(vec2(sin(u_time*PI), v_vertex.y+u_random.x), 1.0, 1.0);

            vec4 color = vec4(1.0-vec3(u_background), 1.0);

            // float inner = noise;
            float inner = 0.0;
            float v = 1.0-abs(v_edge);
            v = smoothstep(0.65, 0.7, v*inner);

            gl_FragColor = mix(color, vec4(0.0), v);
        }
        `,
        attributes: {
            a_position: line_buffer_positions,
            a_uv: lines_geo[0].uvs,
            a_normal: line_buffer_normals,
            a_mitre: line_buffer_mitres,
            a_velocity: line_buffer_velocities
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
                let { u_time } = props

                return mat4.identity([])
            },
            u_projection: ({viewportWidth: width, viewportHeight: height}) => {
                return mat4.perspective([], PI/2, width/height, 0.01, 50)
            },
            u_time: regl.prop('u_time'),
            u_index: regl.prop('u_index'),
            u_random: regl.prop('u_random'),
            u_length: regl.prop('u_length'),
            u_resolution: regl.prop('u_resolution'),
            u_background: regl.prop('u_background'),
            u_linewidth: regl.prop('u_linewidth')
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
        count: lines_geo[0].positions.length/2,
    })

    let lines = new Array(N_LINES)
        .fill({})
        .map(function(value, i, a) {
            return {
                u_time: 0,
                u_index: i,
                u_random: [rand(), rand(), rand()],
                u_length: a.length,
                u_resolution: [width, height],
                u_background: [...bgc, 1],
                u_linewidth: rand()*0.125
            }
        })

    let random_wags = new Array(N_LINES).fill([0, 0])
    return ({ playhead, frame }) => {
        regl.poll()
        regl.clear({color: [...bgc, 1], depth: 1})

        regl.clear({ color: bgc, depth: 1, framebuffer: line_target1024 })
        regl.clear({ color: bgc, depth: 1, framebuffer: line_target64 })

        if (frame%32 === 0) {
            for (let i = 0; i < random_wags.length; ++i) {
                random_wags[i] = [
                    simplex.noise2D(frame+(i/(random_wags.length-1)), playhead),
                    (1.0-rand()*2.0)
                ]
            }
        }

        for (let i = 0; i < lines_geo.length; ++i) {
            let line = lines_geo[i]
            lines[i].u_time = playhead
            // line.positions[0] = line.positions[2] = random_wags[i][0]
            // line.positions[1] = line.positions[3] = random_wags[i][1]
            line.positions[0] = line.positions[2] = lerp(line.positions[0], random_wags[i][0], 0.16)
            // line.positions[1] = line.positions[3] = lerp(line.positions[1], random_wags[i][1], 0.16)
            for (let i = 0; i < line.positions.length; i += 4) {
                let px0 = line.positions[i-4]
                let px1 = line.positions[i-2]
                let py0 = line.positions[i-3]
                let py1 = line.positions[i-1]

                let cx0 = line.positions[i+0]
                let cx1 = line.positions[i+2]
                let cy0 = line.positions[i+1]
                let cy1 = line.positions[i+3]

                let nx0 = line.positions[i+4]
                let nx1 = line.positions[i+6]
                let ny0 = line.positions[i+5]
                let ny1 = line.positions[i+7]

                if (i > 0) {
                    let velx = line.positions[i+0]-lerp(cx0, px0, 0.16)
                    // let vely = line.positions[i+1]-lerp(cy0, py0, 0.16)

                    line.velocities[i+0] = line.velocities[i+2] = velx
                    // line.velocities[i+1] = line.velocities[i+3] = vely
                    line.positions[i+0] = line.positions[i+2] = lerp(cx0, px0, 0.16)
                    // line.positions[i+1] = line.positions[i+3] = lerp(cy0, py0, 0.16)
                }

                if (i === 0) {
                    let res = vec2_dir([nx0, ny0], [cx0, cy0], [nx0, ny0])
                    line.normals[i+0] = line.normals[i+2] = res.normal[0]
                    line.normals[i+1] = line.normals[i+3] = res.normal[1]
                    line.mitres[i+0] = line.mitres[i+2] = -1
                    line.mitres[i+1] = line.mitres[i+3] = 1
                } else if (i === line.positions.length) {
                    let norm = vec2_normal(vec2_normalize(vec2_sub([cx0, cy0], [px0, py0])))
                    line.normals[i+0] = line.normals[i+2] = norm
                    line.normals[i+1] = line.normals[i+3] = norm
                    line.mitres[i+0] = line.mitres[i+2] = -1
                    line.mitres[i+1] = line.mitres[i+3] = 1
                } else {
                    let res = vec2_dir([cx0, cy0], [px0, py0], [nx0, ny0])
                    line.normals[i+0] = line.normals[i+2] = res.normal[0]
                    line.normals[i+1] = line.normals[i+3] = res.normal[1]
                    line.mitres[i+0] = line.mitres[i+2] = -res.length
                    line.mitres[i+1] = line.mitres[i+3] = res.length
                }
            }
        }

        line_target1024.use(() => {
            for (let i = 0; i < lines_geo.length; ++i) {
                line_buffer_positions({ data: lines_geo[i].positions })
                line_buffer_normals({ data: lines_geo[i].normals })
                line_buffer_mitres({ data: lines_geo[i].mitres })

                line_draw(lines[i])
            }
        })

        line_target64.use(() => {
            for (let i = 0; i < lines_geo.length; ++i) {
                line_buffer_positions({ data: lines_geo[i].positions })
                line_buffer_normals({ data: lines_geo[i].normals })
                line_buffer_mitres({ data: lines_geo[i].mitres })

                line_draw(lines[i])
            }
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
        })
    }
}

canvasSketch(sketch, settings)

