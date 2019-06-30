# primitive-icosphere

[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

[![demo](http://i.imgur.com/Ais73FY.png)](http://glo-js.github.io/primitive-icosphere/)

[(demo)](http://glo-js.github.io/primitive-icosphere/)

A minimal icosphere geometry for 3D rendering, including normals, UVs and cell indices.

This uses [icosphere](https://www.npmjs.com/package/icosphere) under the hood, but includes some routines to reduce texture seams. However, at certain angles and subdivisions, the seams will still be visible.

The UV seam fixes have been adapted from [UV Mapping a Sphere](http://mft-dev.dk/uv-mapping-sphere/).

## Example

```js
var radius = 1
var mesh = require('primitive-icosphere')(radius, {
  subdivisions: 3
})

// the simplicial complex
console.log(mesh.positions, mesh.cells)

// rendering attributes
console.log(mesh.uvs)
console.log(mesh.normals)
```

## Usage

[![NPM](https://nodei.co/npm/primitive-icosphere.png)](https://www.npmjs.com/package/primitive-icosphere)

#### `mesh = sphere(radius, [opt])`

Creates a new icosphere mesh with the given `radius` (default 1) and options:

- `subdivisions` number of subdivisions, defaults to `2`. Determines the mesh quality (recommended between 0 and 5)

The returned mesh is an object with the following data:

```
{
  positions: [ [x, y, z], [x, y, z], ... ],
  cells: [ [a, b, c], [a, b, c], ... ],
  uvs: [ [u, v], [u, v], ... ],
  normals: [ [x, y, z], [x, y, z], ... ]
}
```

## License

MIT, see [LICENSE.md](http://github.com/glo-js/primitive-icosphere/blob/master/LICENSE.md) for details.
