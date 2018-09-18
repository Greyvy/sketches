let canvasSketch = require('canvas-sketch');
let seed = require('seed-random')

let settings = {
    animation: true,
    duration: 3,
    dimensions: [ 512, 512 ]
}

let PI = Math.PI
let TAU = PI * 2

let seed_value = Math.floor(Math.random() * 10000)
let rand = seed(seed_value)

let lerp = (v0, v1, t) => (1 - t) * v0 + t * v1

let sketch = ({ context, width, height }) => {

    let grid_tile_size = [32, 32]
    let grid_col = width / grid_tile_size[0]
    let grid_row = height / grid_tile_size[1]

    let grid_area = grid_col * grid_row

    // @NOTE(Grey): Tile layout: [x, y]
    let grid = Array.from(new Array(grid_area))
        .map((tile, i) => {
            let x = (i % grid_col) * grid_tile_size[0]
            let y = Math.floor(i / grid_row) * grid_tile_size[1]
            return [x, y]
        })

    let rotations = Array.from(new Array(grid_area))
        .map((tile, i) => {
            return [rand() * TAU]
        })


    return ({ context, width, height, playhead }) => {
        let ctx = context
        let t = (Math.sin(playhead * TAU) + 1) / 2

        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.fillRect(0, 0, width, height)

        grid.forEach((tile, i) => {
            let size = [grid_tile_size[0], grid_tile_size[1]]
            let pos = [tile[0] + size[0] / 2, tile[1] + size[1] / 2]

            let offset = [-size[0] / 2, -size[1] / 2]

            let r = lerp(0, rotations[i], t)
            let s = lerp(1, 0, t)

            ctx.save()
            ctx.translate(...pos)
            ctx.scale(s, s)
            ctx.rotate(r)
            ctx.strokeStyle = 'hsla(0, 0%, 0%, 1)'
            ctx.strokeRect(...offset, ...grid_tile_size)
            ctx.fillStyle = 'hsla(180, 0%, 100%, 1)'
            ctx.fillRect(...offset, ...grid_tile_size)
            ctx.restore()
        })

        ctx.save()
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.translate(width / 2, lerp(height * 0.35, height * 0.65, t))

        ctx.beginPath()
        ctx.arc(0, 0, 16, Math.PI * 2, 0)
        ctx.closePath()

        ctx.fill()
        ctx.restore()

        // @NOTE(Grey): Debug
        // ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        // ctx.font = '14px sans-serif'
        // ctx.fillText(grid_col, 10, 20)
        // ctx.fillText(grid_row, 10, 40)
        // ctx.fillText(grid_col * grid_row, 10, 60)
        // ctx.fillText(t, 10, 80)

    }
}

canvasSketch(sketch, settings)
