let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2
    const seed_value = 42

    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))
    let col = (h=0, s=0, l=0, a=1) => `hsla(${h*360}, ${s*100}%, ${l*100}%, ${a})`
    let rand = seed(seed_value)


    let vlerp = (v0, v1, t) => [lerp(v0[0], v1[0], t), lerp(v0[1], v1[1], t)]

    let circle = (ctx, x, y, r) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.closePath()
    }

    let debug_draw_points = (ctx, c) => {
        ctx.fillStyle = col(0, 0, 0.125)
        circle(ctx, ...c, 8)
        ctx.fill()
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
            ctx.strokeStyle = col(0, 0, 1)
            ctx.moveTo(...cp)
        } else if (i === arr.length-1) {
            ctx.lineTo(...cp)
            ctx.stroke()
            // ctx.fill()
        } else {
            ctx.lineTo(...cp)
        }
    }

    let curve_draw_points = (ctx, cp) => {
        ctx.fillStyle = col(0, 0, 1)
        circle(ctx, ...cp, 2)
        ctx.fill()
    }

    let prepare_geometry = (res, arr) => {
        let result = curve_points(res, arr[0], arr[1], arr[2])
        return result
    }


    let ctx_debug_draw_points = debug_draw_points.bind(this, context)
    let ctx_curve_draw_points = curve_draw_points.bind(this, context)
    let ctx_curve_draw = curve_draw.bind(this, context)

    /*
    let eye = [
        [width*0.25, height*0.5],
        [width*0.5, height*0.25],
        [width*0.75, height*0.5],
        [width*0.5, height*0.75]
    ]

    let slit = [
        [width*0.5, height*0.25],
        [width*0.25, height*0.5],
        [width*0.5, height*0.75],
        [width*0.75, height*0.5]
    ]
    */

    let curve = [
        [width*0.25, height*0.5],
        [width*0.5, height*0.25],
        [width*0.75, height*0.5]
    ]

    return ({ playhead }) => {
        context.fillStyle = col()
        context.fillRect(0, 0, width, height)

        // let curve0 = eye.map(curve_wobble.bind(this, playhead))
        // let curve1 = slit.map(curve_wobble.bind(this, playhead))

        /*
        let geo = [
            [curve0[0], curve0[1], curve0[2]],
            [curve0[0], curve0[3], curve0[2]],
            [curve1[0], curve1[1], curve1[2]],
            [curve1[0], curve1[3], curve1[2]]
        ].map(prepare_geometry.bind(this, 32))
        */

        let geo = [curve].map(prepare_geometry.bind(this, 32))

        // context.fillStyle = col(0, 0, 1)
        geo.forEach((curve) => {
            // curve.forEach(ctx_curve_draw_points)
            curve.forEach(ctx_curve_draw)
        })

        /*
        let geo = [
            [curve0[0], curve0[1], curve0[2]],
            [curve0[0], curve0[3], curve0[2]],
            [curve0[1], curve0[2], curve0[3]],
            [curve0[3], curve0[0], curve0[1]]
        ].map(prepare_geometry.bind(this, 32))
        */

        /*
        curve0.forEach(ctx_debug_draw_points)
        curve1.forEach(ctx_debug_draw_points)
        */

    }
}

canvasSketch(sketch, settings)
