let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*1000) // 42
    let rand = seed(seed_value)

    let lerp = (v0, v1, t) => {
        return (1-t)*v0+t*v1
    }

    let clamp = (v, min, max) => {
        if (v < min) return min
        if (v > max) return max
        return v
    }

    let map = (v, dstart, dend, rstart, rend) => {
        return rstart+(rend-rstart)*((v-dstart)/(dend-dstart))
    }

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

    let diamond = (ctx, playhead, x, y) => {
        ctx.save()
        ctx.fillStyle = fgc()
        ctx.translate(x, y)

        let radius = width*0.175
        let sides = 7
        for (let i = 0; i < Math.floor(playhead*sides); ++i) {
            let x0 = Math.cos(i/sides*TAU)*radius
            let y0 = Math.sin(i/sides*TAU)*radius
            for (let j = 0; j < Math.floor(playhead*sides); ++j) {
                let x1 = Math.cos(j/sides*TAU)*radius
                let y1 = Math.sin(j/sides*TAU)*radius
                draw_sand_line(ctx, [x0, y0], [x1, y1])
            }
        }

        ctx.restore()
    }

    let box = (ctx, playhead, x, y) => {
        ctx.save()
        ctx.fillStyle = fgc()
        ctx.translate(x, y)

        let scaler = 24
        let boxwidth = width*0.25
        for (let i = 0; i < Math.floor(playhead*boxwidth/scaler); ++i) {
            let x0 = (-boxwidth/2)+i*scaler
            let y0 = (-boxwidth/2)+0
            let x1 = (-boxwidth/2)+i*scaler
            let y1 = (-boxwidth/2)+boxwidth

            draw_sand_line(ctx, [x0, y0], [x1, y1])
        }

        ctx.restore()
    }

    let spiral = (ctx, playhead, x, y) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.fillStyle = fgc()

        let radius = width*0.25
        let segments = 80
        let turns = 8
        for (let i = 0; i < Math.floor(playhead*segments); ++i) {
            let segment_per_turn = (segments/turns)
            let angle = (i/segment_per_turn)*TAU
            let rad = (i/segments)*radius
            let x0 = Math.cos(angle)*rad
            let y0 = Math.sin(angle)*rad
            let x1 = Math.cos(angle+(TAU/segment_per_turn))*rad
            let y1 = Math.sin(angle+(TAU/segment_per_turn))*rad

            draw_sand_line(ctx, [x0, y0], [x1, y1])
        }

        ctx.restore()
    }

    let bgc = (o) => `hsla(0, 0%, 80%, ${o||1})`
    let fgc = () => `hsla(0, 0%, 8%, 1)`

    let positions = [
        [
            width*0.25+rand()*width*0.5,
            height*0.25+rand()*height*0.5
        ],
        [
            width*0.25+rand()*width*0.5,
            height*0.25+rand()*height*0.5
        ],
        [
            width*0.25+rand()*width*0.5,
            height*0.25+rand()*height*0.5
        ]
    ]

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = bgc()
        ctx.fillRect(0, 0, width, height)

        let t0 = map(clamp(playhead, 0.15, 0.75), 0.25, 0.75, 0, 1)
        let t1 = map(clamp(playhead, 0.25, 0.85), 0.35, 0.85, 0, 1)
        let t2 = map(clamp(playhead, 0.35, 0.95), 0.45, 0.95, 0, 1)

        diamond(ctx, t0, ...positions[0])
        box(ctx, t1, ...positions[1])
        spiral(ctx, t2, ...positions[2])

    }
}

canvasSketch(sketch, settings)
