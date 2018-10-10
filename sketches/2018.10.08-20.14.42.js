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

    let seed_value = 42 // Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)

    let stride = 8
    let margin = 64
    let n = stride * stride
    let size = (width - margin * 2) / stride
    let points = []
    for (let i = 0; i < n; ++i) {
        let x = margin + (size / 2) + (i % stride) * size
        let y = margin + (size / 2) + Math.floor(i / stride) * size
        points.push([x, y])
    }

    let lines = []
    for (let i = 0; i < n; ++i) {
        let x = rand() * size
        let y = rand() * size
        lines.push([
            x, i % 2 === 0 ? 0 : size,
            i % 2 === 0 ? size : 0, y
        ])
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        for (let i = 0; i < n; ++i) {
            let t = playhead
            let p = points[i]

            let size = (width - margin * 2) / stride * 0.85
            let x = p[0]
            let y = p[1]

            ctx.save()
            ctx.strokeStyle = 'hsla(0, 0%, 80%, 1)'
            ctx.translate(-size / 2, -size / 2)
            ctx.strokeRect(x, y, size, size)
            ctx.restore()

        }

        for (let i = 0; i < lines.length; ++i) {
            let p = points[i]
            let l = lines[i]

            ctx.save()
            ctx.translate(p[0] - size / 2, p[1] - size / 2)

            /*
             * debug
            ctx.save()
            ctx.fillStyle = 'hsla(50, 50%, 50%, 1)'
            ctx.beginPath()
            ctx.arc(l[0], i % 2 === 0 ? 0 : size, 4, 0, TAU)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
            */

            ctx.save()
            ctx.beginPath()
            ctx.moveTo(l[0], l[1])
            ctx.lineTo(l[2], l[3])
            ctx.stroke()
            ctx.restore()

            ctx.restore()
        }

    }
}

canvasSketch(sketch, settings)

