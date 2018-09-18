let canvasSketch = require('canvas-sketch')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2

    let sin = (v) => Math.sin(v)
    let cos = (v) => Math.cos(v)

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        let n = 20
        let t = sin(playhead * TAU)
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.strokeStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.translate(width / 2, height / 2)

        ctx.beginPath()
        for (let i = 0; i < n; ++i) {
            let x = sin((i / n) * (TAU * (3 + ((PI / 8) * t)))) * width / 2
            let y = sin((i / n) * (TAU * 16)) * height / 2
            ctx.lineTo(x, y)
            // ctx.fillRect(x, y, 1, 1)
        }
        ctx.closePath()
        ctx.stroke()

    }
}

canvasSketch(sketch, settings)
