let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2

    const seed_value = 42
    let rand = seed(seed_value)


    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        let gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, 'hsla(0, 0%, 0%, 0)')
        gradient.addColorStop(0.5, 'hsla(0, 0%, 0%, 1)')
        gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)')


        let stride = 16
        let margin = 0
        let n = stride * stride

        for (let i = 0; i < n; ++i) {
            let grid_size = ((width * 2 - margin * 2) / stride)
            let offset = grid_size + grid_size / 2
            let x = margin + (i % stride) * grid_size + grid_size / 2 +
                (Math.sin(playhead * TAU * 4) * 16)
            let y = margin + Math.floor(i / stride) * grid_size + grid_size / 2 +
                (Math.cos(playhead * TAU * 4) * 32)

            let size = 24 + (Math.sin(playhead * PI) * 16)

            ctx.save()
            ctx.beginPath()
            ctx.arc(x - (width * playhead), y - (height * playhead), size, 0, TAU)
            ctx.closePath()
            ctx.clip()

            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            ctx.restore()
        }

        /*
        ctx.save()
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, 256, 0, TAU)
        ctx.clip()

        ctx.restore()
        */



    }
}

canvasSketch(sketch, settings)
