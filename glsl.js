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

let glsl_fbm = `
    #define OCTAVES 6
    float fbm (in vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 0.0;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5),
                        -sin(0.5), cos(0.5));

        for (int i = 0; i < OCTAVES; i++) {
            value += amplitude*iqnoise(st, 1.0, 1.0);
            st = rot*st*2.0+shift;
            amplitude *= 0.5;
        }
        return value;
    }
`

exports.utils     = glsl_utils
exports.voronoi   = glsl_voronoi
exports.voronoise = glsl_voronoise
exports.fbm       = glsl_fbm
