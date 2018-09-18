let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    // animate: true,
    // duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context: ctx, width, height }) => {
    const PI = Math.PI
    const TAU = PI * 2

    let c = document.createElement('canvas')
    let c_ctx = c.getContext('2d')
    let img0 = new Image()
    let img1 = new Image()
    let img2 = new Image()

    c.width = width / 2
    c.height = height / 2


    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    // ctx.globalCompositeOperation = 'multiply'

    let n = 2800
    ctx.save()
    ctx.translate(width * 0.25, height * 0.25)
    // ctx.scale(n, n)
    for (let i = 0; i <= n; ++i) {
        let d = i / n
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        let s = (1 - d * 1)
        ctx.scale(s, s)
        ctx.rotate(PI * rand())

        let x = width / 2 * rand() - width / 4
        let y = height / 2 * rand() - width / 4
        let size = 8 + Math.floor(rand() * 16) / 2
        ctx.beginPath()
        ctx.arc(x, y, size, 0, TAU)
        ctx.closePath()
        ctx.fill()

        if (rand() > 0.95) {
            ctx.fillRect(
                x - size, y - size,
                size * 80 * rand(),
                size * 2 * rand()
            )
        }
    }
    ctx.restore()




    let data0 = ctx.getImageData(0, 0, width / 2, height / 2)
    c_ctx.clearRect(0, 0, c.width, c.height)
    c_ctx.putImageData(data0, 0, 0)

    img0.onload = function() {
        ctx.save()
        ctx.translate(0, height)
        ctx.scale(1, -1)
        ctx.drawImage(img0, 0, 0)
        ctx.restore()
    }
    img0.src = c.toDataURL()

    img1.onload = function() {
        ctx.save()
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(img1, 0, 0)
        ctx.restore()
    }
    img1.src = c.toDataURL()

    img2.onload = function() {
        ctx.save()
        ctx.translate(width, height)
        ctx.scale(-1, -1)
        ctx.drawImage(img2, 0, 0)
        ctx.restore()
    }
    img2.src = c.toDataURL()


    return ({ context: ctx, width, height, playhead }) => {
    }
}

canvasSketch(sketch, settings)
