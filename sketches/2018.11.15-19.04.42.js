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


    let point_in_tri = (px, py, x1, y1, x2, y2, x3, y3) => {
        let ax = x1-px
        let ay = y1-py
        let bx = x2-px
        let by = y2-py
        let cx = x3-px
        let cy = y3-py
        let sab = ax*by-ay*bx<0
        if (sab !== (bx*cy-by*cx<0)) {
            return false
        }
        return sab === (cx*ay-cy*ax<0)
    }


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
    let light_source = []
    let lights = []

    let segments = 24
    for (let l = 0; l < segments; ++l) {
        let t = l/(segments-1)
        light_source.push([
            lerp(width*0.25, width*0.75, t),
            lerp(height, height*0.75, 0.5-(Math.pow(Math.abs(0.5-t), 1))*2)
        ])
    }

    /*
    let segments = 8
    for (let l = 0; l < segments; ++l) {
        light_source.push([
            lerp(width*0.35, width*0.65, l/segments),
            lerp(height*0.35, height*0.35, l/segments)
        ])
    }

    for (let l = 0; l < segments; ++l) {
        light_source.push([
            lerp(width*0.65, width*0.65, l/segments),
            lerp(height*0.35, height*0.65, l/segments)
        ])
    }

    for (let l = 0; l < segments; ++l) {
        light_source.push([
            lerp(width*0.35, width*0.65, l/segments),
            lerp(height*0.65, height*0.65, l/segments)
        ])
    }

    for (let l = 0; l < segments; ++l) {
        light_source.push([
            lerp(width*0.35, width*0.35, l/segments),
            lerp(height*0.35, height*0.65, l/segments)
        ])
    }
    */

    return ({ context, playhead }) => {

        context.fillStyle = col(0, 0, 0.1)
        context.fillRect(0, 0, width, height)

        /*
        let final_light_matrix = light_matrix
            .translate(-width/2, -height/2)
            .rotate(playhead*TAU)
            .translate(width/2, height/2)
            .get()
        */
        let light_matrix = vec.matrixBuilder(vec.createMatrix())
        let final_light_matrix = light_matrix
            .translate(0, Math.sin(playhead*(PI/2))*-height)
            .get()
        for (i = 0; i < light_source.length; ++i) {
            lights[i] = vec.transform(light_source[i], final_light_matrix)
        }

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
            let lighting_triangle
            for (let i = 0; i < lights.length; ++i) {
                lighting_triangle = point_in_tri(
                    ...lights[i],
                    ...triangle[0],
                    ...triangle[1],
                    ...triangle[2])
                if (lighting_triangle) break;
            }

            let fill = lighting_triangle ? col(0, 0, 1) : col(0, 0, 0)
            // let fill = col(0, 0, t)
            // @NOTE(Grey): Rotate and scale are real nutty here
            context.save()
            context.lineWidth = 8
            context.strokeStyle = col(0, 0, 0.1)
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
            for (let i = 0; i < lights.length; ++i) {
                context.save()
                context.fillStyle = col(0, 0.5, 0.5, 1)
                draw_circle(context, ...lights[i], 4)
                context.fill()
                context.restore()
            }
            */

        }

        quads = []
    }
}

canvasSketch(sketch, settings)
