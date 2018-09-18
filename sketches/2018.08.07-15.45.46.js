let canvasSketch = require('canvas-sketch')

let settings = {
    dimensions: [ 1024, 1024 ]
}

let sketch = () => {

    let extract_channel = (ctx, image_data, field) => {
        let fields = { RED: 0, GREEN: 1, BLUE: 2 }
        let result = ctx.createImageData(image_data.width, image_data.height)

        for (let i = 0; i < image_data.data.length; i += 4) {
            /*
            result.data[i + 0] = image_data.data[i + 0]
            result.data[i + 1] = image_data.data[i + 1]
            result.data[i + 2] = image_data.data[i + 2]
            result.data[i + 3] = image_data.data[i + 3]
            */

            result.data[i + 0] = 0
            result.data[i + 1] = 0
            result.data[i + 2] = 0
            result.data[i + 3] = image_data.data[i + 3]

            if (fields[field] === 0) {
                let amount = image_data.data[i + 0] / 255
                result.data[i + 0] = 255 + (amount * 255)
                result.data[i + 1] = 255 - (amount * 255)
                result.data[i + 2] = 255 - (amount * 255)
            }
            if (fields[field] === 1) {
                let amount = image_data.data[i + 1] / 255
                result.data[i + 0] = 255 - (amount * 255)
                result.data[i + 1] = 255 + (amount * 255)
                result.data[i + 2] = 255 - (amount * 255)
            }
            if (fields[field] === 2) {
                let amount = image_data.data[i + 2] / 255
                result.data[i + 0] = 255 - (amount * 255)
                result.data[i + 1] = 255 - (amount * 255)
                result.data[i + 2] = 255 + (amount * 255)
            }
        }

        return result
    }


    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        // ctx.globalCompositeOperation = 'multiply'

        ctx.save()
        ctx.translate(width / 2, height / 2)


        ctx.beginPath()
        ctx.fillStyle = 'rgba(255, 0, 0)'
        ctx.arc(10, 0, width / 4, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = 'rgba(0, 255, 0)'
        ctx.arc(0, 50, width / 4, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = 'rgba(0, 0, 255)'
        ctx.arc(-50, 0, width / 4, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
        ctx.restore()


        let src = ctx.getImageData(0, 0, width, height)
        let white = extract_channel(ctx, src, 'RED')
        ctx.putImageData(white, 140, 140)

        ctx.font = '24px monospace'
        ctx.fillStyle = 'hsla(0, 0%, 60%, 1)'

        let yoff = 24
        for (let i = 1; i < 30; ++i) {
            ctx.fillText(src.data[i - 1], 10, yoff * i)
        }

    }
}

canvasSketch(sketch, settings)
