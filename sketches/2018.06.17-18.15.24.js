let canvasSketch = require('canvas-sketch');

let settings = {
    animation: true,
    duration: 8,
    dimensions: [ 1024, 1024 ]
}

let random = (min, max) => Math.random() * (max - min) + min
let mutate = (p) => [p[0] + random(-0.125, 0.125), p[1] + random(-0.125, 0.125)]
let lerp = (v0, v1, t) => (1 - t) * v0 + t * v1

let line0 = [
    [
        [0, 0.5]
    ],
    [
        [0.125, 0.25],
        [0.375, 0.25],
        [0.5, 0.5]
    ],
    [
        [0.625, 0.75],
        [0.875, 0.75],
        [1, 0.5]
    ]
]

let art = [
    line0,
    line0
        .map(seg => seg.map(mutate)),
    line0
        .map(seg => seg.map(mutate))
        .map(seg => seg.map(mutate)),
    line0
        .map(seg => seg.map(mutate))
        .map(seg => seg.map(mutate))
        .map(seg => seg.map(mutate)),
    line0
        .map(seg => seg.map(mutate))
        .map(seg => seg.map(mutate))
        .map(seg => seg.map(mutate))
        .map(seg => seg.map(mutate))
]

let points_draw = function(ctx, size, arr) {
    let width = size[0]
    let height = size[1]

    ctx.save()
    ctx.beginPath()
    arr.forEach((seg, i) => {
        if (seg.length === 1 && i === 0) {
            ctx.moveTo(seg[0][0] * width, seg[0][1] * height)
        }
        if (seg.length === 1) {
            ctx.lineTo(seg[0][0] * width, seg[0][1] * height)
        }
        if (seg.length === 2) {
            ctx.quadraticCurveTo(
                seg[0][0] * width,
                seg[0][1] * height,
                seg[1][0] * width,
                seg[1][1] * height
            )
        }
        if (seg.length === 3) {
            ctx.bezierCurveTo(
                seg[0][0] * width,
                seg[0][1] * height,
                seg[1][0] * width,
                seg[1][1] * height,
                seg[2][0] * width,
                seg[2][1] * height
            )
        }
    })
    ctx.stroke()
    ctx.restore()
}

let points_lerp = function(p1, p2, t) {
    return p1.map((seg, i) =>
        seg.map((p, j) =>
            [lerp(p[0], p2[i][j][0], t), lerp(p[1], p2[i][j][1], t)]
        )
    )
}

let debug = function(ctx, size, arr) {
    let width = size[0]
    let height = size[1]
    ctx.save()
    arr.forEach((seg) => {
        seg.forEach((p) => {
            let x = p[0] * width
            let y = p[1] * height
            ctx.beginPath()
            ctx.fillStyle = 'hsla(120, 80%, 60%, 0.5)'
            ctx.arc(x, y, width / 140, 0, Math.PI * 2, 0)
            ctx.fill()
        })
    })
    ctx.restore()
}

const sketch = () => {
    return ({ context, width, height, time, frame, playhead }) => {
        let PI = Math.PI
        let TAU = PI * 2
        let ctx = context

        let p1 = Math.sin(playhead * (PI / 2))
        let p2 = Math.sin(((playhead * art.length) % 1) * (PI / 2))
        let index = Math.floor(lerp(0, art.length, playhead))

        ctx.save()
        ctx.fillStyle = 'hsla(240, 50%, 98%, 1)'
        ctx.fillRect(0, 0, width, height)
        ctx.restore()

        ctx.lineWidth = height / 512
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = `hsla(240, 50%, 60%, 1)`
        ctx.fillStyle = `hsla(240, 50%, 60%, 1)`
        ctx.font = '24px sans-serif'

        art.forEach((a) => {
            points_draw(ctx, [width, height], a)
            debug(ctx, [width, height], a)
        })

        let warp1 = art[(index) % art.length]
        let warp2 = art[(index + 1) % art.length]
        ctx.save()
        ctx.lineWidth = width / 8
        ctx.strokeStyle = `hsla(${360 * p1}, 50%, 60%, 0.25)`
        points_draw(ctx, [width, height], points_lerp(warp1, warp2, p2))
        ctx.restore()

        // Looped lerp:
        // lerp(v0, v1, Math.sin(playhead * PI))

    }
}

canvasSketch(sketch, settings)
