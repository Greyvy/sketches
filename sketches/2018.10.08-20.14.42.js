let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context: ctx, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)

    let stride = 24
    let margin = 64
    let n = stride * stride
    let size = (width - margin * 2) / stride
    let points = []
    for (let i = 0; i < n; ++i) {
        let x = margin + (size / 2) + (i % stride) * size
        let y = margin + (size / 2) + Math.floor(i / stride) * size
        points.push([x, y])
    }

    let current_cell = 0
    let previous_side = 0
    let side_options = [0, 1, 2, 3]
    let lines = [{index: current_cell, point: [rand() * size, size]}]
    for (let i = 0; i < n; ++i) {
        let result
        let pick = side_options.filter((v) => {
            let x = current_cell % stride
            let y = Math.floor(current_cell / stride)
            let top    = y === 0 ? 0 : null
            let right  = x === stride ? 1 : null
            let bottom = y === stride ? 2 : null
            let left   = x === 0 ? 3 : null
            return (v !== previous_side) && (v !== top)
                && (v !== right) && (v !== bottom) && (v !== left)
        })
        let side = pick[Math.floor(rand() * pick.length)]
        let scale = size

        // @NOTE(Grey): Its pretty interesting if I remove the
        // size scaler from the rand() calls
        if (side === 0) {
            current_cell = current_cell - stride
            result = {index: current_cell, point: [rand() * scale, 0]}
            previous_side = 0
        } // 'top'
        if (side === 1) {
            current_cell = current_cell + 1
            result = {index: current_cell, point: [scale, rand() * scale]}
            previous_side = 1
        } // 'right'
        if (side === 2) {
            current_cell = current_cell + stride
            result = {index: current_cell, point: [rand() * scale, scale]}
            previous_side = 2
        } // 'bottom'
        if (side === 3) {
            current_cell = current_cell - 1
            result = {index: current_cell, point: [0, rand() * scale]}
            previous_side = 3
        } // 'left'



        lines.push(result)
    }

    return ({ context: ctx, width, height, playhead }) => {

        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)
        for (let i = 0; i < n; ++i) {
            let p = points[i]

            let size = (width - margin * 2) / stride * 0.85
            let x = p[0]
            let y = p[1]

            ctx.save()
            ctx.lineWidth = 1
            ctx.globalCompositeOperation = 'multiply'
            ctx.fillStyle = 'hsla(0, 0%, 95%, 1)'
            ctx.translate(-size / 2, -size / 2)
            ctx.fillRect(x, y, size, size)
            ctx.restore()

        }

        ctx.save()
        ctx.strokeStyle = 'hsla(0, 0%, 20%, 1)'
        ctx.lineWidth = 1
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        let len = Math.floor(playhead * lines.length)
        for (let i = 0; i < len; ++i) {
            let l = lines[i]
            let x = (margin +
                (l.index % stride) * size) + l.point[0]
            let y = (margin +
                Math.floor(l.index / stride) * size) + l.point[1]

            if (i === 0) {
                ctx.moveTo(x, y)
            } else {
                ctx.lineTo(x, y)
            }
        }
        ctx.stroke()
        ctx.restore()

        /*
         * Debug
        for (let i = 0; i < lines.length; ++i) {
            let l = lines[i]
            let x = (margin +
                (l.index % stride) * size) + l.point[0]
            let y = (margin +
                Math.floor(l.index / stride) * size) + l.point[1]
            ctx.save()
            ctx.fillStyle = 'hsla(10, 90%, 50%, 0.5)'
            ctx.beginPath()
            ctx.arc(x, y, 8, 0, TAU)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
        }
        */

    }
}

canvasSketch(sketch, settings)

