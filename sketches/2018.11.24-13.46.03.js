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

    let seed_value = 42

    let col = (h=0, s=0, l=0, a=1) => `hsla(${h*360}, ${s*100}%, ${l*100}%, ${a})`
    let rand = seed(seed_value)

    let circle = (ctx, x, y, r) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.closePath()
    }

    let particle_update = (ctx, playhead, part) => {
        let pos = part.pos
        let acc = part.acc
        let vel = part.vel
        let positions = part.positions

        if (pos[0] <= 0)      { vel = vec.normal(vec.scale(vec.norm(vel), 5)) }
        if (pos[0] >= width)  { vel = vec.normal(vec.scale(vec.norm(vel), 5)) }
        if (pos[1] <= 0)      { vel = vec.normal(vec.scale(vec.norm(vel), 5)) }
        if (pos[1] >= height) { vel = vec.normal(vec.scale(vec.norm(vel), 5)) }
        let spd = vec.scale(vec.norm(vel), acc)
        vel = vec.add(vec.rotate(vel, Math.sin(playhead*TAU)*0.05), spd)
        pos = vec.add(pos, vel)
        // vel = vec.scale(vec.rotate(vel, 0), 1)
        positions.push([...pos, vec.mag(vel)])

        ctx.save()
        ctx.beginPath()
        for (let i = 0; i < positions.length; ++i) {
            let p = [positions[i][0], positions[i][1]]
            let r = positions[i][2]
            let t = vec.add(p, vec.scale(vec.normal(vec.norm(p)), r))
            if (i === 0) {
                ctx.moveTo(...t)
            } else {
                ctx.lineTo(...t)
            }
        }
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        for (let i = 0; i < positions.length; ++i) {
            let p = [positions[i][0], positions[i][1]]
            let r = positions[i][2]
            let t = vec.add(p, vec.scale(vec.normal(vec.norm(p)), -r))
            if (i === 0) {
                ctx.moveTo(...t)
            } else {
                ctx.lineTo(...t)
            }
        }
        ctx.stroke()
        ctx.restore()

        part.pos = pos
        part.vel = vel
    }

    let particle = {
        vel: [-5, 0],
        acc: 0.05,
        pos: [width/2, height/2],
        positions: []
    }

    return ({ context, playhead }) => {
        context.fillStyle = col()
        context.fillRect(0, 0, width, height)

        context.fillStyle = col(0.5, 0.5, 0.5)
        context.font = '18px monospace'
        context.fillText(vec.mag(particle.vel), 16, 18+16)
        context.strokeStyle = col(0, 0, 1)

        particle_update(context, playhead, particle)

    }
}

canvasSketch(sketch, settings)
