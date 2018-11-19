let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let seed = require('seed-random')


let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    // Josh
    // Daniel
    let seed_value = Math.floor(Math.random()*1000)
    let simplex = new SimplexNoise(seed_value)
    let rand = seed(seed_value)

    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))
    let col = (h = 0, s = 0, l = 0, a = 1) => `hsla(${h*360}, ${s*100}%, ${l*100}%, ${a})`

    let circle = (ctx, x, y, r) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.closePath()
    }

    let make_ring = (min, max, rate) => {
        let result = []
        for (let i = 0; i <= TAU; i+=rate) {
            let t = i/TAU
            let r = min+((simplex.noise2D(Math.sin(t*TAU)*TAU, Math.sin(t*TAU)*TAU)+1)/2)*max
            let x = Math.cos(i)*r
            let y = Math.sin(i)*r
            result.push([x, y])
        }
        return result
    }

    let draw_ring = (ctx, points) => {
        ctx.beginPath()
        for (let i = 0; i < points.length; i+=1) {
            if (i === 0) {
                ctx.moveTo(...points[i])
            } else {
                ctx.lineTo(...points[i])
            }
        }
        ctx.closePath()
        ctx.stroke()
    }

    let n = 75
    let rings = []

    for (let r = 0; r <= n; ++r) {
        let t = r/n
        rings.push(make_ring(width*(0.0125+t*1), width*0.095, TAU/(8+Math.floor(t*64))))
    }

    let x = width*clamp(rand(), 0.25, 0.75)
    let y = height*clamp(rand(), 0.25, 0.75)
    return ({ context, width, height }) => {
        context.fillStyle = col(0, 0, 1)
        context.fillRect(0, 0, width, height)

        context.save()
        context.translate(x, y)
        context.lineJoin = "round"
        for (let i = 0; i < rings.length; ++i) {
            let t = i/(rings.length-1)
            context.lineWidth = 0.005+t
            context.strokeStyle = col(0, 0, (t/2))
            draw_ring(context, rings[i])
        }
        context.restore()

    }
}

canvasSketch(sketch, settings)
