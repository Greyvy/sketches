let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2
    const seed_value = Math.floor(Math.random()*1000)

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let vlerp = (v0, v1, t) => [lerp(v0[0], v1[0], t), lerp(v0[1], v1[1], t)]
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))
    let col = (h=0, s=0, l=0, a=1) => `hsla(${h*360}, ${s*100}%, ${l*100}%, ${a})`
    let rand = seed(seed_value)


    let circle = (ctx, x, y, r) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.closePath()
    }

    let curve_lerp = (arr, t) => {
        let a = vlerp(arr[0], arr[1], t)
        let b = vlerp(arr[1], arr[2], t)
        return vlerp(a, b, t)
    }


    let stride = 8
    let gutter = width*0.08
    let size = (width-(gutter*2)-(gutter*(stride-1)))/stride

    let grid = []
    for (let i = 0; i < stride*stride; ++i) {
        let xi = i%stride
        let yi = Math.floor(i/stride)
        let x = gutter+xi*gutter+(size/2+xi*size)
        let y = gutter+yi*gutter+(size/2+yi*size)
        grid.push([x, y])
    }


    let curves = Array(stride*stride)
        .fill([])
        .map((v, i) => {
            let radius = map(rand(), 0, 1, -size*2, size*2)
            let angle = (PI/2)+rand()*(PI/2)
            let control = vec.add(
                [gutter+(size/2), gutter+(size/2)],
                [Math.cos(angle)*radius, Math.sin(angle)*radius]
            )
            // let control = [rand()*size, rand()*size]

            let curve = [
                [gutter, gutter],
                control,
                [gutter+size, gutter+size]
            ]

            let points = Array(32)
                .fill(0)
                .map((v, i, a) => {
                    let t = Math.pow(i/(a.length-1), 0.5)
                    return curve_lerp(curve, t)
                })
            return [points]
        })


    return ({ context, playhead }) => {
        context.fillStyle = col(0, 0, 0.25)
        context.fillRect(0, 0, width, height)

        curves.forEach((c, i) => {
            let gx = grid[i][0]-(gutter+size/2)
            let gy = grid[i][1]-(gutter+size/2)
            c.forEach((pts, j) => {
                let len = Math.floor(
                    Math.sin(j+playhead*PI)*pts.length
                    )
                for (let i = 0; i < len; ++i) {
                    let x = gx+pts[i][0]
                    let y = gy+pts[i][1]
                    context.fillStyle = col(0, 0, 0.75)
                    circle(context, x, y, 1)
                    context.fill()
                }
                /*
                pts.forEach(p => {
                    let x = gx+p[0]
                    let y = gy+p[1]
                    context.fillStyle = col(0, 0, 1)
                    circle(context, x, y, 1)
                    context.fill()
                })
                */
            })
        })

        /*
         * Debug
        grid.forEach(v => {
            context.fillStyle = col(0, 0, 0.85, 0.5)
            context.strokeStyle = col(0, 0, 0.85, 0.5)
            context.strokeRect(v[0]-size/2, v[1]-size/2, size, size)
            circle(context, v[0], v[1], 4)
            context.fill()
        })
        */
    }
}

canvasSketch(sketch, settings)

