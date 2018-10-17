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

    let gradients = []
    let n = 30
    for (let i = 0; i <= n; ++i) {
        gradients.push(
            create_gradient(
                ctx,
                [
                    Math.sin(rand() * PI) * width / 2,
                    Math.cos(rand() * PI) * height / 2,
                    0, height
                ],
                [
                    [0, 'hsla(0, 0%, 0%, 0)'],
                    [0.25 + rand() * 0.5, 'hsla(0, 0%, 0%, 1)'],
                    [1, 'hsla(0, 0%, 0%, 0)']
                ]
            )
        )
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        /*
        ctx.save()
        ctx.fillStyle = gradients[0]
        ctx.fillRect(0, 0, width / 2, height)
        ctx.fillStyle = gradients[1]
        ctx.fillRect(width / 2, 0, width / 2, height)
        ctx.restore()
        */

        ctx.save()
        /*
        ctx.beginPath()
        ctx.arc(
            width / 2, height / 2,
            256 + Math.sin(playhead * PI) * 128,
            0, TAU
        )
        ctx.closePath()
        ctx.clip()
        */
        for (let i = 0; i < Math.floor(playhead * gradients.length) + 1; ++i) {
            ctx.fillStyle = gradients[i]
            ctx.fillRect(i / gradients.length * width, 0,
                width / gradients.length, height)
        }
        ctx.restore()

    }
}

canvasSketch(sketch, settings)
