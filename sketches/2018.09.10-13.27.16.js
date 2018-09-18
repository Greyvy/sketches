let canvasSketch = require('canvas-sketch')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let char_update = (dt, c) => {
        c.vel = vec.add(c.vel, [c.acc, 0])
        c.pos = vec.add(c.pos, c.vel)
        return c
    }

    let char_draw = (ctx, c) => {
        ctx.save()
        ctx.fillRect(...c.pos, 32, 32)
        ctx.restore()
    }


    let char = {
        pos: [ width / 2, height / 2 ],
        vel: [0, 0],
        acc: 0.5
    }

    let shad0 = {
        pos: [ width / 2, height / 2 ],
        vel: [0, 0],
        acc: 0.25
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        /*
        char = char_update(0.16, char)
        shad0 = char_update(0.16, shad0)

        ctx.fillStyle = 'hsla(0, 0%, 40%, 1)'
        char_draw(ctx, shad0)
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        char_draw(ctx, char)
        */


        let n = 4

        ctx.translate(width / 2, height / 2)
        for (let i = 0; i < n; ++i) {
            let d = i / n
            let t = Math.sin(Math.pow(playhead, 4 - i) * TAU)
            ctx.fillStyle = `hsla(0, 0%, ${80 - (d * 80)}%, 1)`
            ctx.beginPath()
            ctx.arc(0, t * height * 0.25, (width * 0.125) - (40 - (d * 40)), 0, TAU)
            ctx.closePath()
            ctx.fill()
        }


    }
}

canvasSketch(sketch, settings)
