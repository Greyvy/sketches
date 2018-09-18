let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = 42
    let rand = seed(seed_value)

    let offsets = []
    for (let i = 0; i <= 80; ++i) {
        offsets.push(rand() * 0.125)
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, width, height)

        let t = Math.sin(playhead * TAU)

        ctx.save()
        ctx.translate(width / 2, height / 2)
        // ctx.scale(1, 0.65 + (0.5 * t))
        ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
        let n = 80
        for (let i = 0; i <= n; ++i) {
            let r = i / n
            let t = (Math.sin(((r + offsets[i]) * PI / 2) + (playhead * TAU)) + 1) / 2

            let x = (r * (width * 0.75)) - (width * 0.75) / 2

            let point = i % 2 === 0
                ? [x, (height - (height / 4)) / 2 * t]
                : [x, -(height - (height / 4)) / 2 * t]
            ctx.beginPath()
            ctx.arc(...point, 2.5, 0, TAU)
            ctx.closePath()
            ctx.fill()
        }
        ctx.restore()

        /*
        ctx.save()
        ctx.translate(width / 2, height / 2)
        ctx.rotate(t * TAU / 8)
        ctx.strokeStyle = 'hsla(0, 0%, 100%, 1)'
        ctx.beginPath()
        let sides = 6// + (Math.floor(rand() * 3))

        for (let i = 0; i < sides; ++i) {
            let x = Math.cos(i / sides * TAU) * (90 + (t * 45))
            let y = Math.sin(i / sides * TAU) * (90 + (t * 45))
            ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
        ctx.restore()
        */


    }
}

canvasSketch(sketch, settings)
