let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({width, height}) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*1000)
    let rand = seed(seed_value)

    let l = 3
    let lights = []
    for (let i = 0; i <= l; ++i) {
        let x = width/2+Math.cos(i/l*TAU)*(width/2-128)
        let y = width/2+Math.sin(i/l*TAU)*(width/2-128)
        lights.push({
            pos: [x, y],
            size: [width*0.025, width*0.025]
        })
    }

    let n = 32
    let walls = []
    for (let i = 0; i <= n; ++i) {
        walls.push({
            pos: [
                0, 0
            ],
            size: [
                width*(rand()*0.05),
                height*(rand()*0.05)
            ],
            offsets: [
                width*0.125+rand()*width*0.75,
                i<n/2
                    ? height*0.125+rand()*height*0.75
                    : -height+height*0.125+rand()*height*0.75
            ]
        })
    }

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        for (let i = 0; i < walls.length; ++i) {
            let wall = walls[i]

            for (let j = 0; j < lights.length; ++j) {
                let light = lights[j]
                let points = [
                    [
                        wall.pos[0]-wall.size[0]/2,
                        wall.pos[1]-wall.size[1]/2
                    ],[
                        wall.pos[0]+wall.size[0]/2,
                        wall.pos[1]-wall.size[1]/2
                    ],[
                        wall.pos[0]-wall.size[0]/2,
                        wall.pos[1]+wall.size[1]/2
                    ],[
                        wall.pos[0]+wall.size[0]/2,
                        wall.pos[1]+wall.size[1]/2
                    ]
                ]

                ctx.save()
                ctx.strokeStyle = 'hsla(0, 0%, 70%, 1)'
                ctx.beginPath()
                for (let p = 0; p < points.length; ++p) {
                    ctx.moveTo(...points[p])
                    ctx.lineTo(...light.pos)
                }
                ctx.stroke()
                ctx.restore()

            }
        }

        for (let i = 0; i < walls.length; ++i) {
            let wall = walls[i]
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 30%, 1)'
            ctx.fillRect(
                wall.pos[0]-wall.size[0]/2,
                wall.pos[1]-wall.size[1]/2,
                wall.size[0],
                wall.size[1]
            )
            ctx.restore()
            wall.pos[0] = wall.offsets[0]
            wall.pos[1] = wall.offsets[1]+Math.sin(playhead*PI)*height
        }

        for (let i = 0; i < lights.length; ++i) {
            let half = width/2
            let light = lights[i]
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 10%, 1)'
            ctx.beginPath()
            ctx.arc(...light.pos, light.size[0], 0, TAU)
            ctx.closePath()
            ctx.fill()
            ctx.restore()

            let n = i/lights.length
            light.pos[0] = half+Math.sin(playhead*TAU+(n*PI))*(half-128)
            light.pos[1] = half+Math.cos(playhead*TAU+(i*PI))*(half-128)
        }

    }
}

canvasSketch(sketch, settings)
