// REF: https://kaesve.nl/projects/reaction-diffusion/readme.html
// REF: http://www.karlsims.com/rd.html

let canvasSketch = require('canvas-sketch')

let settings = {
    animate: true,
    dimensions: [ 512, 512 ]
}

let sketch = ({ width, height }) => {

    /*
    const DA = 0.42
    const DB = 0.125
    const f = 0.0255
    const k = 0.0625
    */

    let DA = 0.42
    let DB = 0.125
    let f = 0.075
    let k = 0.065

    let As = new Array(width * width).fill(1)
    let Bs = new Array(width * width).fill(0)

    let s_w = 20
    let s_h = 20
    for (let y = width / 2 - s_h; y <= width / 2 + s_h; y++) {1
        for (let x = width / 2 - s_w; x <= width / 2 + s_w; x++) {
            Bs[x + y * width] = 1
        }
    }


    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        let nextAs = new Array(width * width)
        let nextBs = new Array(width * width)

        // DA = 0.45 + ((performance.now() % 6000 / 6000) * 0.15)
        // DB = 0.15 + ((performance.now() % 6000 / 6000) * 0.05)
        // f = 0.015 + (performance.now() % 2000 / 2000) * 0.04
        // k = 0.060 + (performance.now() % 2000 / 2000) * 0.025

        // for (let i = 0; i < 8; ++i) {
            for (let y = 0; y < width; y++) {
                for (let x = 0; x < width; x++) {
                    let cursor = x + y * width

                    if (x == 0 || y == 0 ||
                        x == width - 1 || y == width - 1) {
                        nextAs[cursor] = 1
                        nextBs[cursor] = 0
                        continue
                    }

                    // k = 0.045 + ((y / width) * 0.025)

                    let A = As[cursor]
                    let B = Bs[cursor]
                    let reaction = A * B * B

                    let diffuseA = (
                        As[cursor - width]
                        + As[cursor + 1]
                        + As[cursor + width]
                        + As[cursor - 1]) / 4
                        - A

                    let diffuseB = (
                        Bs[cursor - width]
                        + Bs[cursor + 1]
                        + Bs[cursor + width]
                        + Bs[cursor - 1]) / 4
                        - B

                    nextAs[cursor] =
                        A + DA * diffuseA - reaction + (1 - A) * f
                    nextBs[cursor] =
                        B + DB * diffuseB + reaction - (k + f) * B
                }
            }

            As = nextAs
            Bs = nextBs

            let pixels = ctx.createImageData(width, height)
            for (let i = 0; i < pixels.data.length; i += 4) {
                let index = i / 4
                let b = Bs[index]
                // let v = Math.floor(255 * 15 * b * b * b)
                let v = Math.floor(255 * 255 * b * b)
                pixels.data[i + 0] = v
                pixels.data[i + 1] = v
                pixels.data[i + 2] = v
                pixels.data[i + 3] = 255
            }
            ctx.putImageData(pixels, 0, 0)
        // }
    }
}

canvasSketch(sketch, settings)
