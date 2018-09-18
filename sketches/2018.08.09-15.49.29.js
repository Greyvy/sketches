let canvasSketch = require('canvas-sketch')
let noise = require('simplex-noise')

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    let PI = Math.PI
    let TAU = PI * 2

    let cos = (v) => Math.cos(v)
    let sin = (v) => Math.sin(v)

    let simplex = new noise()
    let lerp = (v0, v1, t) => (1 - t) * v0 + t * v1
    let rad = (p) => {
        let n = simplex.noise2D(...p)
        let r = (width * 0.25) + (width * 0.15 * n)
        return [p[0] * r, p[1] * r]
    }



    let origin = Array(400)
        .fill([])
        .map((v, i, a) => {
            let t = i / a.length
            let p = [
                cos(t * TAU) * (width * 0.25),
                sin(t * TAU) * (width * 0.25)
            ]
            return p
        })

    let points = Array(400)
        .fill([])
        .map((v, i, a) => {
            let t = i / a.length
            let p = [cos(t * TAU), sin(t * TAU)]
            let r = rad(p)
            return r
        })

    let circles = Array(20)
        .fill(points)
        .map((v, i, a) => {
            let t = i / a.length
            let r = v.map((p, i) => {
                let result = [
                    lerp(origin[i][0], p[0], t),
                    lerp(origin[i][1], p[1], t)
                ]
                return result
            })
            return r
        })



    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        ctx.translate(width / 2, height / 2)

        ctx.strokeStyle = 'hsla(0, 0%, 60%, 1)'
        ctx.beginPath()
        ctx.arc(0, 0, width * 0.25, 0, TAU)
        ctx.stroke()
        ctx.closePath()

        ctx.strokeStyle = 'hsla(0, 0%, 0%, 1)'

        circles.forEach(v => {
            ctx.beginPath()
            v.forEach((p, i) => {
                i === 0 ? ctx.moveTo(...p) : ctx.lineTo(...p)
            })
            ctx.closePath()
            ctx.stroke()
        })

    }
}

canvasSketch(sketch, settings)
