let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animation: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let PI = Math.PI
let TAU = PI * 2


// let random = (min, max) => Math.random() * (max - min) + min

let seed_value = Math.floor(Math.random() * 10000)
let val = seed(seed_value)

let pol_to_cart = (p) =>
    [Math.cos(p[1]) * p[0], Math.sin(p[1]) * p[0]]

let cart_to_pol = (p) =>
    [Math.atan2(p[1], p[0]), Math.sqrt(p[0] * p[0] + p[1] * p[1])]


let sketch = ({ context, width, height }) => {

    let wobble = (m, n, rad, p, i, a) => {
        let t = i * (TAU / a.length)
        // let r
        // if (val() > 0.5) {
        //     r = (width * 0.045) + Math.sin(t) * rad
        // } else if (val() > 0.5) {
        //     r = i % 2 ? 30 : 90
        // } else {
        //     r = (width * 0.045) + (Math.sin(i * ((TAU * n)/ a.length)) * rad)
        // }

        let r = m + (Math.sin(i * ((TAU * n)/ a.length)) * rad)
        return [r, t]
    }

    let shapes = Array(5).fill([])
        .map(v => {
            let num = 1 + Math.floor(val() * 5)
            return Array(num).fill([])
                .map(a => {
                    let min_r = num === 1 ? (width * 0.1) : (width * 0.045)
                    return Array(4 + Math.floor(val() * 8)).fill([])
                        .map(wobble.bind(this, min_r, Math.floor(1 + val() * 12), val() * 5))
                })
        })

    let draw_wobble = (ctx, p, i) => {
        if (i === 0) { ctx.moveTo(...p) }
        ctx.lineTo(...p)
    }

    let layout = (width, height, n) => {
        if (n === 1) {
            return [
                [width / 2, height / 2]
            ]
        }

        if (n === 2) {
            return [
                [width * 0.25, height / 2],
                [width * 0.75, height / 2]
            ]
        }

        if (n === 3) {
            return [
                [width * 0.25, height * 0.25],
                [width * 0.5, height * 0.5],
                [width * 0.75, height * 0.75]
            ]
        }

        if (n === 4) {
            return [
                [width * 0.25, height * 0.25],
                [width * 0.75, height * 0.25],
                [width * 0.25, height * 0.75],
                [width * 0.75, height * 0.75]
            ]
        }

        if (n === 5) {
            return [
                [width * 0.25, height * 0.25],
                [width * 0.75, height * 0.25],
                [width * 0.5, height * 0.5],
                [width * 0.25, height * 0.75],
                [width * 0.75, height * 0.75]
            ]
        }
    }

    return ({ context, width, height, playhead }) => {
        let ctx = context

        ctx.fillStyle = 'hsla(240, 0%, 100%, 1)'
        ctx.fillRect(0, 0, width, height)

        ctx.globalCompositeOperation = 'multiply'

        let page = layout(width, height, shapes.length)
        let ctx_draw_wobble = draw_wobble.bind(this, ctx)

        // @NOTE(Grey): debug text
        ctx.fillStyle = 'hsla(0, 0%, 70%, 1)'
        ctx.font = '16px sans-serif'
        // ctx.fillText(vel, 10, 20)
        // ctx.fillText(rad, 10, 30)
        // ctx.fillText(page[0], 10, 20)
        // ctx.fillText(page[1], 10, 40)
        // ctx.fillText(val(), 10, 60)
        ctx.fillText(`${seed_value}`, 10, 20)

        shapes.forEach((square, i) => {
            let l = layout(width / 2, height / 2, square.length)
            ctx.save()
            ctx.translate(page[i][0] - width / 4, page[i][1] - height / 4)
            square.forEach((points, i) => {
                ctx.save()
                ctx.translate(...l[i])
                ctx.beginPath()
                ctx.fillStyle = `hsla(${170 + (10 * i)}, 100%, 50%, 1)`
                points
                    .map(pol_to_cart)
                    .forEach(ctx_draw_wobble)
                ctx.closePath()
                ctx.fill()

                ctx.restore()
            })

            ctx.save()
            ctx.strokeStyle = 'hsla(0, 0%, 80%, 1)'
            ctx.beginPath()
            l.forEach(ctx_draw_wobble)
            ctx.closePath()
            ctx.stroke()
            ctx.restore()
            ctx.restore()
        })


        let margins = 20
        ctx.save()
        ctx.strokeStyle = 'hsla(0, 0%, 70%, 1)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(width / 2, 20)
        ctx.lineTo(width / 2, height - 20)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(20, height / 2)
        ctx.lineTo(width - 20, height / 2)
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.translate(width / 2, height / 2)
        ctx.rotate(TAU * 0.15)
        ctx.scale(4, 4)
        ctx.strokeStyle = 'hsla(0, 0%, 70%, 1)'
        ctx.lineWidth = 0.15
        ctx.beginPath()
        // shapes[0][0].map(pol_to_cart).forEach(ctx_draw_wobble)
        ctx.closePath()
        ctx.stroke()
        ctx.restore()

    }
}

canvasSketch(sketch, settings)
