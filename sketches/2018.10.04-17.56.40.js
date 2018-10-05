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

        let n = 8
        for (let i = 0; i <= n; ++i) {
            let margin = 512
            let t = Math.sin(playhead * TAU)
            let tt = Math.sin(Math.pow(playhead, (i / n) + 2) * TAU)
            let x = margin / 2 + (i / n * (width - margin))
            let y = height / 2 + tt * (-height / 2 + (margin / 2))
            ctx.save()
            ctx.fillStyle = `hsla(0, 0%, ${25 + (tt * 75)}%, 1)`
            ctx.beginPath()
            ctx.arc(x, y, width * 0.0125, 0, TAU)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
        }


        /*
        let fontsize = 24
        ctx.save()
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.font = `${fontsize}px sans-serif`
        ctx.fillText(playhead * 2 % 1, 16, fontsize)
        ctx.restore()
        */
    }
}

canvasSketch(sketch, settings)
