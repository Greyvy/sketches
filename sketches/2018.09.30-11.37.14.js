let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 8,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random() * 10000)
    let rand = seed(seed_value)

    let drops = [
        Array(34)
            .fill(0)
            .map((v, i, a) => {
                return {
                    pos: [rand() * width, rand() * height],
                    size: width * rand(),
                    speed: 1 + Math.floor(rand() * 4),
                }
            }),
        Array(34)
            .fill(0)
            .map((v, i, a) => {
                return {
                    pos: [rand() * width, rand() * height],
                    size: width * rand(),
                    speed: 1 + Math.floor(rand() * 4),
                }
            })
    ]


    let colors = {
        fg: `hsla(0, 0%, 100%`,
        bg: `hsla(0, 0%, 0%`
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = `${colors.bg}, 1)`
        ctx.fillRect(0, 0, width, height)


        /*
        let n = 4
        for (let i = 0; i <= n; ++i) {
            let t = Math.sin((playhead % (i / n) / (i / n)) * PI)
            let x = width / 2
            let y = height / 2 + (height * 0.25 * t)
            ctx.save()
            ctx.fillStyle = `hsla(${i / n * 360}, 50%, 50%, 1)`
            ctx.fillRect(x-8, y-8, 16, 16)
            ctx.restore()
        }
        */


        let to_draw = drops[Math.floor(playhead * drops.length)]

        for (let i = 0; i < to_draw.length; ++i) {
            let d = to_draw[i]
            let t = Math.sin((playhead % (1 / drops.length)) * PI / 2)
            let size = 1 + d.size * Math.pow(t, d.speed)

            ctx.save()
            ctx.lineWidth = 2
            ctx.strokeStyle = `${colors.fg}, ${0.65 - t})`
            ctx.beginPath()
            ctx.arc(...d.pos, size, 0, TAU)
            ctx.closePath()
            ctx.stroke()
            ctx.fill()
            ctx.restore()
        }

    }
}

canvasSketch(sketch, settings)

