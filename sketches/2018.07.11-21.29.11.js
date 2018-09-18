let canvasSketch = require('canvas-sketch')
let SimplexNoise = require('simplex-noise')
let seed = require('seed-random')
let vec = require('vec-la')

let settings = {
    dimensions: [ 11, 14 ],
    units: 'in'
}

const PI = Math.PI
const TAU = PI * 2

function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [ h, s, l ];
}

function hsvToRgb(h, s, v) {
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [ r * 255, g * 255, b * 255 ];
}

function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return [ h, s, v ];
}


let sketch = ({ width, height }) => {

    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)
    let simplex = new SimplexNoise()
    let mb = vec.matrixBuilder()

    let ridge_create = (x, y, width, height, slope) => {
        let tm = mb.scale(width, height).translate(x, y).get()
        return Array(240)
            .fill([])
            .map((v, i, a) => {
                let x = i / (a.length - 1)
                let y = slope(x) + (simplex.noise2D(0, i * 0.0125) * 0.025)
                return vec.transform([x, y], tm)
            })
    }

    let ridge_draw = (ctx, color, arr) => {
        ctx.save()
        ctx.beginPath()
        ctx.fillStyle = color

        ctx.moveTo(...arr[0])

        arr.forEach((p) => { ctx.lineTo(...p) })

        ctx.lineTo(width - 1, arr[arr.length - 1][1])
        ctx.lineTo(width - 1, height - 1)
        ctx.lineTo(1, height - 1)

        ctx.closePath()
        ctx.fill()
        ctx.restore()
    }

    let ridges = Array(8)
        .fill([])
        .map((v, i, a) => {
            let y = i / (a.length + 1)
            let h = height * (0.4 + rand() * 0.6)
            let angle = 0.4 + rand() * 0.6
            let slope = i % 2 === 0 ? x => x * angle : x => 1 - x * angle
            return ridge_create(1, (height * y + 1), width - 2, h, slope)
        })

    let portraits = [
        {
            bg: 80,
            h: 50,
            y: height / 4
        },
        {
            bg: 70,
            h: 170,
            y: height / 3,
        },
        {
            bg: 60,
            h: 220,
            y: height / 2
        }
    ]

    return ({ context, width, height }) => {
        let pic = portraits[1]

        context.fillStyle = `hsla(340, 50%, ${pic.bg}%, 1)`
        context.fillRect(1, 1, width - 2, height - 2)

        context.globalCompositeOperation = 'multiply'
        ridges.forEach((r, i, a) => {
            let t = i / (a.length - 1)
            // c(HSB): 50,51,94 | (HSL): 50,80,70
            let h = pic.h // 50 // 0 // 170 // 50 // 220 // 50
            let s = 60 + (t * 20)
            let l = 80 + (t * 20)
            ridge_draw(context, `hsla(${h}, ${s}%, ${l}%, 1)`, r)
        })

        context.globalCompositeOperation = 'source-over'
        context.fillStyle = 'hsla(0, 100%, 100%, 1)'
        context.fillRect(0, height - 1, width, 1)


        context.save()
        context.strokeStyle = 'hsla(0, 100%, 100%, 1)'
        context.lineWidth = 0.05
        context.translate(width / 2, pic.y)
        context.beginPath()
        context.arc(0, 0, 0.25, 0, TAU)
        context.closePath()
        context.stroke()
        context.restore()


    }
}

canvasSketch(sketch, settings)
