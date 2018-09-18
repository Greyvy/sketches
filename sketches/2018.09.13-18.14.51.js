let canvasSketch = require('canvas-sketch')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        /*
        let r = Math.sin(playhead * PI) * TAU
        let y = Math.max(Math.abs(Math.sin(playhead * PI * 4)), 0.25) * 250
        ctx.save()
        ctx.translate(width / 2, height / 2)
        ctx.rotate(r)
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.fillRect(0, y, 16, 16)
        ctx.restore()
        */



        let n = 4
        ctx.save()
        ctx.translate(width / 2, height / 2)
        for (let i = 0; i < n; ++i) {
            ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
            let d = i / n
            let s = 1
            let t = Math.min(Math.sin((playhead * 0.5) * PI), s) / s
            let x = Math.cos((t + d) * TAU) * width / 4
            let y = Math.sin((t + d) * TAU) * width / 4

            ctx.beginPath()
            ctx.arc(x, y, t * width * 0.125, 0, TAU)
            ctx.closePath()
            ctx.fill()

            for (let j = 0; j < n; ++j) {
                let x = Math.cos((Math.pow(t, 1 - j / n) + d) * TAU) * width / 4
                let y = Math.sin((Math.pow(t, 1 - j / n) + d) * TAU) * width / 4
                ctx.fillStyle = `hsla(0, 0%, ${50 - (j / n * 50)}%, 1)`
                ctx.beginPath()
                ctx.arc(x, y, Math.pow(t, 1 - j / n) * width * 0.125, 0, TAU)
                ctx.closePath()
                ctx.fill()
            }
        }
        ctx.restore()
    }
}

canvasSketch(sketch, settings)
