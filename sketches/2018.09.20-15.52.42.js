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

    let draw_mirror = (ctx, callback) => {
        ctx.save()
        callback()
        ctx.restore()

        ctx.save()
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
        callback()
        ctx.restore()

        ctx.save()
        ctx.translate(0, height)
        ctx.scale(1, -1)
        callback()
        ctx.restore()

        ctx.save()
        ctx.translate(width, height)
        ctx.scale(-1, -1)
        callback()
        ctx.restore()
    }


    let blob_spawn = (x, y, size) => {
        return {
            pos: [x, y],
            size: Math.floor(rand() * 32),
            interval: 2 + Math.floor(rand() * 4),
            dest: [rand(), rand()]
        }
    }

    let blobs_update = (ctx, playhead, a) => {
        for (let i = 0; i < a.length; ++i) {
            let b = a[i]
            let t = Math.abs(Math.sin((playhead * b.interval % b.interval) * (PI / 2)))
            let base = [width / 2, height / 2]

            // b.pos[0] = base[0] + (-base[0] * b.dest[0] -64) * t
            // b.pos[1] = base[1] + (-base[1] * b.dest[1] -64) * t

            // @NOTE(Grey): This is different and I'm not quite sure why
            // b.pos[0] = base[0] + (-b.pos[0] * b.dest[0] -64) * t
            // b.pos[1] = base[1] + (-b.pos[1] * b.dest[1] -64) * t

            draw_mirror(ctx, function() {
                ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
                ctx.beginPath()
                ctx.moveTo(...base)
                ctx.lineTo(0, 0)
                // ctx.arc(b.pos[0], b.pos[1], 5 + (32 - 32 * t), 0, TAU)
                ctx.closePath()
                ctx.stroke()
            })


        }
    }

    let blobs = []

    for (let i = 0; i <= 160; ++i) {
        blobs.push(blob_spawn(width / 2, height / 2))
    }

    let n = 240
    let vis = []
    for (let i = 0; i <= n; ++i) {
        vis.push({
            pos: [rand() * width / 2, rand() * height / 2],
            size: Math.floor(3 + rand() * 8),
            scale: 4 - ((i / n) * 3)
        })
    }

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    return ({ context: ctx, width, height, playhead }) => {

        /*
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.translate(width * 0.25, height * 0.25)
        ctx.rotate(playhead * TAU)
        ctx.scale(1 + 90 * Math.sin(playhead * PI), 1)
        ctx.fillRect(-4, -4, 8, 8)
        */
        // blobs_update(ctx, playhead, blobs)

        let state = vis[Math.floor(playhead * vis.length)]
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.translate(state.pos[0], state.pos[1])
        ctx.scale(state.scale, state.scale)
        ctx.beginPath()
        ctx.arc(0, 0, state.size, 0, TAU)
        ctx.closePath()
        ctx.fill()

        /*
         * @NOTE(Grey): Trying out just mirroring all the drawing operations
         * instead, a little less generic, but much better performance
         **/
        // @NOTE(Grey) First flip, horizontal to the right half
        let d = ctx.getImageData(0, 0, width * 0.5, height * 0.5)
        let f = ctx.createImageData(d)
        for (let i = 0; i < d.data.length; i += 4) {
            let w = d.width * 4
            let y = Math.floor(i / w)

            let p0 = ((w + (w * y)) - (i + 0) + (w * y)) - 1
            let p1 = ((w + (w * y)) - (i + 1) + (w * y)) - 1
            let p2 = ((w + (w * y)) - (i + 2) + (w * y)) - 1
            let p3 = ((w + (w * y)) - (i + 3) + (w * y)) - 1
            f.data[i + 0] = d.data[p3]
            f.data[i + 1] = d.data[p2]
            f.data[i + 2] = d.data[p1]
            f.data[i + 3] = d.data[p0]
        }

        ctx.putImageData(f, width / 2, 0)

        // @NOTE(Grey) Second flip, whol top half to bottom half
        let t = ctx.getImageData(0, 0, width, height * 0.5)
        let r = ctx.createImageData(t)
        for (let i = 0; i < t.data.length; i += 4) {
            let h = d.height * 4
            let y = (t.data.length / h) - Math.floor(i / h)

            let p0 = ((y * h) - ((i + 0) % h)) - 1
            let p1 = ((y * h) - ((i + 1) % h)) - 1
            let p2 = ((y * h) - ((i + 2) % h)) - 1
            let p3 = ((y * h) - ((i + 3) % h)) - 1

            r.data[i + 0] = t.data[p3]
            r.data[i + 1] = t.data[p2]
            r.data[i + 2] = t.data[p1]
            r.data[i + 3] = t.data[p0]
        }

        ctx.putImageData(r, 0, height / 2)


    }
}

canvasSketch(sketch, settings)

