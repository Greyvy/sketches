let canvasSketch = require('canvas-sketch')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({width, height}) => {

    const PI = Math.PI * 2
    const TAU = PI * 2

    let flock_init = (n) => {
        let r = []
        for (let i = 0; i <= n; ++i) {
            r.push([
                [
                    i % 2 === 0 ? 0 : width,
                    (i / n) * height
                    // width / 2 + (Math.sin(Math.random() * TAU) * width / 2),
                    // height / 2 + (Math.sin(Math.random() * TAU) * height / 2)
                ],
                [0, 0]
            ])
        }
        return r
    }

    let flock_draw = (ctx, f) => {
        for (let i = 0; i < f.length; ++i) {
            let b = f[i]
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
            ctx.beginPath()
            ctx.arc(b[0][0], b[0][1], 2, 0, Math.PI * 2)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
        }
    }

    let flock_move = (f) => {
        for (let i = 0; i < f.length; ++i) {
            let b = f[i]
            let v1 = rule1(f, b)
            let v2 = rule2(f, b)
            let v3 = rule3(f, b)

            b[1] = [
                b[1][0] + v1[0] + v2[0] + v3[0],
                b[1][1] + v1[1] + v2[1] + v3[1]
            ]

            let t = vec.add(b[0], b[1])
            let v = flock_bound(t, b[1])
            b[0] = vec.add(b[0], v)
        }
    }

    let flock_bound = (bj, vel) => {
        let x_min = 0
        let x_max = width
        let y_min = 0
        let y_max = height
        let v = vel

        if (bj[0] < x_min) {
            v[0] = Math.random() * 1
        } else if (bj[0] > x_max) {
            v[0] = Math.random() * -1
        }

        if (bj[1] < y_min) {
            v[1] = Math.random() * 1
        } else if (bj[1] > y_max) {
            v[1] = Math.random() * -1
        }
        return v
    }

    // @NOTE(Grey): Boids fly towards centre of mass
    let rule1 = (f, bj) => {
        let pcj = [0, 0]
        for (let i = 0; i < f.length; ++i) {
            let b = f[i]
            if (b !== bj) {
                pcj = vec.add(pcj, b[0])
            }
        }
        pcj = [pcj[0] / f.length - 1, pcj[1] / f.length - 1]
        let r = vec.sub(pcj, bj[0])
        return vec.scale(r, 0.00125) // [r[0] / 100, r[1] / 100]
    }

    // @NOTE(Grey): Boids try to keep their distance from other boids
    let rule2 = (f, bj) => {
        let c = [0, 0]
        for (let i = 0; i < f.length; ++i) {
            let b = f[i]
            if (b !== bj) {
                let dist = Math.abs(vec.dist(b[0], bj[0]))
                if (dist < 10) {
                    c = vec.sub(c, vec.sub(b[0], bj[0]))
                }
            }
        }
        return c
    }

    // @NOTE(Grey): Try to match velocity
    // @TODO(Grey): occaisionally this returns undefined, should fix
    let rule3 = (f, bj) => {
        let pvj = [0, 0]
        for (let i = 0; i < f.length; ++i) {
            let b = f[i]
            if (b !== bj) {
                pvj = vec.add(pvj, b[1])
            }
        }
        pvj = [pvj[0] / f.length - 1, pvj[1] / f.length - 1]
        let r = vec.scale(vec.sub(pvj, bj[1]), 0.125)
        return r
    }


    let flock = flock_init(200)

    return ({ context: ctx, width, height }) => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height)

        flock_draw(ctx, flock)
        flock_move(flock)
    }
}

canvasSketch(sketch, settings)
