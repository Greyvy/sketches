let canvasSketch = require('canvas-sketch')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    const PI = Math.PI
    const TAU = PI * 2

    let data = []
    for (let i = 0; i < 4; ++i) {
        let x = Math.cos(i / 4 * (Math.PI * 2)) * 240
        let y = Math.sin(i / 4 * (Math.PI * 2)) * 240
        let cx = Math.cos(TAU * 0.25 - (i / 4) * TAU) * -140
        let cy = Math.sin(TAU * 0.25 - (i / 4) * TAU) * -140
        data.push([cx, cy, x, y])
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        let t = Math.sin(playhead * TAU)
        let points = data.map((v, i, a) => {
            let c = [
                v[0] + (Math.cos(t * TAU) * (80 + (80 * i / a.length))),
                v[1] + (Math.sin(t * TAU) * (80 + (80 * i / a.length)))
            ]
            let p = [v[2], v[3]]
            return [...c, ...p]
        })

        ctx.translate(width / 2, height / 2)
        ctx.strokeStyle = 'hsla(0, 0%, 20%, 1)'
        ctx.lineWidth = 8
        ctx.lineJoin = "round"
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.beginPath()
        ctx.moveTo(
            points[points.length - 1][2],
            points[points.length - 1][3]
        )
        for (let i = 0; i < points.length; ++i) {
            ctx.quadraticCurveTo(...points[i])
        }
        ctx.closePath()
        ctx.stroke()
        // ctx.fill()


        /*
        // @NOTE(Grey): Debug
        for (let i = 0; i < points.length; ++i) {
            let t = i / points.length
            ctx.fillStyle = `hsla(${t * 360}, 50%, 50%, 1)`
            ctx.beginPath()
            ctx.arc(points[i][0], points[i][1], 5, 0, TAU)
            ctx.closePath()
            ctx.fill()
        }

        ctx.beginPath()
        for (let i = 0; i < points.length; ++i) {
            let t = i / points.length
            ctx.strokeStyle = `hsla(${t * 360}, 50%, 50%, 1)`
            ctx.lineTo(points[i][2], points[i][3])
        }
        ctx.closePath()
        ctx.stroke()
        */


    }
}

canvasSketch(sketch, settings)
