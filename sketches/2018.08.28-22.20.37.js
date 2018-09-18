let canvasSketch = require('canvas-sketch')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 2048, 2048 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2

    return ({ context: ctx, width, height, playhead }) => {

        let circle = (x, y, r) => {
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.closePath()
        }

        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, width, height)


        let points = []
        for (let i = 0; i <= 7; ++i) {
            points.push([i / 7 * width, height / 2, 0, 0])
        }

        let t = Math.sin(playhead * TAU)
        let force = [0, -800 * t]
        let index = 3

        /*
        for (let i = -dist; i <= dist ++i) {
            points[index + i][0] += force[0]
            points[index + i][1] += force[1]
        }
        */

        points[index - 3][0] += force[0] * 0.125
        points[index - 2][0] += force[0] * 0.25
        points[index - 1][0] += force[0] * 0.65
        points[index + 0][0] += force[0] * 1.0
        points[index + 1][0] += force[0] * 0.65
        points[index + 2][0] += force[0] * 0.25
        points[index + 3][0] += force[0] * 0.125

        points[index - 3][1] += force[1] * 0.125
        points[index - 2][1] += force[1] * 0.25
        points[index - 1][1] += force[1] * 0.65
        points[index + 0][1] += force[1] * 1.0
        points[index + 1][1] += force[1] * 0.65
        points[index + 2][1] += force[1] * 0.25
        points[index + 3][1] += force[1] * 0.125


        for (let i = 0; i < points.length; ++i) {
            let l = 80 + Math.sin((i / (index * 2)) * PI) * 100
            let r = 16 - Math.sin(i / (index * 2) * PI) * 10
            ctx.fillStyle = `hsla(0, 0%, ${l}%, 1)`
            circle(points[i][0], points[i][1], r)
            ctx.fill()
        }
    }
}

canvasSketch(sketch, settings)
