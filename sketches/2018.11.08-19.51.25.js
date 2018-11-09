let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    animate: true,
    duration: 4,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let seed_value = Math.floor(Math.random()*1000)// 42
    let rand = seed(seed_value)

    let col = (h=0, s=0, l=0, a=1) => `hsla(${h}, ${s}%, ${l}%, ${a})`

    let probably = (probabilities) => {
        let total = probabilities.reduce((acc, v) => acc+v)
        let result = []
        let sum = 0
        for (let i = 0; i < probabilities.length; ++i) {
            sum += probabilities[i]/total
            result.push(sum)
        }
        return result
    }


    let mapper_new = (options) => {
    // ctx, number_of_rooms, room_size, color, room_weighting) => {
        let defaults = {
            ctx: context,
            number_of_rooms: 55,
            room_sizes: [32, 64, 128],
            color: col(0, 0, 0),
            room_weights: [20, 20, 20],
            direction_weights: [80, 80, 80, 80]
        }

        let vars = Object.assign(defaults, options)
        let map
        let mapper
        let frame = 0
        let t = 0
        let _map_update
        let _mapper_update
        let _map_draw

        let setup = () => {
            map = []
            mapper = { pos: [0, 0], room_size: vars.room_sizes[0], type: rand() }
            _map_update = map_update
                .bind(this, mapper, map)
            _mapper_update = mapper_update
                .bind(this, vars.room_sizes, vars.direction_weights, mapper)
            _map_draw = map_draw
                .bind(this, vars.ctx, map, vars.color)
        }

        let update = (reset_condition) => {
            frame++
            t = frame/map.length
            let is_done = map.length < vars.number_of_rooms ? false : true

            if (reset_condition) {
                setup()
            }

            if (is_done) {
                return true
            } else {
                _mapper_update()
                _map_update()
            }

            return false
        }

        let draw = () => {
            if (map.length) {
                vars.ctx.save()
                vars.ctx.translate(width/2, height/2)
                _map_draw([
                    vars.room_weights[0],
                    vars.room_weights[1],
                    vars.room_weights[2]+(80*t)
                ])
                vars.ctx.restore()
            }
        }
        setup()
        return { setup, update, draw }
    }

    let mapper_update = (room_sizes, spec, mapper) => {
        // @TODO(Grey): do this with a vector so I can weight going
        // forward heavier than turning, etc.
        let roll = rand()
        let direction_weights = probably(spec)
        let size_weights = probably([90, 4, 2])

        if (roll <= direction_weights[0]) {
            // left
            mapper.pos[0] -= mapper.room_size
        } else if (roll <= direction_weights[1]) {
            // up
            mapper.pos[1] -= mapper.room_size
        } else if (roll <= direction_weights[2]) {
            // right
            mapper.pos[0] += mapper.room_size
        } else {
            // down
            mapper.pos[1] += mapper.room_size
        }

        if (roll <= size_weights[0]) {
            mapper.room_size = room_sizes[0]
        } else if (roll <= size_weights[1]) {
            mapper.room_size = room_sizes[1]
        } else {
            mapper.room_size = room_sizes[2]
        }

        mapper.type = rand()
    }

    let path_draw = (ctx, map) => {
        ctx.save()
        ctx.lineWidth = 16
        ctx.beginPath()
        ctx.moveTo(map[0].pos[0], map[0].pos[1])
        for (let i = 1; i < map.length; ++i) {
            ctx.lineTo(map[i].pos[0], map[i].pos[1])
        }
        ctx.stroke()
        ctx.restore()
    }

    let room_draw = (ctx, room_size, x, y, type, spec) => {
        let fill_size = room_size//-(room_size*0.25)
        let x_offset = x-(fill_size/2)
        let y_offset = y-(fill_size/2)

        ctx.save()
        ctx.fillRect(x_offset, y_offset, fill_size, fill_size)
        ctx.restore()

        let weights = probably(spec)
        if (type <= weights[0]) {
            let spot_size = fill_size*0.25
            let x_offset = x-(spot_size/2)
            let y_offset = y-(spot_size/2)
            ctx.save()
            ctx.fillStyle = col(0, 0, 0)
            ctx.fillRect(x_offset, y_offset, spot_size, spot_size)
            ctx.restore()
        } else if (type <= weights[1]) {
            let spot_size = fill_size*0.5
            let x_offset = x-(spot_size/2)
            let y_offset = y-(spot_size/2)
            ctx.save()
            ctx.fillStyle = col(0, 0, 25)
            ctx.fillRect(x_offset, y_offset, spot_size, spot_size)
            ctx.restore()
        }
    }


    let map_update = (mapper, map) => {
        map.push({
            pos: [mapper.pos[0], mapper.pos[1]],
            room_size: mapper.room_size,
            type: mapper.type
        })
    }

    let map_draw = (ctx, map, color, spec) => {
        ctx.save()
        ctx.strokeStyle = color
        ctx.fillStyle = color
        path_draw(ctx, map)
        for (let i = 0; i < map.length; ++i) {
            room_draw(
                ctx,
                map[i].room_size,
                ...map[i].pos,
                map[i].type,
                spec
            )
        }
        ctx.restore()
    }


    let maps = [
        mapper_new({
            ctx: context,
            number_of_rooms: 15,
            room_sizes: [32, 24, 16],
            color: col(0, 0, 100),
            room_weights: [40, 40, 40],
            direction_weights: [2, 2, 2, 0]
        }),
        mapper_new({
            ctx: context,
            number_of_rooms: 15,
            room_sizes: [32, 32, 32],
            color: col(0, 0, 100),
            room_weights: [8, 40, 20],
            direction_weights: [0, 2, 2, 2]
        }),
        mapper_new({
            ctx: context,
            number_of_rooms: 15,
            room_sizes: [32, 64, 128],
            color: col(0, 0, 100),
            room_weights: [60, 60, 20],
            direction_weights: [2, 2, 2, 2]
        })
    ]

    return ({ frame, totalFrames, playhead }) => {

        let maps_done = []
        let end = frame%totalFrames === 0
        for (let i = 0; i < maps.length; ++i) {
            maps_done.push(maps[i].update(end))
        }
        let all_done = maps_done.indexOf(true) >= 0
        // context.fillStyle = col(0, 0, 60+Math.sin(playhead*PI)*20)
        context.fillStyle = col(0, 0, 10)
        context.fillRect(0, 0, width, height)
        for (let i = 0; i < maps.length; ++i) {
            maps[i].draw()
        }
        // context.fillStyle = (done1 && done2 && done3) ? col(0, 0, 100) : col(0, 0, 10)

    }
}

canvasSketch(sketch, settings)
