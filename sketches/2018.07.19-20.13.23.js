// @REF(Grey): http://allenchou.net/2015/04/game-math-precise-control-over-numeric-springing/

let canvasSketch = require('canvas-sketch');

let settings = {
    animation: true,
    duration: 3,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2


    /*
     * @NOTE(Grey): full version with value and target value
     * data  = { val, valt, vel }
     * zeta  = damping ratio
     * omega = angular frequency
     * dt    = time step
     */
    let Spring = (data, zeta, omega, dt) => {
        let f = 1.0 + 2.0 * dt * zeta * omega
        let tt = dt * dt
        let oo = omega * omega
        let too = dt * oo
        let ttoo = dt * too
        let detInv = 1.0 / (f + ttoo)
        let detVal = f * data.val + dt * data.vel + ttoo * data.valt
        let detVel = data.vel + too * (data.valt - data.val)
        data.val = detVal * detInv
        data.vel = detVel * detInv
    }

    /*
     * @NOTE(Grey): A simple version that just does a value with a velocity
     */
    let spring = (data, zeta, omega, dt) => {
        data.vel = (1.0 - 2.0 * dt * zeta * omega) * data.vel - dt * omega * omega * data.val
        data.val = data.val + data.vel * dt
    }

    /*
     * @NOTE(Grey): Unstable with a zeta over 1.0 and an omega over 10pi
     */
    let SpringSemiImplicitEuler = (data, zeta, omega, dt) => {
        data.vel += -2 * dt * zeta * omega * data.vel
            + dt * omega * omega * (data.valt - data.val)
        data.val += dt * data.vel
    }

    /*
     * @NOTE(Grey lambda is the halflife of the spring
     */
    let SpringByHalfLife = (data, omega, dt, lambda) => {
        let zeta = -Math.log(0.5) / (omega * lambda)
        Spring(data, zeta, omega, h)
    }


    let block = {
        x: -64,
        y: -64,
        w: 128,
        h: 128
    }

    let m_data = {
        val: 1,
        vel: 0
    }

    let m_slide = {
        val: 0,
        vel: 0,
        valt: width * 0.5
    }

    return ({ context: ctx, width, height, playhead, frame }) => {
        ctx.fillStyle = `hsla(300, 80%, 95%, 1)`
        ctx.fillRect(0, 0, width, height)

        if (frame === 0) {
            m_data.val = 1
            m_data.vel = 0
        }

        // @NOTE(Grey): We can keep updating the value and the system
        // gracefully continues, which is kind of super duper nice
        if (frame === 0) {
            m_slide.valt = Math.random() * (width * 0.25)
        }

        spring(m_data, 0.25, 4 * PI, 0.016)
        Spring(m_slide, 0.15, 2 * PI, 3/1000)

        // @NOTE(Grey): Dynamically updated box
        ctx.save()
        ctx.fillStyle = `hsla(0, 0%, 0%, 1)`
        ctx.translate(m_slide.val, 30)
        // ctx.fillRect(0, 0, 32, 32)
        ctx.font = '24px sans-serif'
        // ctx.fillText(m_slide.val, 0, 64)
        ctx.restore()


        let qh = height * 0.25

        let h = 200 + ((m_data.val + 1) * 80)
        let s = 20 + ((1 - m_data.val) * 80)
        let l = 60 + (m_data.val + 1) * 10

        ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, 1)`
        ctx.save()
        ctx.translate(width / 2, height / 2)
        ctx.scale(1 - m_data.val, m_data.val + 1)

        ctx.fillRect(block.x, block.y, block.w, block.h)
        ctx.restore()

        ctx.save()
        ctx.translate((width / 2) + 200, (height / 2) + 200)
        ctx.scale(1 - m_data.val, m_data.val + 1)
        ctx.fillRect(block.x * 0.5, block.y * 0.5, block.w * 0.5, block.h * 0.5)
        ctx.restore()

        ctx.save()
        ctx.translate((width / 2) - 200, (height / 2) + 200)
        ctx.scale(1 - m_data.val, m_data.val + 1)
        ctx.fillRect(block.x * 0.5, block.y * 0.5, block.w * 0.5, block.h * 0.5)
        ctx.restore()

        ctx.save()
        ctx.translate((width / 2) - 200, (height / 2) - 200)
        ctx.scale(1 - m_data.val, m_data.val + 1)
        ctx.fillRect(block.x * 0.5, block.y * 0.5, block.w * 0.5, block.h * 0.5)
        ctx.restore()

        ctx.save()
        ctx.translate((width / 2) + 200, (height / 2) - 200)
        ctx.scale(1 - m_data.val, m_data.val + 1)
        ctx.fillRect(block.x * 0.5, block.y * 0.5, block.w * 0.5, block.h * 0.5)
        ctx.restore()

        /*
        ctx.save()
        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        ctx.font = '24px sans-serif'
        ctx.fillText(m_data.val + 1, 8, 24)
        ctx.restore()
        */
    }
}

canvasSketch(sketch, settings)
