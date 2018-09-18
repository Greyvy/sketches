let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animation: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)


    let bubbles = Array(400)
        .fill({})
        .map(v => {
            return {
                x: rand() * width,
                y: rand() * height,
                r: 20 + rand() * 120,
                s: 1
            }
        })

    let point = {
        x: 0,
        y: 0
    }


    let draw_circle = (ctx, x, y, r) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.closePath()
    }

    let circle = draw_circle.bind(this, context)

    return ({ context: ctx, width, height, playhead: t }) => {
        ctx.fillStyle = `hsla(200, 80%, 95%, 1)`
        ctx.fillRect(0, 0, width, height)

        ctx.save()
        ctx.fillStyle = `hsla(0, 80%, 50%, 1)`
        point.x = width / 2 + Math.cos(t * TAU) * width / 4
        point.y = height / 2 + Math.sin(t * TAU) * width / 4
        circle(point.x, point.y, 4)
        ctx.fill()
        ctx.restore()

        ctx.strokeStyle = `hsla(200, 80%, 50%, 1)`
        bubbles.forEach((bub, i) => {
            let s = vec.dist([bub.x, bub.y], [point.x, point.y]) / width
            circle(bub.x, bub.y, bub.r * s)
            ctx.stroke()
        })


    }
}

canvasSketch(sketch, settings)
