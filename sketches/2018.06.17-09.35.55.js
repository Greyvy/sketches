let canvasSketch = require('canvas-sketch')

let settings = {
    animation: true,
    duration: 3,
    dimensions: [ 768, 768 ]
}

let random = (min, max) => Math.random() * (max - min) + min

let vec2 = {
    add: function(a, b) {
        return [a[0] + b[0], a[1] + b[1]]
    },
    sub: function(a, b) {
        return [a[0] - b[0], a[1] - b[1]]
    },
    mul: function(a, b) {
        return [a[0] * b[0], a[1] * b[1]]
    },
    div: function(a, b) {
        return [a[0] / b[0], a[1] / b[1]]
    }
}

// let brown = [0.1111, 1]
let brown = [1, 0.75] // no longer brown :/
let color = {
    hsla: function(arr) {
        return `hsla(${arr[0] * 360}, ${arr[1] * 100}%, ${arr[2] * 100}%, 1)`
    }
}

let cell_size = [32, 32]
let cells_per_row = settings.dimensions[0] / cell_size[0]
let particles_y = cell_size[0] * 5

let particles = function(num) {
    let base = Array(num).fill(0)
    return base.map(p => particles_make())
}

let particles_make = function() {
    return particle(
        random(0, settings.dimensions[0]), particles_y,
        {
            vel: [random(-5, 5), random(0, 10) > 7 ? random(-15, -5) : random(-10, -2)],
            size: cell_size,
            col: [...brown, random(0.4, 0.8)]
        }
    )
}

let particles_update = function(ctx, parts) {
    ctx.save()
    parts.forEach((p, i) => {
        if (p.pos[1] > particles_y) {
            parts[i] = particles_make()
        } else {
            particle_update(p)
            ctx.save()
            ctx.fillStyle = color.hsla(p.col)
            ctx.fillRect(p.pos[0], p.pos[1], p.size[0], p.size[1])
            ctx.restore()
        }
    })
    ctx.restore()
}

let particle = function(x, y, settings) {
    let result = Object.assign({
        pos: [x, y],
        size: [8, 8],
        acc: [0, 0],
        vel: [0, 0],
        col: [0, 0, 0]
    }, settings)
    return result
}

let particle_update = function(p) {
    let ivel = vec2.add(p.acc, p.vel)
    let nvel = vec2.add(ivel, [0, 0.5])
    let npos = vec2.add(p.pos, nvel)
    p.vel = nvel
    p.pos = npos
}


let grid_base = Array(cells_per_row * cells_per_row).fill(0)
let grid = grid_base.map((tile, i) => {
    let x = (i % cells_per_row) * cell_size[0]
    let y = Math.floor(i / cells_per_row) * cell_size[1]
    return [x, y, [...brown, random(0, 1)]]
})

let poppers = particles(20)

let sketch = () => {
    return ({ context, width, height, playhead }) => {
        let PI = Math.PI
        let TAU = PI * 2
        let ctx = context
        let p = Math.sin(playhead * PI)

        // brown = [p, 0.2]

        ctx.fillStyle = color.hsla([...brown, 0.9])
        ctx.fillRect(0, 0, width, height)

        ctx.save()
        ctx.translate(0, particles_y)
        grid.forEach((tile) => {
            ctx.save()
            let lite = 0.5 + Math.sin((tile[2][2] + playhead) * TAU) * 0.05
            ctx.fillStyle = color.hsla([tile[2][0], tile[2][1], lite])
            ctx.fillRect(tile[0], tile[1], cell_size[0], cell_size[1])
            ctx.restore()
        })
        ctx.restore()

        particles_update(ctx, poppers)

        ctx.fillStyle = 'hsla(120, 50%, 50%, 1)'
        ctx.font = '62px sans-serif'
        // ctx.fillText((grid[10][2][2] + p), 24, 62)

    }
}

canvasSketch(sketch, settings)
