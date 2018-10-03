let canvasSketch = require('canvas-sketch')

let settings = {
    animate: true,
    duration: 8,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2


    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, width, height)

        ctx.translate(width / 2, height / 2)
        ctx.rotate(playhead * TAU)
        let n = 8
        for (let i = 0; i <= n; ++i) {
            let margin = 512
            let t = Math.abs(Math.sin((playhead) * PI * (i + 1)))
            let x = -width / 2 + (margin / 2) + ((width - margin) * t)
            let y = -height / 2 + (margin / 2) + (i / n * (height - margin))

            ctx.save()
            ctx.translate(x, y)
            ctx.rotate(t * TAU)
            ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
            ctx.fillRect(-8, -8, 16, 16)
            ctx.restore()
        }

    }
}

canvasSketch(sketch, settings)
