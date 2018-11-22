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

    let point = (min, max, ph, a, tune) => {
        let nx = (Math.sin(a)*PI)*tune
        let ny = (Math.sin(a)*PI)*tune
        let r = map(simplex.noise3D(nx, ny, ph), -1, 1, min, max)
        // let r = min+((simplex.noise2D(Math.sin(a*tune)*PI, Math.sin(a*tune)*PI)+1)/2)*max
        return [Math.cos(a)*r, Math.sin(a)*r]
    }

    let x = width*clamp(rand(), 0.25, 0.75)
    let y = height*clamp(rand(), 0.25, 0.75)

    return ({ context, width, height, frame, totalFrames, playhead }) => {

        context.fillStyle = col(0, 0, 0)
        context.fillRect(0, 0, width, height)

        /*
        let s = 32
        let n = 32
        for (let i = 0; i <= s; ++i) {
            context.save()
            context.translate(x, y)
            context.rotate((i/s)*PI)
            for (let r = 0; r <= n; ++r) {
                let t = r/n
                let p = point(width*(0.125+t*1), width*0.095, Math.sin(playhead*PI), (i/s)*PI, 4)
                context.fillStyle = col(0, 0, clamp(1-t, 0, 1))
                context.strokeStyle = col(0, 0, clamp(1-t, 0, 1))
                circle(context, ...p, 2+t*24)
                context.stroke()
            }
            context.restore()
        }
        */

        context.save()
        context.translate(x, y)
        let s = 8
        let n = 32
        for (let i = 0; i <= s; ++i) {
            let q = i/s;

            let min = width*(0.025+q)
            let max = width*0.0095

            let rp = point.bind(this, min, max, Math.pow(Math.sin(playhead*PI), 12))
            let tune = 0.25+Math.sin(playhead*PI)

            context.rotate(0)
            context.beginPath()

            context.moveTo(...rp(0, tune))
            for (let r = 0; r <= n; ++r) {
                let t = r/n
                context.rotate(TAU/n)

                context.strokeStyle = col(0, 0, 1)
                context.lineTo(...rp(t*TAU, tune))
            }
            context.closePath()
            context.stroke()

        }
        context.restore()


    }
}

canvasSketch(sketch, settings)

