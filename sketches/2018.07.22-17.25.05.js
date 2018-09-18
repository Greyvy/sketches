let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)

    let scribble = (end, n) => {
        let result = Array(n)
            .fill([])
            .map((v, i, a) => {
                let overshoot = rand() * 0.02
                let t = i / a.length
                let y = i % 2 === 0 ? vec.scale(end, t)[1] - overshoot : 0 + overshoot
                return [t, y]
            })
        return result
    }

    let scribble_draw = (ctx, data) => {
        ctx.save()
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(...data[0])
        data.forEach(v => {
            ctx.lineTo(...v)
        })
        ctx.stroke()
        ctx.restore()
    }

    let triangle_draw = (ctx, data) => {
        ctx.beginPath()
        ctx.moveTo(...data[0])
        ctx.lineTo(...data[1])
        ctx.lineTo(...data[2])
        ctx.closePath()
        ctx.stroke()
    }

    let tri_draw = triangle_draw.bind(this, context)
    let scr_draw = scribble_draw.bind(this, context)

    let stem = 0.15 + (rand() * 0.15)
    let tip = -0.15 - (rand() * 0.20)
    let shape0 = [ [0, 0], [stem, 0], [stem, tip] ]

    let tri0 = shape0
        .map(v => {
            return [
                v[0] * width,
                v[1] * height
            ]
        })

    let tri1 = shape0
        .map(v => {
            return [
                ((v[0] * -1) + stem * 3) * (width / 2),
                v[1] * height
            ]
        })

    let scr0 = scribble(shape0[2], 16 + Math.floor((rand() * 10)))
        .map(v => {
            return [
                v[0] * (width * stem),
                v[1] * height
            ]
        })

    let triangles = Array(4)
        .fill([])
        .map(v => {
            let stem = 0.15 + (rand() * 0.05)
            let tip = -0.10 - (rand() * 0.10)
            let shape0 = [ [0, 0], [stem, 0], [stem, tip] ]
            let tr0 = shape0.map(v => [v[0] * width, v[1] * height])
            let tr1 = shape0.map(v => [ ((v[0] * -1) + stem * 3) * (width / 2), v[1] * height])
            let sc0 = scribble(shape0[2], 16 + Math.floor((rand() * 10))).map(v => [v[0] * (width * stem), v[1] * height])

            let p0 = tr0[0]
            let p1 = tr0[2]
            let p2 = tr1[0]

            return { shape: [p0, p1, p2], scribble: sc0 }

        })

    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        /*
        ctx.save()
        ctx.translate(width / 2, height / 2)
        ctx.rotate(Math.PI * rand())
        ctx.translate(-tri1[0][0] / 2, -(tri0[2][1] / 2))

        ctx.strokeStyle = 'rgba(255, 48, 190, 1)'
        tri_draw([tri0[0], tri0[2], tri1[0]])

        ctx.strokeStyle = 'rgba(255, 48, 190, 1)'
        scr_draw(scr0)

        ctx.restore()
        */


        let positions = [
            [width * 0.25 , height * 0.25],
            [width * 0.75, height * 0.25],
            [width * 0.25, height * 0.75],
            [width * 0.75, height * 0.75]
        ]

        let colors = [
            'rgba(255, 48, 190, 1)',
            'rgba(48, 224, 255, 1)',
            'rgba(70, 255, 67, 1)',
            'rgba(255, 48, 190, 1)',
            'rgba(48, 224, 255, 1)',
            'rgba(70, 255, 67, 1)',
            'rgba(0, 0, 0, 1)'
        ]

        triangles.forEach((v, i) => {
            ctx.save()
            ctx.translate(...positions[i])
            ctx.rotate(Math.PI * rand())
            ctx.translate(-v.shape[2][0] / 2, -(v.shape[2][1] / 2))

            let c = colors[Math.floor((rand() * colors.length))]
            ctx.strokeStyle = c
            tri_draw(v.shape)

            ctx.strokeStyle = c
            scr_draw(v.scribble)

            ctx.restore()
        })


        /*
         * @NOTE(Grey): Debug drawing
        tri_draw(tri0)
        tri_draw(tri1)
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.fillRect(...tri0[0], 10, 10)
        ctx.fillRect(...tri0[2], 10, 10)
        ctx.fillRect(...tri1[0], 10, 10)

        ctx.save()
        ctx.font = '24px sans-serif'
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.fillText(tri1[0][0], 10, 24)
        ctx.restore()
        */

    }
}

canvasSketch(sketch, settings)
