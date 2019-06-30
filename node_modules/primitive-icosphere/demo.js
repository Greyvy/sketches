var mesh = require('./')(1, {
  subdivisions: 1
})

require('glo-demo-primitive')(mesh, {
  repeat: [10, 10]
}).start()
