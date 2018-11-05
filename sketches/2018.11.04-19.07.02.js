let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context: ctx, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*1000)// 42
    let rand = seed(seed_value)

    let room_size = 32
    let map = []
    let mapper = { pos: [0, 0], type: rand() }

    let update_map = (mapper, map) => {
        map.push([mapper.pos[0], mapper.pos[1], mapper.type])
    }

    let update_mapper = (roll, mapper) => {
        // @TODO(Grey): do this with a vector so I can weight going
        // forward heavier than turning, etc.
        let probabilities = [80, 40, 80, 40]
        let total = probabilities.reduce((acc, v) => acc+v)
        let spec = probabilities.map(v => v/total)

        if (roll <= spec[0]) {
            // left
            mapper.pos[0] -= room_size
        } else if (roll <= spec[0]+spec[1]) {
            // up
            mapper.pos[1] -= room_size
        } else if (roll <= spec[0]+spec[1]+spec[2]) {
            // right
            mapper.pos[0] += room_size
        } else {
            // down
            mapper.pos[1] += room_size
        }
        mapper.type = rand()
    }

    let draw_path = (ctx, map) => {
        ctx.save()
        ctx.lineWidth = 8
        ctx.strokeStyle = 'black'
        ctx.beginPath()
        ctx.moveTo(map[0][0], map[0][1])
        for (let i = 1; i < map.length; ++i) {
            ctx.lineTo(map[i][0], map[i][1])
        }
        ctx.stroke()
        ctx.restore()
    }

    let draw_room = (ctx, x, y, type) => {
        let fill_size = room_size-8
        let x_offset = x-(fill_size/2)
        let y_offset = y-(fill_size/2)

        ctx.save()
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.fillRect(x_offset, y_offset, fill_size, fill_size)
        ctx.restore()

        if (type > 0.85) {
            let spot_size = fill_size*0.25
            let x_offset = x-(spot_size/2)
            let y_offset = y-(spot_size/2)
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
            ctx.fillRect(x_offset, y_offset, spot_size, spot_size)
            ctx.restore()
        }
    }

    let draw_map = (ctx, map) => {
        draw_path(ctx, map)
        for (let i = 0; i < map.length; ++i) {
            draw_room(ctx, ...map[i])
        }
    }

    return ({ context: ctx, width, height, frame, totalFrames, playhead }) => {
        ctx.fillStyle = 'hsla(0, 0%, 32%, 1)'
        ctx.fillRect(0, 0, width, height)

        if (frame%totalFrames === 0) {
            map = []
            mapper = { pos: [0, 0], type: rand() }
        }

        ctx.save()
        ctx.translate(width/2, height/2)
        // ctx.scale(20-(playhead*20), 20-(playhead*20))
        // ctx.rotate(playhead*TAU)
        update_mapper(rand(), mapper)
        update_map(mapper, map)
        draw_map(ctx, map)
        ctx.restore()

    }
}

canvasSketch(sketch, settings)

