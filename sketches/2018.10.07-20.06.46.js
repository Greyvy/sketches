let canvasSketch = require('canvas-sketch')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let stride = 16
    let n = stride * (stride + stride)
    let points = []
    for (let i = 0; i < n; ++i) {
        let size = width / stride
        let x = (size / 2) + (i % stride) * size
        let y = ((size / 2) + Math.floor(i / stride) * size) - height
        points.push([x, y])
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        for (let i = 0; i < points.length; ++i) {
            let t = playhead
            let p = points[i]

            let y = p[1] + (height * t)
            let r = y > 0 ? (y / height) * (width / stride * 0.75) : (width / stride * 0.005)

            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
            ctx.beginPath()
            ctx.arc(p[0], y, r, 0, TAU)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
        }

    }
}

canvasSketch(sketch, settings)
