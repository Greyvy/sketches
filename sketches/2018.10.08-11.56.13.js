let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)

    let stride = 8
    let n = stride * stride
    let margin = 64
    let size = (width - margin * 2) / stride
    let points = []
    let lines = []
    for (let i = 0; i < n; ++i) {
        let x = margin + (size / 2) + (i % stride) * size
        let y = margin + (size / 2) + Math.floor(i / stride) * size
        points.push([x, y])
        lines.push([rand() * (size * 0.45), rand() * (size * 0.45)])
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        for (let i = 0; i < n; ++i) {
            let t = playhead
            let p = points[i]
            let l = lines[i]

            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 90%, 1)'
            let size = (width - margin * 2) / stride * 0.65
            let x = p[0] - (size / 2)
            let y = p[1] - (size / 2)
            ctx.fillRect(x, y, size, size)
            ctx.restore()

            ctx.save()
            ctx.translate(...p)
            ctx.rotate(Math.pow(Math.sin(t * PI / 2), p[1] * 0.5) * PI)
            ctx.lineCap = 'round'
            ctx.lineWidth = width * 0.005
            ctx.beginPath()
            ctx.moveTo(-l[0], -l[1])
            ctx.lineTo(+l[0], +l[1])
            ctx.stroke()
            ctx.restore()
        }

    }
}

canvasSketch(sketch, settings)

