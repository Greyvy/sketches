let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    dimensions: [ 1024, 1024 ]
}





let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random() * 10000)
    let rand = seed(seed_value)

    let points = Array(10000)
        .fill([])
        .map((v, i, a) => {
            let x = i / a.length
            let y = Math.cos(i * (PI / a.length))

            return [x, y]
        })
        .map((v) => {
            let bx = v[0] + (Math.sin(rand() * TAU) * 0.25)
            let by = v[1] + (Math.sin(rand() * TAU) * 0.25)
            return [bx, by]
        })

    let mb = vec.matrixBuilder()
    let sm = mb.scale(width, height * 0.25).get()

    return ({ context, width, height }) => {
        context.fillStyle = 'white'
        context.fillRect(0, 0, width, height)

        // context.save()
        // context.globalCompositeOperation = 'multiply'
        // context.lineWidth = 0.25
        // context.strokeStyle = 'hsla(0, 0%, 30%, 1)'
        // context.translate(0, height / 2)

        // points.forEach((p) => {

        //     let v = vec.transform(p, sm)
        //     let n0 = vec.normal(v)
        //     let n1 = vec.scale(n0, 4)

        //     context.beginPath()
        //     context.moveTo(...v)
        //     context.lineTo(...n0)
        //     context.closePath()
        //     context.stroke()
        // })
        // context.restore()



        context.save()
        context.globalCompositeOperation = 'multiply'
        context.lineWidth = 0.25
        context.strokeStyle = 'hsla(0, 0%, 50%, 1)'

        let sm = mb
            .scale(width, height / 2)
            .translate(0, height / 2)
            .get()

        points
            .map(p => vec.transform(p, sm))
            .forEach((v) => {

            context.save()
            context.translate(...v)

            let n0 = vec.rotate(vec.norm(v), PI/2)
            let n1 = vec.scale(n0, width * 0.5)

            context.beginPath()
            context.moveTo(...n0)
            context.lineTo(...n1)
            context.closePath()
            context.stroke()

            context.restore()
        })
        context.restore()


        let spot = points[Math.floor((0.3 + (rand() * 0.4)) * points.length)]

        context.save()
        let v = vec.transform(spot, sm)
        context.globalCompositeOperation = 'multiply'
        context.fillStyle = 'hsla(240, 60%, 60%, 1)'
        context.strokeStyle = 'hsla(240, 60%, 60%, 1)'

        context.beginPath()
        context.arc(...v, width * 0.15, 0, TAU)
        context.closePath()
        context.fill()

        context.beginPath()
        context.arc(...v, width * 0.25, 0, TAU)
        context.closePath()
        context.stroke()

        context.restore()

    }
}

canvasSketch(sketch, settings)
