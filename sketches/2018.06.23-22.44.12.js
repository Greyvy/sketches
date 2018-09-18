let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 3,
    dimensions: [ 1024, 1024 ]
}

let PI = Math.PI
let TAU = PI * 2

let sketch = ({ context, width, height }) => {

    let seed_value = Math.floor(Math.random() * 10000)
    let rand = seed(seed_value)

    let lerp = (v0, v1, t) => (1 - t) * v0 + t * v1
    let p = vec.scale([width, height], 0.5)

    let pol_to_cart = p =>
        [Math.cos(p[1]) * p[0], Math.sin(p[1]) * p[0]]

    let count = 2000
    let wave = Array.from(new Array(count))
        .map((v, i, a) => {
            let rad = 256
            let num = Math.floor(rad * 0.05)
            let amp = rad / 12

            let t = (i / a.length) * TAU
            let r = (Math.sin(t * num) * amp) + (rad - amp)
            return [r, t]
        })

    let rads = Array.from(new Array(count))
        .map(v => rand() * 450)

    let draw_circle = (ctx, p, r) => {
        ctx.beginPath()
        ctx.arc(...p, r, 0, TAU, false)
        ctx.closePath()
    }

    let draw_shape = (ctx, points, cb) => {
        ctx.beginPath()
        points.forEach(cb)
        ctx.closePath()
    }

    let draw_segment = (ctx, p, i) => {
        if (i === 0) { ctx.moveTo(...p) }
        ctx.lineTo(...p)
    }

    let circle = draw_circle.bind(this, context)
    let segment = draw_segment.bind(this, context)
    let shape = draw_shape.bind(this, context)

    return ({ context, width, height, playhead }) => {
        let ctx = context
        let t = (Math.sin(playhead * TAU) + 1) / 2

        ctx.fillStyle = 'hsla(0, 0%, 20%, 1)'
        ctx.fillRect(0, 0, width, height)

        ctx.translate(...p)
        wave
            .map((p, i) => [p[0] + lerp(rads[i], p[0], 0), p[1]])
            .map(pol_to_cart)
            .forEach((p) => {
                ctx.save()
                ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
                circle(p, 2)
                ctx.fill()
                ctx.restore()
            })

        ctx.save()
        ctx.strokeStyle = 'hsla(0, 0%, 100%, 1)'
        ctx.beginPath()
        wave
            .map((p, i) => [lerp(rads[i], p[0], 0), p[1]])
            .map(pol_to_cart)
            .forEach(segment)
        ctx.closePath()
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.strokeStyle = 'hsla(0, 0%, 60%, 0.5)'

        circle([0, 0], 256)
        ctx.stroke()

        circle([0, 0], 256 - 48)
        ctx.stroke()

        ctx.restore()

        ctx.save()
        ctx.fillStyle = 'hsla(0, 0%, 25%, 0.5)'
        ctx.textAlign = 'center'
        ctx.font = '64px TradeGothicLTStd-BdCn20'
        ctx.fillText(seed_value, 0, 28)
        ctx.restore()

    }
}

canvasSketch(sketch, settings)
