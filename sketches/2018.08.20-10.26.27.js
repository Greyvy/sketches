let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    let simplex = new SimplexNoise(42)

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'hsla(220, 50%, 90%, 1)'
        ctx.fillRect(0, 0, width, height)

        let t = Math.sin(playhead * Math.PI)
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = `hsla(220, 50%, ${75 + (10 * t)}%, 1)`
        let n = 200
        for (let j = 0; j < 20; j++) {
            ctx.beginPath()
            ctx.moveTo(-20, height / 4 + (j * 20))
            for (let i = 0; i < n; i++) {
                let u = j / 20
                let t = i / n
                let res = t * 2
                let h = (simplex.noise3D(res, res, j) + 1) / 2 * -(u * 200)
                ctx.lineTo(t * width + (width / n), height / 4 + (j * 20) + h)
                // ctx.fillRect(t * width, height / 2, width / n * 2, h)
            }
            ctx.lineTo(width, height)
            ctx.lineTo(0, height)
            ctx.closePath()
            // ctx.stroke()
            ctx.fill()
        }

        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
        let border_width = width * 0.05
        ctx.fillRect(0, 0, border_width, height)
        ctx.fillRect(0, 0, width, border_width)
        ctx.fillRect(width - border_width, 0, border_width, height)
        ctx.fillRect(0, height - border_width, width, border_width)

    }
}

canvasSketch(sketch, settings)

