var isSeam = require('./is-uv-seam')
var MIN = 0.25
var MAX = 0.75

module.exports = fixWrappedUVs

function fixWrappedUVs (mesh) {
  var positions = mesh.positions
  var cells = mesh.cells
  var uvs = mesh.uvs

  var newVertices = positions.slice()
  var newUvs = uvs.slice()
  var visited = {}

  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i]

    var a = cell[0]
    var b = cell[1]
    var c = cell[2]

    if (!isSeam(uvs, a, b, c)) {
      continue
    }

    var p0 = positions[a]
    var p1 = positions[b]
    var p2 = positions[c]
    var uv0 = uvs[a]
    var uv1 = uvs[b]
    var uv2 = uvs[c]

    if (uv0[0] < MIN) {
      a = revisit(visited, a, uv0, p0)
    }
    if (uv1[0] < MIN) {
      b = revisit(visited, b, uv1, p1)
    }
    if (uv2[0] < MIN) {
      c = revisit(visited, c, uv2, p2)
    }

    cell[0] = a
    cell[1] = b
    cell[2] = c
  }

  fixUVEdges(cells, newUvs)
  // modify mesh in place with new lists
  mesh.positions = newVertices
  mesh.uvs = newUvs

  function revisit (cache, face, uv, position) {
    if (!(face in cache)) {
      newVertices.push(position.slice())
      newUvs.push(uv.slice())
      var verticeIndex = newVertices.length - 1
      cache[face] = verticeIndex
      return verticeIndex
    } else {
      return cache[face]
    }
  }
}

function fixUVEdges (cells, uvs) {
  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i]
    var uv0 = uvs[cell[0]]
    var uv1 = uvs[cell[1]]
    var uv2 = uvs[cell[2]]

    var max = Math.max(uv0[0], uv1[0], uv2[0])
    var min = Math.min(uv0[0], uv1[0], uv2[0])
    if (max > MAX && min < MIN) {
      if (uv0[0] < MIN) uv0[0] += 1
      if (uv1[0] < MIN) uv1[0] += 1
      if (uv2[0] < MIN) uv2[0] += 1
    }
  }
}
