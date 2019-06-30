var icosphere = require('icosphere')
var normalize = require('gl-vec3/normalize')
var scale = require('gl-vec3/scale')
var fixWrappedUVs = require('./lib/fix-wrapped-uvs')
var fixPoles = require('./lib/fix-pole-uvs')

module.exports = function primitiveIcosphere (radius, opt) {
  opt = opt || {}
  radius = typeof radius !== 'undefined' ? radius : 1

  var subdivisions = typeof opt.subdivisions !== 'undefined' ? opt.subdivisions : 2
  var complex = icosphere(subdivisions)

  var normals = []
  var uvs = []
  var i, position

  for (i = 0; i < complex.positions.length; i++) {
    position = complex.positions[i]

    // get UV from unit icosphere
    var u = 0.5 * (-(Math.atan2(position[2], -position[0]) / Math.PI) + 1.0)
    var v = 0.5 + Math.asin(position[1]) / Math.PI
    uvs.push([ 1 - u, 1 - v ])
  }

  var mesh = {
    positions: complex.positions,
    cells: complex.cells,
    uvs: uvs,
    normals: normals
  }

  // attempt to fix some of the glaring seam issues
  fixPoles(mesh)
  fixWrappedUVs(mesh)

  // now determine normals
  for (i = 0; i < mesh.positions.length; i++) {
    position = mesh.positions[i]

    // get normal
    var normal = normalize([0, 0, 0], position)
    normals.push(normal)

    // and scale sphere to radius
    scale(position, position, radius)
  }

  return mesh
}
