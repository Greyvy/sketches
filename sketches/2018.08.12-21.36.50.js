let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')

let settings = {
    animate: true,
    duration: 3,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {


    const PI = Math.PI
    const TAU = PI * 2


    let simplex = new SimplexNoise()


    let field = []
    for (let i = 0; i < width; ++i) {
        field.push([i, simplex.noise2D(i, i)])
    }
    // debugger


    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        ctx.translate(0, height / 2)
        ctx.strokeStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.beginPath()
        ctx.moveTo(...field[0])
        for (let i = 1; i < field.length; ++i) {
            let pos = [
                field[i][0],
                field[i][1] * Math.pow((Math.sin((i / width * (PI / 2))) * (0 + Math.sin(playhead * TAU) * 10)), 4)
            ]
            ctx.lineTo(...pos)
        }
        ctx.stroke()


        ctx.fillStyle = 'hsla(0, 0%, 80%, 1)'
        ctx.font = '48px DINCondensed-Bold'
        ctx.fillText((playhead).toFixed(2), 10, 50)
    }
}

canvasSketch(sketch, settings)
