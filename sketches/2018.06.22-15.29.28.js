let canvasSketch = require('canvas-sketch');

let settings = {
    animation: true,
    duration: 3,
    dimensions: [ 1024, 1024 ]
}


let random = (min, max) => Math.random() * (max - min) + min
let vec2 = {
    add: function(a, b) {
        return [a[0] + b[0], a[1] + b[1]]
    },
    sub: function(a, b) {
        return [a[0] - b[0], a[1] - b[1]]
    },
    dist: function(a, b) {
        return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2))
    }
}


let mag = { pos: [512, 512], field: [420, 420] }
let bubbles = Array(40).fill([]).map((b) => [random(0, 1024), random(0, 1024)])

let mouse = {
    pos: [0, 0],
    handleEvent: function(event) {
        this.pos[0] = event.x
        this.pos[1] = event.y
    }
}


let sketch = () => {
    return ({ context, width, height, playhead }) => {
        let ctx = context
        let size = [width, height]


        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)

        mag.pos[0] = width / 2 + ((width / 2) * Math.sin(playhead * (Math.PI * 2)))
        mag.pos[1] = height / 2 + ((height / 2) * Math.sin(playhead * (Math.PI * 2)))

        // ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        // ctx.beginPath()
        // ctx.arc(...mag.pos, 5, 0, Math.PI * 2)
        // ctx.closePath()
        // ctx.fill()


        // let r = 200 + (Math.min((vec2.dist(mag.pos, mouse.pos) / vec2.dist(mag.pos, mag.field)), 1) * -195)

        // ctx.strokeStyle = 'hsla(0, 0%, 0%, 1)'
        // ctx.beginPath()
        // ctx.arc(mouse.pos[0], mouse.pos[1], r, 0, Math.PI * 2)
        // ctx.closePath()
        // ctx.stroke()

        bubbles.forEach((bub) => {
            let r = 200 + (Math.min(vec2.dist(mag.pos, bub) / vec2.dist(mag.pos, mag.field), 1)) * -195
            ctx.strokeStyle = 'hsla(0, 0%, 0%, 1)'
            ctx.beginPath()
            ctx.arc(...bub, r, 0, Math.PI * 2)
            ctx.closePath()
            ctx.stroke()
        })


        // @NOTE(Grey): Debug text
        // ctx.fillText(20 + Math.sin(vec2.dist(mag.pos, mouse.pos)) * 10, 10, 45)
        // ctx.fillText(vec2.dist(mag.pos, mag.field), 10, 65)
        // ctx.fillText(Math.min(vec2.dist(mag.pos, mouse.pos) / vec2.dist(mag.pos, mag.field), 1), 10, 85)

    }
}

window.addEventListener('mousemove', mouse, false)
canvasSketch(sketch, settings)

