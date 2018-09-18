let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 3,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)

    let starts = []
    for (let i = 0; i < 50; ++i) {
        starts.push([rand(), Math.floor(rand() * 6), 2 + Math.floor(rand() * 4)])
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, width, height)

        for (let i = 0; i < starts.length; ++i) {
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
            ctx.beginPath()
            let t = Math.sin(playhead * PI * starts[i][1])
            ctx.arc(
                starts[i][0] * width,
                -16 + t * (height + 16 + 16),
                starts[i][2],
                0,
                TAU)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
        }

        ctx.save()
        for (let i = 0; i < Math.floor(rand() * 10); ++i) {
            ctx.strokeStyle = 'hsla(0, 0%, 100%, 1)'
            ctx.beginPath()
            let y = rand() * height
            ctx.moveTo(0, y)
            ctx.lineTo(width, y)
            ctx.stroke()
        }
        ctx.restore()

        let show_circle = rand() > 0.85 ? true : false
        if (show_circle) {
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
            ctx.strokeStyle = 'hsla(0, 0%, 100%, 1)'
            ctx.beginPath()
            ctx.arc(rand() * width, rand() * height, 16 + rand() * 128, 0, TAU)
            ctx.closePath()
            rand() > 0.5 ? ctx.fill() : ctx.stroke()
            ctx.restore()
        }

        ctx.save()
        let style_options =
            [``, ``, ``, ``, ``, `Italic`, `Italic`, `Italic`]
        let size = height * 0.15
        let style = style_options[Math.floor(rand() * style_options.length)]
        ctx.font = `${size}px InputMonoCondensed-Black${style}`
        ctx.textAlign = 'center'
        ctx.translate(width / 2, height / 2)

        let l = rand() < playhead ? 0 : 1
        ctx.fillStyle = `hsla(0, 0%, ${(l * 100)}%, 1)`
        ctx.fillRect(-250, -(size / 2) - 30, 500, size + 30)
        let o = rand() < playhead ? 0 : 1
        ctx.fillStyle = `hsla(0, 0%, 0%, ${o})`
        ctx.fillText('ERROR', 0, size / 4)
        ctx.restore()
    }
}

canvasSketch(sketch, settings)
