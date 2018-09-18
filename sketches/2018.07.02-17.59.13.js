let canvasSketch = require('canvas-sketch')
let vec = require('vec-la')
let seed = require('seed-random')


// @NOTE(Grey): This is made using the tutorial:
// https://medium.com/@bit101/flow-fields-part-i-3ebebc688fd8

let PI = Math.PI
let TAU = PI * 2

let seed_value = 4364 // Math.floor(Math.random() * 10000)
let rand = seed(seed_value)

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    /*
    // @NOTE(Grey): old render function

    let render = function(ctx, p) {
        context.save()
        context.strokeStyle = 'hsla(0, 0%, 0%, 1)'
        context.translate(p[0], p[1])

        context.rotate(p[2])
        context.beginPath()
        context.moveTo(0, 0)
        context.lineTo(rand() * 30 + 30, 1)
        context.stroke()

        context.restore()
    }

    let draw = render.bind(this, context)

    let count = (width * height) / 16
    let count = 50000
    let points = Array(20000)
        .fill([])
        .map((v) => {
            // let x = (i % width) * 16
            // let y = Math.floor(i / height) * 16
            let x = Math.random() * width
            let y = Math.random() * height
            return [x, y, value(x, y)]
        })

    let w = [rand() * width, rand() * height, 0, 0]

    // @NOTE(Grey): Can run the drawing code in here to watch it go
    let loop = () => {
        // requestAnimationFrame(loop)
    }
    */

    // @NOTE(Grey): [attractor](http://paulbourke.net/fractals/clifford/)
    var a = rand() * 4 - 2
    var b = rand() * 4 - 2
    var c = rand() * 4 - 2
    var d = rand() * 4 - 2

    let value = function(x, y) {
        var scale = 0.005
        x = (x - width / 2) * scale
        y = (y - height / 2) * scale
        let x1 = Math.sin(a * y) + c * Math.cos(a * x)
        let y1 = Math.sin(b * x) + d * Math.cos(b * y)

        return Math.atan2(y1 - y, x1 - x)

        // @NOTE(Grey): Old attractors
        // return (x + y) * 0.001 * TAU
        // return (Math.sin(x * 0.01) + Math.sin(y * 0.0001)) * TAU
    }

    let iterations = 80
    let points = Array(Math.floor(height / 5))
        .fill([])
        .map((v, i) => { return [[0, i * 5], [0, 0]] })

    let data = Array(Math.floor(height / 5))
        .fill([])

    context.fillStyle = 'white'
    context.fillRect(0, 0, width, height)
    context.lineWidth = 0.5

    for (var i = 0; i < iterations; ++i) {
        points.forEach((p, i) => {
            let pos = p[0]
            let vel = p[1]

            var v = value(...pos)
            vel = vec.add(vel, [Math.cos(v) * 0.8, Math.sin(v) * 0.8])

            context.beginPath()
            context.moveTo(...pos)
            data[i].push(pos)

            pos = vec.add(pos, vel)

            context.lineTo(...pos)
            context.stroke()
            data[i].push(pos)

            vel = vec.scale(vel, 0.99)

            if (pos[0] > width) pos[0] = 0
            if (pos[1] > height) pos[1] = 0
            if (pos[0] < 0) pos[0] = width
            if (pos[1] < 0) pos[1] = height

            points[i] = [pos, vel]

        })
    }

    return (props) => [
        { data: props.canvas, prefix: `${seed_value}` },
        { data: JSON.stringify(data), file: `${seed_value}-data.json` }
    ]
}

canvasSketch(sketch, settings)
