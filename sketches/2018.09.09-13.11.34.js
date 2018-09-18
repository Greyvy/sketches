let canvasSketch = require('canvas-sketch')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 8,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2

    let trail = (base, dist) => {
        return vec.scale(base.pos, Math.pow(dist, 2))
    }

    let move = (base, t) => {
        return base * t
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, width, height)

        /*
        let t1 = Math.sin(playhead * PI)
        let t2 = Math.sin((playhead * 2 % 2) * PI)
        let t3 = Math.sin((playhead * 3 % 3) * PI)
        let t4 = Math.sin((playhead * 4 % 4) * PI)
        */

        ctx.translate(width / 2, height / 2)
        ctx.rotate(playhead * PI)
        ctx.strokeStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.lineWidth = 16

        let n = 12
        for (let i = 0; i < n; ++i) {
            let t = Math.sin((playhead * i % i) * PI)
            let pos = [move(width * 0.25, t), move(height * 0.15, t)]
            ctx.fillStyle = `hsla(0, 0%, ${40 + (60 * (t + 1 / 2))}%, 1)`
            ctx.beginPath()
            ctx.arc(...pos, 8 + Math.sin((i / n) * PI) * 60, 0, TAU)
            ctx.closePath()
            ctx.stroke()
            ctx.fill()
        }

    }
}

canvasSketch(sketch, settings)
