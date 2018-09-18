let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animation: true,
    duration: 6,
    dimensions: [ 1024, 2048 ]
}

const PI = Math.PI
const TAU = PI * 2

let mb = vec.matrixBuilder()
let simplex = new SimplexNoise()
let seed_value = Math.floor(Math.random() * 1000)
let rand = seed(seed_value)

let hills = Array(6)
    .fill([])
    .map((v, d) => {
        let slope = 12 + rand() * 8
        let dir = d % 2 === 0 ? slope : -slope
        return Array(300)
            .fill([])
            .map((v, i, a) => {
                let x = i / a.length
                let y = simplex.noise2D(0, d + i * 0.004) + (x * dir)
                return [x, y]
            })
    })


let draw_hill = (ctx, x, y, width, height, points) => {
    let hm = mb.scale(width, height).translate(x, y).get()
    let pointz = points.map(v => vec.transform(v, hm))

    ctx.beginPath()
    ctx.moveTo(...pointz[0])
    for (let i = 0; i < pointz.length; ++i) {
        ctx.lineTo(...pointz[i])
    }
}


let sketch = (props) => {

    let { context, width, height, playhead } = props
    let hill = draw_hill.bind(this, context)

    return ({ context, width, height, playhead }) => {
        let t = Math.sin(playhead * PI)

        // context.fillStyle = 'hsla(60, 80%, 95%, 1)'
        context.fillStyle = `hsla(260, 80%, ${80 + (t * 10)}%, 1)`
        context.fillRect(0, 0, width, height)


        context.save()
        context.globalCompositeOperation = 'multiply'

        hills.forEach((hi, i, a) => {
            let t = i / a.length

            let h = 260 + (100 * t)
            let s = 90
            let l = 90
            context.fillStyle = `hsla(${h}, ${s}%, ${l}%, 1)`

            let y = (height / 8) + i * (height / 6)
            hill(0, y, width + 8, height / 64, hi)

            // @NOTE(Grey): Close out the shape so I can fill it
            context.lineTo(width + 8, height)
            context.lineTo(0, height)
            context.closePath()
            context.fill()
        })

        context.restore()


        context.save()
        context.translate(width / 2, height * 0.75)
        context.lineWidth = 6
        context.strokeStyle = 'hsla(0, 0%, 100%, 1)'
        context.beginPath()
        let r = width * 0.015 + (t * (width * 0.01))
        context.arc(0, 0, r, 0, TAU)
        context.closePath()
        context.stroke()
        context.restore()


        Array.from(['C','A','L','M']).forEach((v, i) => {
            context.save()
            context.fillStyle = 'hsla(0, 0%, 100%, 1)'
            context.font = `${width * 0.15}px UniversLTStd-ThinUltraCn`
            context.textAlign = 'center'
            context.translate(width / 2, (height * 0.4) + (i * 160))
            context.fillText(v, 0, 0)
            context.restore()
        })

    }
}

canvasSketch(sketch, settings)
