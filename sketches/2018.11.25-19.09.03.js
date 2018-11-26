let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2
    const seed_value = 42

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

    let curve_points = (res, v0, v1, v2) => {
        let result = []
        for (let i = 0; i <= res; ++i) {
            let t = i/res
            let a = vlerp(v0, v1, t)
            let b = vlerp(v1, v2, t)
            let c = vlerp(a, b, t)
            result.push(c)
        }
        return result
    }

    let curve_wobble = (playhead, c, i) => {
        let r = i+playhead*(i%2 === 0 ? TAU : -TAU)*(1+i)
        return vec.add(vec.rotate(vec.scale(vec.norm(c), 60), r), c)
    }

    let curve_draw = (ctx, cp, i, arr) => {
        if (i === 0) {
            ctx.beginPath()
            ctx.moveTo(...cp)
        } else if (i === arr.length-1) {
            ctx.lineTo(...cp)
            ctx.stroke()
        } else {
            ctx.lineTo(...cp)
        }
    }

    let curve_draw_points = (ctx, cp) => {
        circle(ctx, ...cp, 2)
        ctx.fill()
    }

    let prepare_geometry = (res, arr) => {
        let result = curve_points(res, arr[0], arr[1], arr[2])
        return result
    }

    let ease_table = t => 1-Math.pow(Math.max(0, Math.abs(t)*2-1), 2)

    let curve = [
        [width*0.25, height*0.65],
        [width*0.5, height*0.35],
        [width*0.75, height*0.65]
    ]

    let n = 8*2
    let curves = []
    for (let i = 0; i <= n; ++i) {
        let t = i/n
        let r = i%2 === 0 ? width*0.20 : width*0.25
        let x = width*0.5+Math.cos(t*TAU)*r
        let y = height*0.5+Math.sin(t*TAU)*r
        curves.push([x, y])
    }

    let c_curves = []
    for (let i = 1; i < curves.length; i+=2) {
        c_curves.push([curves[i-1], curves[i], curves[i+1]])
    }

    return ({ frame, totalFrames, playhead }) => {
        context.fillStyle = col(0, 0, 0.9)
        context.fillRect(0, 0, width, height)

        /*
         * Debug
        for (let i = 0; i < curves.length; ++i) {
            if (i === 0) {
                context.beginPath()
                context.strokeStyle = col(0.2, 0.5, 0.5, 0.5)
                context.moveTo(...curves[i])
            } else if (i === curves.length-1) {
                context.closePath()
                context.stroke()
            } else {
                context.lineTo(...curves[i])
            }
        }
        */

        // @TODO(Grey): Wobble the control points `(i%2 === 1)` in ze loop

        context.fillStyle = col(0, 0, 0.75)
        curves.forEach((v, i) => {
            let t = map(clamp(playhead, 0.15, 0.85), 0.15, 0.85, -1, 1)
            let e = ease_table(t)
            context.save()
            context.translate(...v)
            context.scale(e, e)
            circle(context, 0, 0, 4)
            context.fill()
            context.restore()
        })

        context.save()
        context.fillStyle = col(0, 0, 0)
        context.strokeStyle = col(0, 0, 0)
        for (let i = 0; i < c_curves.length; ++i) {
            let cc = c_curves[i]
            let c = curve_points(32, cc[0], cc[1], cc[2])
            // c.forEach(curve_draw_points.bind(this, context))
            c.forEach(curve_draw.bind(this, context))
        }
        context.restore()


        /*
        let c = curve // curve.map(curve_wobble.bind(this, playhead))// curve // 
        let geo = [c].map(prepare_geometry.bind(this, 256))

        let t = map(clamp(playhead, 0.5, 0.9), 0.5, 0.9, 0, 1)
        let n = Math.floor(geo[0].length*Math.sin(t*PI))
        context.strokeStyle = col(0, 0, 0.2)
        context.lineWidth = 2
        for (let i = 0; i < n+1; ++i) {
            let cp = geo[0][i]
            if (i === 0) {
                context.beginPath()
                context.moveTo(...cp)
            } else if (i === n) {
                context.lineTo(...cp)
                context.stroke()
            } else {
                context.lineTo(...cp)
            }
        }
        */

        /*
        context.font = '18px monospace'
        context.fillStyle = col(0, 0.5, 0.5)
        context.fillText(a, 16, 18+16)
        */

    }
}

canvasSketch(sketch, settings)
