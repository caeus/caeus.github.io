import { main } from './wire.js'

main(process.argv.slice(2), process.env).catch(console.error)
