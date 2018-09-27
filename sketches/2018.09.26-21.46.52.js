let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let load = require('load-asset')
let vec = require('vec-la')

let settings = {
    animate: true,
    dimensions: [ 2048, 2048 ]
}

let sketch = async ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = 42
    let rand = seed(seed_value)

    let image = await load('assets/2018_09_26_distortion.jpg')

    context.drawImage(image, 0, 0)
    let distortion = context.getImageData(0, 0, width, height)
    let velocities = []


    for (let i = 0; i < distortion.data.length; i += 4) {
        let r = ((distortion.data[i + 0] / 255) * 2) - 1
        let g = ((distortion.data[i + 1] / 255) * 2) - 1
        let b = ((distortion.data[i + 2] / 255) * 2) - 1
        let a = ((distortion.data[i + 3] / 255) * 2) - 1

        velocities.push([g, b])
    }

    let update = (p, distort) => {
        let friction = 0.85
        if (p.pos[0] > 0 && p.pos[0] < width
            && p.pos[1] > 0 && p.pos[1] < height) {
            let index = Math.floor(p.pos[0]) + Math.floor(p.pos[1]) * width
            p.vel = vec.add(p.vel, distort[index])
        } else {
            p.vel = [0, 0]
        }

        p.pos = vec.add(p.pos, p.vel)
        p.vel = vec.scale(p.vel, friction)

        context.save()
        context.fillStyle = 'hsla(0, 0%, 0%, 1)'
        context.beginPath()
        context.arc(...p.pos, 8, 0, TAU)
        context.closePath()
        context.fill()
        context.restore()
    }

    let particle = {
        pos: [width / 2, height / 2],
        vel: [0, 0]
    }

    let particles = []

    for (let i = 0; i <= 900; ++i) {
        particles.push({
            pos: [rand() * width, rand() * height],
            vel: [rand() * 2 - 1, rand() * 2 - 1]
        })
    }

    return ({ context, width, height }) => {
        context.fillStyle = 'white'
        context.fillRect(0, 0, width, height)

        for (let i = 0; i < particles.length; ++i) {
            let part = particles[i]
            update(part, velocities)
        }

    }
}

canvasSketch(sketch, settings)
