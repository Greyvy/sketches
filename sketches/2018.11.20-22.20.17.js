let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
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

    // Josh Daniel
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

    let point = (min, max, a, tune) => {
        let r = min+((simplex.noise2D(Math.sin(a*tune)*PI, Math.sin(a*tune)*PI)+1)/2)*max
        let rx = Math.cos(a)*r
        let ry = Math.sin(a)*r
        return [rx, ry]
    }

    let x = width*clamp(rand(), 0.25, 0.75)
    let y = height*clamp(rand(), 0.25, 0.75)

    return ({ context, width, height, frame, totalFrames, playhead }) => {

        if (frame%totalFrames === 0) {
            context.fillStyle = col(0, 0, 0)
            context.fillRect(0, 0, width, height)
        }
        context.fillStyle = col(0, 0, 0, Math.pow(playhead, 24))
        context.fillRect(0, 0, width, height)

        context.save()
        context.translate(x, y)
        context.rotate(playhead*PI)
        context.beginPath()

        let n = 16
        for (let r = 0; r <= n; ++r) {
            let t = r/n
            let p = point(width*(0.125+t*1), width*0.095, playhead*PI, 1.5)
            context.fillStyle = col(0, 0, clamp(1-t, 0, 1))
            context.strokeStyle = col(0, 0, clamp(1-t, 0, 1))
            circle(context, ...p, 2+t*24)
            r%2 === 0 ? context.stroke() : context.fill()
        }
        context.restore()

    }
}

canvasSketch(sketch, settings)
