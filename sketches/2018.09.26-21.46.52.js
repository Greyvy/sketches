// REF: https://kaesve.nl/projects/reaction-diffusion/readme.html
// REF: http://www.karlsims.com/rd.html

let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let load = require('load-asset')

let settings = {
    animate: true,
    dimensions: [ 512, 512 ]
}

let sketch = async ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    // let seed_value = Math.floor(Math.random() * 1000)
    // let rand = seed(seed_value)

    let DA = 1.5
    let DB = 0.425
    // let f = 0.035
    let f = 0.1
    let k = 0.057

    let map = (v, istart, istop, ostart, ostop) => {
        return ostart + (ostop - ostart) * ((v - istart) / (istop - istart))
    }

    let limit = (v, min, max) => {
        return Math.min(max, Math.max(min, v))
    }

    let laplaceA = (As, index) => {
        let result = 0
        result += As[index] * -1
        result += As[index - 1] * 0.2
        result += As[index + 1] * 0.2
        result += As[index - width] * 0.2
        result += As[index + width] * 0.2
        result += As[index - width + 1] * 0.05
        result += As[index - width - 1] * 0.05
        result += As[index + width + 1] * 0.05
        result += As[index + width - 1] * 0.05

        return result
    }

    let laplaceB = (Bs, index) => {
        let result = 0
        result += Bs[index] * -1
        result += Bs[index - 1] * 0.2
        result += Bs[index + 1] * 0.2
        result += Bs[index - width] * 0.2
        result += Bs[index + width] * 0.2
        result += Bs[index - width + 1] * 0.05
        result += Bs[index - width - 1] * 0.05
        result += Bs[index + width + 1] * 0.05
        result += Bs[index + width - 1] * 0.05

        return result
    }

    let image = await load('assets/2018_09_26_distortion3.jpg')

    context.drawImage(image, 0, 0)
    let distortion = context.getImageData(0, 0, width, height).data
    let velocities = []

    for (let i = 0; i < distortion.length; i += 4) {
        let r = distortion[i + 0] / 255
        let g = distortion[i + 1] / 255
        let b = distortion[i + 2] / 255
        let a = distortion[i + 3] / 255

        // velocities.push([Math.sin(g * TAU), Math.sin(b * TAU)])
        velocities.push((r + g + b) / 3)
    }


    let As = new Array(width * width).fill(1)
    let Bs = new Array(width * width).fill(0)

    let s_w = 120
    let s_h = 120
    for (let y = width / 2 - s_h; y <= width / 2 + s_h; y++) {1
        for (let x = width / 2 - s_w; x <= width / 2 + s_w; x++) {
            Bs[x + y * width] = 1
        }
    }

    let nextAs = new Array(width * width)
    let nextBs = new Array(width * width)
    let pixels = context.createImageData(width, height)

    return ({ context: ctx, width, height }) => {

        for (let i = 0; i < width * width; ++i) {
            let x = i % width
            let y = Math.floor(i / width)
            let cursor = i

            if (x === 0 || y === 0 ||
                x === width - 1 || y === width - 1) {
                nextAs[cursor] = 1
                nextBs[cursor] = 0
                continue
            }

            // f = velocities[cursor] * 0.01 // * 0.062
            // k = velocities[cursor] * 0.045 // * 0.060

            // f = 0.124
            f = map(velocities[cursor], 0, 1, 0.12, 0.145)
            // k = 0.0525
            k = 0.0505
            // k = map(velocities[cursor], 0, 1, 0.055, 0.075)

            let A = As[cursor]
            let B = Bs[cursor]
            let reaction = A * B * B

            let diffuseA = laplaceA(As, cursor)
            let diffuseB = laplaceB(Bs, cursor)

            nextAs[cursor] =
                limit((A + DA * diffuseA - reaction + (1 - A) * f), 0, 1)
            nextBs[cursor] =
                limit((B + DB * diffuseB + reaction - (k + f) * B), 0, 1)
        }

        As = nextAs
        Bs = nextBs

        for (let i = 0; i < pixels.data.length; i += 4) {
            let index = i / 4
            let val = As[index] - Bs[index]
            // let v = limit(255 - Math.floor(val * 255), 0, 255)
            let v = limit(Math.floor((1 - val) * 255), 0, 255)
            pixels.data[i + 0] = v
            pixels.data[i + 1] = v
            pixels.data[i + 2] = v
            pixels.data[i + 3] = 255
        }
        ctx.putImageData(pixels, 0, 0)

    }
}

canvasSketch(sketch, settings)

