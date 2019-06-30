module.exports = fixPoleUVs
function fixPoleUVs (mesh) {
  var positions = mesh.positions
  var cells = mesh.cells
  var uvs = mesh.uvs

  var northIndex = firstYIndex(positions, 1)
  var southIndex = firstYIndex(positions, -1)
  if (northIndex === -1 || southIndex === -1) {
    // could not find any poles, bail early
    return
  }

  var newVertices = positions.slice()
  var newUvs = uvs.slice()
  var verticeIndex = newVertices.length - 1

  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i]
    var a = cell[0]
    var b = cell[1]
    var c = cell[2]

    if (a === northIndex) {
      visit(cell, northIndex, b, c)
    } else if (a === southIndex) {
      visit(cell, southIndex, b, c)
    }
  }

  mesh.positions = newVertices
  mesh.uvs = newUvs

  function visit (cell, poleIndex, b, c) {
    var uv1 = uvs[b]
    var uv2 = uvs[c]
    uvs[poleIndex][0] = (uv1[0] + uv2[0]) / 2
    verticeIndex++
    newVertices.push(positions[poleIndex].slice())
    newUvs.push(uvs[poleIndex].slice())
    cell[0] = verticeIndex
  }
}

function firstYIndex (list, value) {
  for (var i = 0; i < list.length; i++) {
    var vec = list[i]
    if (Math.abs(vec[1] - value) <= 1e-4) {
      return i
    }
  }
  return -1
}
