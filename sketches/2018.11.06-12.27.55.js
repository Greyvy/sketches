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
            room_size: 32,
            color: col(0, 0, 0),
            room_weights: [20, 20, 20]
        }

        let vars = Object.assign(defaults, options)
        let map
        let mapper
        let _map_update
        let _mapper_update
        let _map_draw

        let setup = () => {
            map = []
            mapper = { pos: [0, 0], type: rand() }
            _map_update = map_update
                .bind(this, mapper, map)
            _mapper_update = mapper_update
                .bind(this, vars.room_size, mapper)
            _map_draw = map_draw
                .bind(this, vars.ctx, vars.room_size, map, vars.color, vars.room_weights)
        }

        let update = (reset_condition) => {
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
                _map_draw()
                vars.ctx.restore()
            }
        }
        setup()
        return { setup, update, draw }
    }

    let mapper_update = (room_size, mapper) => {
        // @TODO(Grey): do this with a vector so I can weight going
        // forward heavier than turning, etc.
        let roll = rand()
        let weights = probably([80, 40, 80, 40])

        if (roll <= weights[0]) {
            // left
            mapper.pos[0] -= room_size
        } else if (roll <= weights[1]) {
            // up
            mapper.pos[1] -= room_size
        } else if (roll <= weights[2]) {
            // right
            mapper.pos[0] += room_size
        } else {
            // down
            mapper.pos[1] += room_size
        }
        mapper.type = rand()
    }

    let path_draw = (ctx, room_size, map) => {
        ctx.save()
        ctx.lineWidth = room_size*0.25
        ctx.beginPath()
        ctx.moveTo(map[0][0], map[0][1])
        for (let i = 1; i < map.length; ++i) {
            ctx.lineTo(map[i][0], map[i][1])
        }
        ctx.stroke()
        ctx.restore()
    }

    let room_draw = (ctx, room_size, x, y, type, spec) => {
        let fill_size = room_size-(room_size*0.25)
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
            ctx.fillStyle = 'hsla(0, 0%, 100%, 1)'
            ctx.fillRect(x_offset, y_offset, spot_size, spot_size)
            ctx.restore()
        } else if (type <= weights[1]) {
            let spot_size = fill_size*0.5
            let x_offset = x-(spot_size/2)
            let y_offset = y-(spot_size/2)
            ctx.save()
            ctx.fillStyle = 'hsla(0, 0%, 25%, 1)'
            ctx.fillRect(x_offset, y_offset, spot_size, spot_size)
            ctx.restore()
        }
    }


    let map_update = (mapper, map) => {
        map.push([mapper.pos[0], mapper.pos[1], mapper.type])
    }

    let map_draw = (ctx, room_size, map, color, spec) => {
        ctx.save()
        ctx.strokeStyle = color
        ctx.fillStyle = color
        path_draw(ctx, room_size, map)
        for (let i = 0; i < map.length; ++i) {
            room_draw(ctx, room_size, ...map[i], spec)
        }
        ctx.restore()
    }


    let m1 = mapper_new({
        ctx: context,
        number_of_rooms: 110,
        room_size: 32,
        color: col(0, 0, 0, 1),
        room_weights: [20, 30, 80]
    })
    let m2 = mapper_new({
        ctx: context,
        number_of_rooms: 50,
        room_size: 32,
        color: col(0, 0, 10, 0.5),
        room_weights: [80, 30, 20]
    })
    let m3 = mapper_new({
        ctx: context,
        number_of_rooms: 25,
        room_size: 32,
        color: col(0, 0, 20, 0.125),
        room_weights: [0, 0, 20]
    })

    return ({ frame, totalFrames, playhead }) => {

        let end = frame%totalFrames === 0
        let done1 = m1.update(end)
        let done2 = m2.update(end)
        let done3 = m3.update(end)
        context.fillStyle = (done1 && done2 && done3) ? col(0, 0, 100) : col(0, 0, 32)
        context.fillRect(0, 0, width, height)
        m1.draw()
        m2.draw()
        m3.draw()

    }
}

canvasSketch(sketch, settings)
