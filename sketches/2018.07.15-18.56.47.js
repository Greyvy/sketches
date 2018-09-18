let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random() * 1000) // 254, 901 is problematic
    let rand = seed(seed_value)

    let star = (ir, or, n) => {
        let result = Array(n)
            .fill([])
            .map((v, i, a) => {
                let t = i / a.length
                let x = Math.cos(t * TAU)
                let y = Math.sin(t * TAU)
                return [[x * ir, y * ir], [x * or, y * or]]
            })

        return result
    }

    let poly = (r, n) => {
        let result = Array(n)
            .fill([])
            .map((v, i, a) => {
                let t = i / a.length
                let x = Math.cos(t * TAU)
                let y = Math.sin(t * TAU)
                return [[0, 0], [x * r, y * r]]
            })
        return result
    }

    let draw_push = (ctx, x, y, options) => {
        ctx.save()
        ctx.translate(x, y)
        let defaults = Object.assign(
            {
                stroke: [1, 'hsla(0, 0%, 100%, 0)'],
                fill: 'hsla(0, 0%, 100%, 0)',
                blend: 'source-over'
            },
            options || {}
        )
        ctx.globalCompositeOperation = defaults.blend
        ctx.lineWidth = defaults.stroke[0]
        ctx.strokeStyle = defaults.stroke[1]
        ctx.fillStyle = defaults.fill
    }

    let draw_pop = (ctx) => {
        ctx.restore()
    }

    let draw_shape = (ctx, geo) => {
        ctx.beginPath()
        ctx.moveTo(...geo[0][1])
        geo.forEach((v, i) => {
            ctx.lineTo(...v[1])
        })
        ctx.closePath()
        ctx.stroke()
        ctx.fill()
    }

    let draw_outline = (ctx, geo) => {
        geo.forEach((v) => {
            context.beginPath()
            ctx.moveTo(...v[0])
            ctx.lineTo(...v[1])
            ctx.stroke()
            ctx.fill()
        })
    }


    let push = draw_push.bind(this, context, width / 2, height / 2)
    let pop = draw_pop.bind(this, context, width / 2, height / 2)


    let shapes = Array(3)
        .fill([])
        .map((v) => {
            let n = 4 + Math.floor(rand() * 12)
            let r0 = (width * 0.125) + rand() * (width * 0.125)
            let r1 = (width * 0.25) + rand() * (width * 0.25)
            let s = rand() > 0.5 ? star(r0, r1, n) : poly(r1, n)
            return s
        })

    let colors = {
        black : 'hsla(0, 0%, 10%, 1)',
        blue  : 'hsla(200, 100%, 60%, 1)',
        green : 'hsla(120, 100%, 60%, 1)',
        yellow: 'hsla(70, 100%, 60%, 1)'
    }

    let styles = [
        {
            stroke: [Math.floor(width * 0.005), colors.black],
            blend: 'multiply'
        },
        {
            stroke: [Math.floor(width * 0.0125), colors.yellow],
            fill: colors.yellow, blend: 'multiply'
        },
        {
            stroke: [Math.floor(width * 0.025), colors.blue],
            fill: colors.blue, blend: 'multiply'
        },
        {
            stroke: [Math.floor(width * 0.0025), colors.green],
            fill: colors.green, blend: 'multiply'
        },
        {
            stroke: [Math.floor(width * 0.125), colors.blue],
            blend: 'multiply'
        }
    ]


    push({fill: 'hsla(60, 10%, 90%, 1)'})
    context.fillRect(-width / 2, -height / 2, width, height)
    pop()

    shapes.forEach((shape, i, a) => {
        let toss = rand()
        let style = styles[Math.floor(toss * styles.length)]
        push(style)
        context.rotate(rand() * TAU)
        toss > 0.5 ? draw_outline(context, shape) : draw_shape(context, shape)
        pop()
    })


    return (props) => [{ data: props.canvas, prefix: `${seed_value}` }]

}

canvasSketch(sketch, settings)
