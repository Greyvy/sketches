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


    let box = (points) => {
        let x = points[0]
        let y = points[1]
        let w = points[2]
        let h = points[3]
        return [
            [[x, y], [w, y], [x, h]],
            [[w, y], [w, h], [x, h]]
        ]
    }

    let tri = (ctx, points) => {
        ctx.beginPath()
        ctx.moveTo(...points[0])
        ctx.lineTo(...points[1])
        ctx.lineTo(...points[2])
        ctx.closePath()
    }

    let circle = (ctx, x, y, r) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.closePath()
    }

    let boxes = []
    let stride = 32;
    for (let i = 0; i < stride*stride; ++i) {
        let w = width*0.5/stride
        let h = height*0.5/stride
        let x = width*0.25+(i%stride)*w;
        let y = height*0.25+Math.floor(i/stride)*h;
        boxes.push(...box([x,y,x+w,y+h]))
    }

    let state = []
    for (let i = 0; i < boxes.length; ++i) {
        let x = width*0.25+(rand()*width*0.5)
        let y = height*0.25+(rand()*height*0.5)
        let r = rand()*TAU
        let s = 1+(rand()*1)
        state.push([x, y, r, s])
    }

    let col = (h = 0, s = 0, l = 0, a = 1) => {
        return `hsla(${h*360}, ${s*100}%, ${l*100}%, ${a})`
    }

    return ({ context, playhead }) => {
        context.fillStyle = col()
        context.fillRect(0, 0, width, height)

        for (i = 0; i < boxes.length; ++i) {
            let ph = Math.pow(Math.sin(playhead*PI), 2)
            let bi = (i/boxes.length)
            let t = map(clamp(ph, bi, 1), bi, 1, 0, 1)
            let box = boxes[i]
            let st = state[i]

            context.save()
            context.lineWidth = 1
            context.fillStyle = col(0, 0, 1)
            context.strokeStyle = col(0, 0, 1)
            context.translate(lerp(box[0][0], st[0], t), lerp(box[0][1], st[1], t))
            context.rotate(lerp(0, st[2], t))
            context.scale(lerp(1, st[3], t), lerp(1, st[3], t))

            let boxsize = [(width*0.5/stride), (height*0.5/stride)]
            let v1, v2, v3
            if (i%2 === 0) {
                v1 = [0, 0]
                v2 = [0, boxsize[1]]
                v3 = [boxsize[0], 0]
            } else {
                v1 = [boxsize[0]-boxsize[0], 0]
                v2 = [-boxsize[0], boxsize[1]]
                v3 = [0, boxsize[1]]
            }

            tri(context, [v1, v2, v3])
            context.fill()
            context.stroke()
            //i%2 === 0 ? context.stroke() : context.fill()

            /*
             * Debug
            context.save()
            context.fillStyle = col(0, 0.5, 0.5)
            circle(context, ...v1, 16)
            context.fill()
            context.restore()

            context.save()
            context.fillStyle = col(0.5, 0.5, 0.5)
            circle(context, ...v2, 16)
            context.fill()
            context.restore()

            context.save()
            context.fillStyle = col(0.75, 0.5, 0.5)
            circle(context, ...v3, 16)
            context.fill()
            context.restore()
            */


            context.restore()
        }
    }
}

canvasSketch(sketch, settings)
