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

    let seed_value = Math.floor(Math.random()*1000)
    let rand = seed(seed_value)

    let lerp = (v0, v1, t) => (1-t)*v0+t*v1
    let clamp = (v, min, max) => v < min ? min : v > max ? max : v
    let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))


    let quad = (points) => {
        let x = points[0]
        let y = points[1]
        let w = points[2]
        let h = points[3]
        return [
            [[x, y], [w, y], [x, h]],
            [[w, y], [w, h], [x, h]]
        ]
    }

    let draw_tri = (ctx, points) => {
        ctx.beginPath()
        ctx.moveTo(...points[0])
        ctx.lineTo(...points[1])
        ctx.lineTo(...points[2])
        ctx.closePath()
    }

    let tri_center = (points) => {
        let x = (points[0][0]+points[1][0]+points[2][0])/3
        let y = (points[0][1]+points[1][1]+points[2][1])/3
        return [x, y]
    }

    let draw_circle = (ctx, x, y, r) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.closePath()
    }


    let col = (h = 0, s = 0, l = 0, a = 1) => {
        return `hsla(${h*360}, ${s*100}%, ${l*100}%, ${a})`
    }

    let quads = []
    let light = [width*0.75, height*0.5]

    return ({ context, playhead }) => {
        context.fillStyle = col(0, 0, 0.9)
        context.fillRect(0, 0, width, height)

        light[0] = width/2+Math.cos(playhead*TAU)*(width*0.25)
        light[1] = height/2+Math.sin(playhead*TAU)*(width*0.25)

        // let stride = (8+8)+Math.floor(Math.sin(playhead*TAU*4)*8)
        let stride = 16
        for (let i = 0; i < stride*stride; ++i) {
            let w = width*0.5/stride
            let h = height*0.5/stride
            let x = width*(0.5/2)+(i%stride)*w;
            let y = height*(0.5/2)+Math.floor(i/stride)*h;
            quads.push(...quad([x,y,x+w,y+h]))
        }

        for (i = 0; i < quads.length; ++i) {
            let ph = Math.pow(Math.sin(playhead*PI), 2)
            let bi = (i/quads.length)
            let t = map(clamp(ph, bi, 1), bi, 1, 0, 1)

            let triangle = quads[i]
            let center = tri_center(triangle)

            let fill = col(0, 0, (vec.dist(center, light)/256)*t)

            // @NOTE(Grey): Rotate and scale are real nutty here
            context.save()
            context.lineWidth = 12
            context.strokeStyle = col(0, 0, 0.9)
            context.fillStyle = fill
            draw_tri(context, triangle);
            context.fill()
            context.stroke()
            context.restore()

            /*
             * Debug
            context.save()
            context.fillStyle = col(0, 0.5, 0.5, 1)
            draw_circle(context, ...center, 4)
            context.fill()
            context.restore()
            */

        }

        quads = []
    }
}

canvasSketch(sketch, settings)

