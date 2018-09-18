let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    // @NOTE(Grey): seed 42 is pretty good
    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)


    let walker = [0, 0]

    let walker_update = (w, l) => {
        let r = [w[0] + (-(l / 2) + rand() * l), w[1] + (-(l / 2) + rand() * l)]
        return r
    }


    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'hsla(0, 50%, 100%, 1)'
        ctx.fillRect(0, 0, width, height)

        ctx.translate(width / 2, height / 2)

        // ctx.globalCompositeOperation = 'multiply'
        for (let l = 0; l < 360; ++l) {
            ctx.strokeStyle = `hsla(0, 0%, ${(l / 360) * 100}%, 0.125)`
            walker = [0, 0]
            ctx.beginPath()
            for (let i = 0; i < 360; ++i) {
                ctx.lineWidth = 1 + (12 * l / 360)
                walker = walker_update(walker, 34)
                ctx.lineTo(...walker)
            }
            ctx.stroke()
        }

    }
}

canvasSketch(sketch, settings)
