var cross2 = require('gl-vec2/cross')
var sub2 = require('gl-vec2/subtract')

var tmpX = [0, 0, 0]
var tmpY = [0, 0, 0]

module.exports = function isUVBroken (uvs, a, b, c) {
  var uvA = uvs[a]
  var uvB = uvs[b]
  var uvC = uvs[c]
  sub2(tmpX, uvB, uvA)
  sub2(tmpY, uvC, uvA)
  cross2(tmpX, tmpX, tmpY)
  return tmpX[2] < 0
}
