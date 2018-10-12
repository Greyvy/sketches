let canvasSketch = require('canvas-sketch')

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {
    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)
    }
}

canvasSketch(sketch, settings)
