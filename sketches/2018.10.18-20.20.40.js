let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context: ctx, width, height }) => {
    const PI = Math.PI
    const TAU = PI * 2

    const seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)

    let create_gradient = (ctx, size, stops) => {
        let result = ctx.createLinearGradient(...size)
        for (let i = 0; i < stops.length; ++i) {
            result.addColorStop(stops[i][0], stops[i][1])
        }
        return result
    }

    let grid = []
    let stride = 24
    let margin = 128
    let cell_size = (width - (margin * 2)) / stride

    for (let i = 0; i < stride*stride; ++i) {
        let x = margin+i%stride*cell_size
        let y = margin+Math.floor(i/stride)*cell_size
        grid.push([x, y, cell_size, cell_size])
    }

    let gradients = []
    for (let i = 0; i < grid.length; ++i) {
        gradients.push([rand()*TAU, rand()*TAU, 0.5 + rand() * 0.5])
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
        ctx.fillRect(0, 0, width, height)

        for (let i = 0; i < grid.length; ++i) {
            let cell = grid[i]
            let a0 = gradients[i][0]+(Math.sin(playhead*PI)*PI)
            let a1 = gradients[i][1]+(Math.sin(playhead*PI)*PI)
            let a2 = gradients[i][2]

            let x0 = cell[0]+(cell[2]/2)+Math.cos(a0)*(cell[2]/2)
            let y0 = cell[1]+(cell[3]/2)+Math.sin(a1)*(cell[2]/2)
            let x1 = cell[0]+(cell[2]/2)+Math.cos(a0+PI)*(cell[2]/2)
            let y1 = cell[1]+(cell[3]/2)+Math.sin(a1+PI)*(cell[2]/2)

            let gradient = create_gradient(
                ctx,
                [x0, y0, x1, y1],
                [[0, 'hsla(0, 0%, 60%, 1)'], [a2, 'hsla(0, 0%, 40%, 1)']]
            )
            ctx.save()
            ctx.fillStyle = gradient
            console.log(ctx.fillStyle)
            ctx.fillRect(...cell)
            ctx.restore()
        }

        /*
        let gradient = create_gradient(
            ctx,
            [0, 0, width, height],
            [
                [0, 'hsla(0, 0%, 70%, 1)'],
                [0.25+(Math.sin(playhead*TAU)*0.125), 'hsla(0, 0%, 30%, 1)'],
                [0.75+(Math.sin(playhead*TAU)*0.125), 'hsla(0, 0%, 30%, 1)'],
                [1, 'hsla(0, 0%, 70%, 1)']
            ]
        )
        let stroke = 128
        ctx.save()
        ctx.lineWidth = stroke
        ctx.strokeStyle = gradient
        ctx.strokeRect(
            margin-(stroke/2), margin-(stroke/2),
            width-(margin*2)+(stroke), height-(margin*2)+(stroke)
        )
        ctx.restore()
        */

    }
}

canvasSketch(sketch, settings)
