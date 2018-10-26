let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 8,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({width, height}) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*1000)
    let rand = seed(seed_value)

    let create_gradient = (ctx, size, stops) => {
        let result = ctx.createLinearGradient(...size)
        for (let i = 0; i < stops.length; ++i) {
            result.addColorStop(stops[i][0], stops[i][1])
        }
        return result
    }


    let l = 1
    let lights = []
    for (let i = 0; i < l; ++i) {
        let x = width/2
        let y = height/2
        lights.push({
            pos: [x, y],
            size: [width*0.0125, width*0.0125]
        })
    }

    let n = 128
    let walls = []
    for (let i = 0; i <= n; ++i) {
        let angle = rand()*TAU

        let angle0 = rand()*TAU
        let angle1 = rand()*TAU
        let rad = 120+(width/2*rand())

        walls.push({
            pos: [0,0],
            size: [
                width*(0.0025+(rand()*0.0125)),
                height*(0.0025+(rand()*0.0125))
            ],
            start: [
                width/2+Math.cos(angle)*(rad),
                height/2+Math.sin(angle)*(rad)
            ],
            end: [
                Math.cos(angle)*(-rad/2),
                Math.sin(angle)*(-rad/2)
            ]
        })
    }

    let shadows = new Array(n*2)

    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'hsla(0, 0%, 95%, 1)'
        ctx.fillRect(0, 0, width, height)

        for (let i = 0; i < walls.length; ++i) {
            let wall = walls[i]

            for (let j = 0; j < lights.length; ++j) {
                let light = lights[j]
                let half_width = wall.size[0]/2
                let half_height = wall.size[1]/2

                let points = [
                    vec.sub(wall.pos, vec.scale(wall.size, 0.5)),
                    [
                        wall.pos[0]-half_width,
                        wall.pos[1]+half_height
                    ],[
                        wall.pos[0]+half_width,
                        wall.pos[1]-half_height
                    ],
                    vec.add(wall.pos, vec.scale(wall.size, 0.5))
                ]

                let options = [
                    [points[0], points[2]],
                    [points[0], points[3]],
                    [points[1], points[2]],
                    [points[1], points[3]]
                ]

                let biggest_dot = [0, 0]
                for (let i = 0; i < options.length; ++i) {
                    let dot = vec.dot(
                        vec.norm(vec.sub(options[i][0], light.pos)),
                        vec.norm(vec.sub(options[i][1], light.pos))
                    )
                    if (i === 0) {
                        biggest_dot[0] = i
                        biggest_dot[1] = dot
                    }
                    if (dot < biggest_dot[1]) {
                        biggest_dot[0] = i
                        biggest_dot[1] = dot
                    }
                }

                let result = options[biggest_dot[0]]

                shadows[i+i] = result[0]
                shadows[i+i+1] = result[1]

            }
        }

        for (let i = 0; i < shadows.length; i += 2) {
            let shadow0 = shadows[i]
            let shadow1 = shadows[i+1]
            let shadow_length = 20+vec.dist(lights[0].pos, shadow0)*0.5

            let compose_edge = (shadow, light_pos, length) => {
                return vec.add(
                    shadow,
                    vec.scale(vec.norm(vec.sub(shadow, light_pos)), length)
                )
            }

            let edge0 = compose_edge(shadow0, lights[0].pos, shadow_length)
            let edge1 = compose_edge(shadow1, lights[0].pos, shadow_length)

            ctx.globalCompositeOperation = 'multiply'
            let gradient = create_gradient(
                ctx,
                [...shadow0, ...edge0],
                [
                    [0, 'hsla(0, 0%, 5%, 1)'],
                    [0.75, 'hsla(0, 0%, 100%, 0)']
                ]
            )

            ctx.save()
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.moveTo(...shadow0)
            ctx.lineTo(...edge0)
            ctx.lineTo(...edge1)
            ctx.lineTo(...shadow1)
            ctx.closePath()
            ctx.fill()
            ctx.restore()

            ctx.globalCompositeOperation = 'source-over'
        }

        for (let i = 0; i < walls.length; ++i) {
            let wall = walls[i]
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 90%, 1)'
            ctx.fillRect(
                wall.pos[0]-wall.size[0]/2,
                wall.pos[1]-wall.size[1]/2,
                wall.size[0],
                wall.size[1]
            )
            ctx.restore()

            wall.pos = vec.add(
                wall.start, vec.scale(wall.end, Math.sin(playhead*PI)))
        }

        for (let i = 0; i < lights.length; ++i) {
            let half = width/2
            let quarter = half/2
            let light = lights[i]
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 10%, 1)'
            ctx.beginPath()
            ctx.arc(...light.pos, light.size[0]+(light.size[0]*Math.sin(playhead*PI)), 0, TAU)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
        }

    }
}

canvasSketch(sketch, settings)

