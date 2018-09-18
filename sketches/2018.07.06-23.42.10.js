let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    // dimensions: [ 1024, 512 ]
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)

    let tile = [64, 64]
    let cols = (width - 64) / tile[0]
    let rows = (height - 64) / tile[1]

    let num = cols * rows - Math.floor(rows / 2)

    let line = (x, y, width, tile) => {
        let result = Array(width / tile[0])
            .fill([])
            .map((v, i) => {
                let cols = width / tile[0]
                let rx = x + (i % cols) * tile[0]
                return [rx, y]
            })
        return result
    }

    let points = Array(rows)
        .fill([])
        .map((v, i) => {
            let yo = Math.floor(i / 1)
            let w = yo % 2 === 0 ? width - tile[0] : width - tile[0] * 2

            let x = yo % 2 === 0 ? 0 : tile[0] / 2
            let y = yo * tile[1]

            return line(x, y, w, tile)
        })

    let polygon = (ctx, x, y, radius, sides) => {
        ctx.beginPath()
        ctx.moveTo(Math.cos(0) * radius, Math.sin(0) * radius)
        for (let i = 0; i < sides; ++i) {
            let x = Math.cos(i * TAU / sides) * radius
            let y = Math.sin(i * TAU / sides) * radius
            ctx.lineTo(x, y)
        }
        ctx.closePath()
    }

    let poly = polygon.bind(this, context)

    let cocaine = line(0, (height / 2) - 64, width - 128, tile)

    return ({ context, width, height }) => {
        context.fillStyle = 'hsla(60, 90%, 95%, 1)'
        context.fillRect(0, 0, width, height)

        context.globalCompositeOperation = 'multiply'

        context.translate(tile[0], tile[1])


        points.forEach((r) => {
            r.forEach((v, i, a) => {
                context.save()
                context.strokeStyle = 'hsla(60, 30%, 30%, 1)'
                context.fillStyle = 'hsla(240, 40%, 50%, 1)'
                context.translate(...v)
                context.rotate(i * TAU / a.length)

                if (rand() > 0.5) {
                    poly(0, 0, 32, 8)
                    if (rand() > 0.1) {
                        context.stroke()
                    } else {
                        context.fill()
                    }
                }

                poly(0, 0, 8 + Math.sin(i * TAU / a.length) * 28, 6)
                context.stroke()

                if (rand() > 0.6) {
                    context.save()
                    context.rotate(-i * TAU / a.length)
                    context.globalCompositeOperation = 'source-over'
                    context.fillStyle = 'hsla(0, 0%, 100%, 1)'
                    poly(0, 0, 42, 8)
                    context.fill()
                    context.stroke()
                    context.globalCompositeOperation = 'multiply'
                    context.restore()
                }

                context.restore()

            })
        })


        cocaine.forEach((v, i, a) => {
            let r = 12 + Math.abs((Math.sin(i * (TAU / a.length)) * 24))
            let rot = rand() * TAU
            context.save()
            context.fillStyle = 'hsla(300, 40%, 50%, 1)'
            context.translate(...v)
            context.rotate(rot)
            context.beginPath()
            poly(0, 0, r, 6)
            context.closePath()
            context.fill()
            context.restore()

            context.save()
            context.translate(width / 2, height / 2)
            context.rotate(TAU / 3)
            context.translate(tile[0], tile[1])
            context.fillStyle = 'hsla(240, 40%, 50%, 1)'
            context.translate(...v)
            context.rotate(TAU / 4)
            context.beginPath()
            poly(0, 0, 6 + (rand() * 16), 6)
            context.closePath()
            context.fill()
            context.restore()
        })
    }
}

canvasSketch(sketch, settings)
