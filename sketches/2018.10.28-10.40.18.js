let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    // animate: true,
    // duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*10000)
    let rand = seed(seed_value)

    let lerp = (v0, v1, t) => (1 - t) * v0 + t * v1

    let dist = width*0.5
    let scale = dist*0.125
    let n_of_lines = scale+Math.floor(rand()*scale)
    let lines = []
    for (let j = 0; j <= n_of_lines; ++j) {
        let t_line = j/n_of_lines
        let rand_angle_scale0 = Math.log(rand())
        let rand_angle_scale1 = rand()
        let n_of_samples = scale+Math.floor(rand()*scale)
        let line = []

        let p0 = [
            width/2+(Math.cos(rand_angle_scale0*TAU)*((width/4)*rand())),
            width/2+(Math.sin(rand_angle_scale0*TAU)*((width/4)*rand()))
            // width/4,
            // height/4+(height/2*Math.pow(t_line, (rand()*8)+1))
        ]
        let p1 = [
            width/2+(Math.cos(rand_angle_scale1*TAU)*((width/4)*rand())),
            width/2+(Math.sin(rand_angle_scale1*TAU)*((width/4)*rand()))
            // width/4+Math.pow(t_line, rand()*t_line+1)*width/2
            // width/4+width/2,
            // height/4+(height/2*Math.log(rand()*t_line+1))
        ]

        for (let i = 0; i <= n_of_samples; ++i) {
            let t_sample = i/n_of_samples
            let point = [
                lerp(p0[0], p1[0], t_sample),
                lerp(p0[1], p1[1], t_sample)
            ]
            let radius = 1+(rand()*rand()*rand()*rand()*rand()*8)
            line.push([point, radius])
        }
        lines.push(line)
    }


    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
        ctx.fillRect(0, 0, width, height)

        // ctx.globalCompositeOperation = 'multiply'
        ctx.save()
        ctx.translate(width/2, height/2)
        ctx.scale(1.5, 1.5)
        ctx.fillStyle = 'hsla(0, 0%, 20%, 1)'
        ctx.strokeStyle = 'hsla(0, 0%, 20%, 1)'
        ctx.lineWidth = 0.75
        for (let j = 0; j < lines.length; ++j) {
            let line = lines[j]
            // @NOTE(Grey): Because these rolls are done in the sketch saving
            // is somewhat unpredictable, should try to move it out
            if (rand() >= 0.5) {
                for (let i = 0; i < line.length; ++i) {
                    let point = [
                        line[i][0][0]-width/2,
                        line[i][0][1]-height/2
                    ]
                    let radius = line[i][1]
                    ctx.beginPath()
                    ctx.arc(...point, radius, 0, TAU)
                    ctx.closePath()
                    if (rand() >= 0.5) {
                        ctx.fill()
                    } else {
                        ctx.stroke()
                    }
                }
            } else {
                ctx.beginPath()
                ctx.moveTo(line[0][0][0]-width/2, line[0][0][1]-height/2)
                ctx.lineTo(line[line.length-1][0][0]-width/2, line[line.length-1][0][1]-height/2)
                ctx.stroke()
            }
        }
        ctx.restore()
        ctx.globalCompositeOperation = 'source-over'

    }
}

canvasSketch(sketch, settings)
