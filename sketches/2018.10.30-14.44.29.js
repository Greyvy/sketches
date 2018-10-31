let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 8,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context: ctx, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*10000)
    let rand = seed(seed_value)

    let lerp = (v0, v1, t) => (1 - t) * v0 + t * v1

    let draw_sand_line = (ctx, p0, p1) => {
        let scale = vec.dist(p0, p1)*0.125
        let n_of_samples = scale+Math.floor(rand()*scale)
        for (let i = 0; i <= n_of_samples; ++i) {
            let t_sample = i/n_of_samples
            let point = [
                lerp(p0[0], p1[0], t_sample),
                lerp(p0[1], p1[1], t_sample)
            ]
            let radius = 1+(Math.pow(rand(), 8)*2)
            ctx.beginPath()
            ctx.arc(...point, radius, 0, TAU)
            ctx.closePath()
            ctx.fill()
        }
    }

    let bgc = a => `hsla(0, 0%, 80%, ${a})`
    let fgc = a => `hsla(0, 0%, 8%, ${a})`

    ctx.fillStyle = bgc(1)
    ctx.fillRect(0, 0, width, height)

    return ({
        context: ctx,
        width, height,
        frame, totalFrames, playhead
    }) => {

        if (frame%totalFrames === 0) {
            ctx.fillStyle = bgc(1)
            ctx.fillRect(0, 0, width, height)
        }

        ctx.fillStyle = bgc(Math.pow(playhead, 16))
        ctx.fillRect(0, 0, width, height)

        ctx.save()
        ctx.translate(width/2, height/2)
        // ctx.rotate(playhead*TAU)

        /*
        let angle0 = playhead*TAU
        let angle1 = playhead*TAU+(angle0*PI)
        // let radius = width*0.35
        // let radius = lerp(width*0.10, width*0.25, (playhead-1)*2)
        // let radius = (width*0.10)+((Math.sin(playhead*TAU)+1)/2*(width*0.35))
        // let radius = (width*0.10)+(Math.pow(Math.sin(playhead*PI), 0.25)*(width*0.15))
        let radius = (Math.sin(playhead*PI)*(width*0.25))
        let p0 = [Math.cos(angle0)*radius, Math.sin(angle0)*radius]
        let p1 = [Math.cos(angle1)*radius, Math.sin(angle1)*radius]

        ctx.save()
        ctx.fillStyle = fgc(1)
        draw_sand_line(ctx, p0, p1)
        ctx.restore()
        */

        /*
        let p0 = [playhead*-width*0.45, 0]
        let p1 = [Math.pow(playhead, 0.5)*-width*0.45, playhead*-height*0.45]

        let p2 = [playhead*width*0.45, 0]
        let p3 = [Math.pow(playhead, 0.5)*width*0.45, playhead*height*0.45]

        ctx.save()
        ctx.fillStyle = fgc(1)
        draw_sand_line(ctx, p0, p1)
        ctx.restore()

        ctx.save()
        ctx.fillStyle = fgc(1)
        draw_sand_line(ctx, p2, p3)
        ctx.restore()
        */

        let t_PI = Math.sin(playhead*PI)
        let t_TAU = Math.sin(playhead*TAU)

        let p0 = [t_PI*(-width*0.25), -height*0.125+(t_PI*height*0.125)]
        let p1 = [Math.pow(1+t_TAU/2, 0.75)*-width*0.125, t_PI*(-height*0.25)]
        let p2 = [t_PI*(width*0.25), height*0.125-(t_PI*height*0.125)]
        let p3 = [Math.pow(1+t_TAU/2, 0.75)*width*0.125, t_PI*(height*0.25)]
        // let p2 = [t_TAU*width*0.25, height*0.25-t_TAU*height*0.0125]
        // let p3 = [Math.pow(1+playhead, 0.75)*width*0.25, t_TAU*height*0.5]

        ctx.save()
        ctx.fillStyle = fgc(1)
        draw_sand_line(ctx, p0, p1)
        ctx.restore()

        ctx.save()
        ctx.fillStyle = fgc(1)
        draw_sand_line(ctx, p2, p3)
        ctx.restore()
    }
}

canvasSketch(sketch, settings)

