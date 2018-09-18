let canvasSketch = require('canvas-sketch')
let vec = require('vec-la')
let seed = require('seed-random')


// @NOTE(Grey): This is made using the tutorial:
// https://medium.com/@bit101/flow-fields-part-i-3ebebc688fd8

let PI = Math.PI
let TAU = PI * 2

let seed_value = Math.floor(Math.random() * 10000)
// Good seeds:
// 4364, 4663, 2317
let rand = seed(seed_value)

let settings = {
    dimensions: [ 2048, 2048 ]
}

let sketch = ({ context, width, height }) => {

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
        .map((v, i) => { return [[i * 5, i * 5], [0, 0]] })

    context.fillStyle = 'hsla(0, 60%, 98%, 1)'
    context.fillRect(0, 0, width, height)
    context.lineWidth = 0.5

    context.save()
    context.fillStyle = 'hsla(220, 60%, 95%, 1)'
    context.textAlign = 'center'
    context.font = `${width * 0.125}px ArnoPro-ItalicDisplay`
    context.fillText('collide', width / 2, (height / 2) + (width * 0.125 / 4))
    context.restore()

    context.save()
    context.globalCompositeOperation = 'multiply'
    context.strokeStyle = 'hsla(220, 60%, 95%, 1)'
    for (var i = 0; i < iterations; ++i) {
        points.forEach((p, i) => {
            let pos = p[0]
            let vel = p[1]

            var v = value(...pos)
            vel = vec.add(vel, [Math.cos(v) * 0.8, Math.sin(v) * 0.8])

            context.lineWidth = (vel[0] * vel[1]) * 0.05

            context.beginPath()
            context.moveTo(...pos)

            pos = vec.add(pos, vel)

            context.lineTo(...pos)
            context.stroke()

            vel = vec.scale(vel, 0.95)

            if (pos[0] > width) pos[0] = 0
            if (pos[1] > height) pos[1] = 0
            if (pos[0] < 0) pos[0] = width
            if (pos[1] < 0) pos[1] = height

            points[i] = [pos, vel]

        })
    }
    context.restore()

    return (props) => [
        { data: props.canvas, prefix: `${seed_value}` }
    ]
}

canvasSketch(sketch, settings)
