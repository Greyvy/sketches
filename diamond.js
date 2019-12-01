module.exports = function() {
    let v_front = [ 0,  0,  1]
    let v_back  = [ 0,  0, -1]
    let v_left  = [-1,  0,  0]
    let v_right = [ 1,  0,  0]
    let v_bot   = [ 0,  1,  0]
    let v_top   = [ 0, -1,  0]

    let positions = [
        ...v_left , ...v_top, ...v_front,
        ...v_front, ...v_top, ...v_right,
        ...v_right, ...v_top, ...v_back ,
        ...v_back , ...v_top, ...v_left ,

        ...v_left , ...v_front, ...v_bot,
        ...v_front, ...v_right, ...v_bot,
        ...v_right, ...v_back , ...v_bot,
        ...v_back , ...v_left , ...v_bot
    ]

    // @NOTE(Grey): The normals and the uvs are utter nonsense
    // and are not a good indication of what they should actually be
    let normals = new Array(positions.length)
        .fill(0)
    let uvs     = new Array((positions.length/3)*2).fill(0)
    let cells   = new Array(positions.length/3)
        .fill(0)
        .map(function(v, i, a) { return i })

    return {
        positions: positions,
        normals  : normals,
        uvs      : uvs,
        cells    : cells
    }
}
