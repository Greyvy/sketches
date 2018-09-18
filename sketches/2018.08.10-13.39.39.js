let canvasSketch = require('canvas-sketch')
let seed = require('seed-random')

let settings = {
    animate: true,
    duration: 6,
    dimensions: [ 1024, 1024 ]
}

let sketch = ({ context, width, height }) => {

    const PI = Math.PI
    const TAU = PI * 2

    let lerp = (v0, v1, t) => (1 - t) * v0 + t * v1

    // @NOTE(Grey): based on: https://gist.github.com/mbostock/19168c663618b7f07158

    let seed_value = Math.floor(Math.random() * 1000)
    let rand = seed(seed_value)
    // let rand = Math.random

    let cos = (v) => Math.cos(v)
    let sin = (v) => Math.sin(v)


    // r = min_sample_radius
    // k = limit
    let disk = (width, height, min_sample_radius, limit = 30) => {
        let k = limit
        let radius2 = min_sample_radius * min_sample_radius
        let R = 3 * radius2
        let cell_size = min_sample_radius * Math.SQRT1_2
        let grid_w = Math.ceil(width / cell_size)
        let grid_h = Math.ceil(height / cell_size)

        let sample_grid = Array(grid_w * grid_h)
        let queue = []
        let queue_s = 0
        let sample_s = 0


        let far = (x, y) => {
            let i = x / cell_size | 0
            let j = y / cell_size | 0
            let i0 = Math.max(i - 2, 0)
            let j0 = Math.max(j - 2, 0)
            let i1 = Math.min(i + 3, grid_w)
            let j1 = Math.min(j + 3, grid_h)

            for (let j = j0; j < j1; ++j) {
                let o = j * grid_w
                for (let i = i0; i < i1; ++i) {
                    let s
                    if ((s = sample_grid[o + i])) {
                        let dx = s[0] - x
                        let dy = s[1] - y
                        if (dx * dx + dy * dy < radius2) return false
                    }
                }
            }

            return true
        }

        let sample = (x, y) => {
            let s = [x, y]
            queue.push(s)
            sample_grid[grid_w * (y / cell_size | 0) + (x / cell_size | 0)] = s
            ++sample_s
            ++queue_s
            return s
        }


        return function() {
            if (!sample_s) return sample(rand() * width, rand() * height)

            while (queue_s) {
                let i = rand() * queue_s | 0
                let s = queue[i]

                for (let j = 0; j < k; ++j) {
                    let a = TAU * rand()
                    let r = Math.sqrt(rand() * R + radius2)
                    let x = s[0] + r * cos(a)
                    let y = s[1] + r * sin(a)

                    if (0 <= x && x < width &&
                        0 <= y && y < height &&
                        far(x, y)) {
                        return sample(x, y)
                    }
                }

                queue[i] = queue[--queue_s]
                queue.length = queue_s
            }
        }


        /*
         * @NOTE(Grey): My not working attempt at an implementation
        let point_to_index = (p0) => {
            let index = p0[0] + Math.sqrt(Rn) * p0[1]
            return Math.floor(index / min_sample_radius)
        }

        let point_make = (p0) => {
            let msr = min_sample_radius
            let p1 = [
                cos(rand() * TAU) * (msr + rand() * (2 * msr)),
                sin(rand() * TAU) * (msr + rand() * (2 * msr))
            ]
            return [p0[0] + p1[0], p0[1] + p1[1]]
        }

        let point_test = (p0, grid) => {
            let index = point_to_index(p0)
            return grid[index]
        }

        let x0 = [rand() * Math.sqrt(Rn), rand() * Math.sqrt(Rn)]
        let active_list = [x0]
        x0_index = point_to_index(x0)
        sample_grid[x0_index] = x0

        let i = 0
        while (active_list.length) {
            let test_point = active_list[i]
            let x1 = point_make(test_point)

            let mp = point_test(x1, sample_grid)
            debugger

            for (let i = 0; i < limit; ++i) {
                let x1 = point_make(test_point)
                if (!point_test(x1, sample_grid)) {
                    point_found = true
                    active_list.push(x1)
                }
            }
            if (!point_found) {
                active_list.pop()
            }

            // if no point is found; remove point from active_list
            i++
        }
        */

        // return sample_grid
    }

    let sampler0 = disk(width, height, 32)
    let sample0
    let grid0 = []
    while ((sample0 = sampler0())) {
        grid0.push(sample0)
    }

    let sampler1 = disk(width, height, 32)
    let sample1
    let grid1 = []
    while ((sample1 = sampler1())) {
        grid1.push(sample1)
    }


    return ({ context: ctx, width, height, playhead }) => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, width, height)


        /*
        ctx.strokeStyle = 'hsla(0, 0%, 0%, 0)'
        for (let i = 0; i < grid0.length; i += 3) {
            if (
                grid0[i + 0] &&
                grid0[i + 1] &&
                grid0[i + 2]
            ) {
                ctx.beginPath()
                ctx.moveTo(...grid0[i + 0])
                ctx.lineTo(...grid0[i + 1])
                ctx.lineTo(...grid0[i + 2])
                ctx.closePath()
                ctx.stroke()
            }
        }
        */

            /*
        grid0.forEach((v, i, a) => {
            ctx.fillStyle = `hsla(0, 0%, ${100 - (i / a.length * 100)}%, 1)`
            ctx.beginPath()
            ctx.arc(v[0], v[1], 2, 0, TAU)
            ctx.closePath()
            ctx.fill()
        })
        */

        let base = grid0.length < grid1.length ? grid0 : grid1
        let tran = grid0.length > grid1.length ? grid0 : grid1
        debugger
        for (let i = 0; i < base.length; ++i) {
            ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
            // let t = Math.abs(2 * ((playhead / 1) - Math.floor((1 / 2 + playhead / 1))))
            let t = (Math.sin(playhead * TAU) + 1) / 2
            let x = lerp(base[i][0], tran[i][0], t)
            let y = lerp(base[i][1], tran[i][1], t)

            ctx.beginPath()
            ctx.arc(x, y, 2, 0, TAU)
            ctx.closePath()
            ctx.fill()

        }


        ctx.fillStyle = 'hsla(0, 0%, 0%, 1)'
        // ctx.fillText(grid0.length + ' ' + grid1.length, 10, 20)
        // ctx.fillText(playhead, 10, 20)
    }
}

canvasSketch(sketch, settings)
