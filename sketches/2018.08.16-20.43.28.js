let canvasSketch = require('canvas-sketch')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2


    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        ctx.translate(width / 2, height / 2)
        ctx.fillStyle = 'hsla(0, 90%, 50%, 1)'
        ctx.font = '48px Didot-Bold'
        ctx.textAlign = 'center'
        let samples = (width + 16) / 32
        for (let i = -samples/2; i < samples/2; ++i) {
            let t = Math.sin(playhead * TAU)
            let x = (i / samples * width)
            let y = Math.sin((i / samples * t * TAU)) * height / 4

            ctx.fillText('666 ', x, y)
        }



        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.font = '84px Didot-Bold'
        ctx.fillText('SIN WAVE', 0, 0)

        ctx.fillStyle = 'hsla(0, 0%, 80%, 1)'
        ctx.font = '24px Didot-Bold'
        ctx.fillText(playhead.toFixed(3), 0, height / 2 - 12)

    }
}

canvasSketch(sketch, settings)
