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

exports.vec2_sub       = vec2_sub
exports.vec2_add       = vec2_add
exports.vec2_scale     = vec2_scale
exports.vec2_dot       = vec2_dot
exports.vec2_normalize = vec2_normalize
exports.vec2_normal    = vec2_normal
exports.vec2_dir       = vec2_dir
