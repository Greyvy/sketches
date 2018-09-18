let canvasSketch = require('canvas-sketch')

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {
    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)


        ctx.strokeStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.translate(width / 2, height / 2)
        let n = 1000
        let shape_w = width / 6
        let shape_h = height / 4
        for (let i = 0; i < n; ++i) {
            let x = Math.sin(i / n * (Math.PI * 6)) * shape_w
            let y = ((i / n) * (shape_h)) - (shape_h / 2)
            let r = shape_h * 0.42
            ctx.fillStyle = `hsla(${i / n * 360}, 90%, 50%, 1)`
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.closePath()
            ctx.fill()
        }


    }
}

canvasSketch(sketch, settings)
