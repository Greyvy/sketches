var fs = require('fs')


let paths = {
    src: './4364-data.json'
}


function write_file(path, data) {
    fs.writeFile(path, data, (err) => { if (err) throw err })
}


fs.readFile(paths.src, 'utf8', (err, data) => {

    if (err) throw err

    // let str = `M 0,0`
    /*
    for (let i = 0; i < json.length; ++i) {
        let line = json[i]
        for (let j = 0; j < line.length; ++j) {
            str += ` ${line[j][0]},${line[j][1]}`
        }
    }
    */

    let output = fs.createWriteStream('4364.svg', {flags: 'w'})
    let json = JSON.parse(data)
    let line
    let str
    output.write('<svg version="1.1" width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">')
    for (let i = 0; i < 1; ++i) {
        line = json[i]
        // output.write('<polyline points="')
        for (let j = 0; j < line.length; j+=2) {
            output.write(`<path d="M ${line[j][0]},${line[j][1]} ${line[j+1][0]},${line[j+1][1]}" fill="none" stroke="#000" stroke-width="1" />`)
            // output.write(`${line[j][0]} ${line[j][1]}`)
            // if (j < line.length -5) output.write(', ')
        }
        // output.write('" stroke="#000" fill="none" stroke-width="1" />')
        // write_file(`./4364-parts/${i}.svg`, str)
    }
    output.write('</svg>')
    output.end()

    /*
    result = `
    <svg viewBox="0 0 1024 1024">
        <rect x="${4}" y="4" width="40" height="40" />
        <path d="${str}" />
    </svg>`
    write_file('./4364.svg', result)
    */

})
