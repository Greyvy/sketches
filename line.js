let {
    vec2_sub,
    vec2_add,
    vec2_scale,
    vec2_dot,
    vec2_normalize,
    vec2_normal,
    vec2_dir
} = require('./vec2_funcs')

module.exports = function(points) {
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

