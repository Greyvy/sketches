let Tone = require('tone')

let clamp = (v, min, max) => v < min ? min : v > max ? max : v

let lerp = (v0, v1, t) => (1-t)*v0+t*v1

let map = (v, ds, de, rs, re) => rs+(re-rs)*((v-ds)/(de-ds))

let ease = (p, g) => {
  if (p < 0.5)
    return 0.5 * Math.pow(2*p, g)
  else
    return 1 - 0.5 * Math.pow(2*(1 - p), g)
}

let load_sound = function(str) {
    return new Promise(function(resolve, reject) {
        new Tone.Player(str, function(player) {
            resolve(player)
        })
    })
}


exports.clamp      = clamp
exports.lerp       = lerp
exports.map        = map
exports.ease       = ease
exports.load_sound = load_sound
