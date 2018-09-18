let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')

let settings = {
    animation: true,
    duration: 3,
    dimensions: [ 1024, 1024 ],
    dimensions: [256, 256]
}

let sketch = ({ context: ctx, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let noise = new SimplexNoise()
    let z = 0

    let get_value = (x, y) => {
        let scale = 0.01
        return noise.noise3D(x * scale, y * scale, z) * TAU
    }

    // let points = []

    let render = () => {
        ctx.lineWidth = 0.1

        for (var y = 0; y < height; y += 5) {
            let p = [[width / 2, y], [0, 0]]
        // }
        // for (let i = 0; i < points.length; ++i) {

            let pos = p[0]
            let vel = p[1]

            ctx.beginPath()
            ctx.moveTo(...pos)
            // let p = points[i]

            for (let i = 0; i < 500; ++i) {
                let value = get_value(...pos)
                vel[0] += Math.cos(value) * 0.1
                vel[1] += Math.sin(value) * 0.1

                pos[0] += vel[0]
                pos[1] += vel[1]

                ctx.lineTo(...pos)

                vel[0] *= 0.99
                vel[1] *= 0.99
            }
            ctx.stroke()
        }

        z += 0.0005
        requestAnimationFrame(render)
    }
    // render()


    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)


        let res = 2
        for (let x = 0; x < width; x+=res) {
            for (let y = 0; y < height; y+=res) {
                let value = get_value(x, y)
                ctx.save()
                ctx.translate(x, y, z)
                ctx.rotate(value)
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.lineTo(res * 1.5, 0)
                ctx.stroke()
                ctx.restore()
            }
        }
        z += 0.01

            /*
        for (let j = 0; j < 1000; ++j) {
            for (let i = 0; i < points.length; ++i) {
                let p = points[i]
                let pos = p[0]
                let vel = p[1]

                let value = get_value(...pos)
                vel[0] += Math.cos(value) * 0.1
                vel[1] += Math.sin(value) * 0.1

                ctx.beginPath()
                ctx.moveTo(...pos)

                pos[0] += vel[0]
                pos[1] += vel[1]

                ctx.lineTo(...pos)
                ctx.stroke()

                vel[0] *= 0.99
                vel[1] *= 0.99

                if (pos[0] > width) p[0] = 0
                if (pos[1] > height) p[1] = 0
                if (p[0] < 0) p[0] = width
                if (p[1] < 0) p[1] = height
            }
        }
        */

        /*
        ctx.lineWidth = 0.1
        for (let j = 0; j < 10; ++j) {
            ctx.lineWidth = 0.1

            for (var y = 0; y < height; y += 5) {
                let p = [[width / 2, y], [0, 0]]

                let pos = p[0]
                let vel = p[1]

                ctx.beginPath()
                ctx.moveTo(...pos)

                for (let i = 0; i < 500; ++i) {
                    let value = get_value(...pos)
                    vel[0] += Math.cos(value) * 0.1
                    vel[1] += Math.sin(value) * 0.1

                    pos[0] += vel[0]
                    pos[1] += vel[1]

                    ctx.lineTo(...pos)

                    vel[0] *= 0.99
                    vel[1] *= 0.99
                }
                ctx.stroke()
            }

            z += 0.0005
        }
        */

    }
}

canvasSketch(sketch, settings)
