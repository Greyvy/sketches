let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {


    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)


    let point = [0, 0]
    let point_move = (p, l) => {
        return [p[0] + (-(l / 2) + rand() * l), p[1]]
    }


    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        ctx.translate(width / 2, height / 2)
        ctx.fillStyle = 'hsla(0, 10%, 10%, 0.05)'
        ctx.globalCompositeRule = 'multiply'

        for (let i = 0; i < 300; ++i) {
            ctx.beginPath()
            ctx.arc(point[0], point[1], height * 0.05, 0, Math.PI * 2)
            ctx.closePath()
            ctx.fill()
            point = point_move(point, width / 6)
        }

    }
}

canvasSketch(sketch, settings)
