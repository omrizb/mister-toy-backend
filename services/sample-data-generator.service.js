import { utilService } from './util.service.js'
import { nameMakerService } from './name-maker.service.js'
import { toyService } from './toy.service.js'

const DATA_PATH = './data/toy.json'
const LABELS = ['On wheels', 'Box game', 'Art', 'Baby', 'Doll', 'Puzzle', 'Outdoor', 'Battery Powered']

createToys(30)

function createToys(size) {
    const toys = []
    for (let i = 0; i < size; i++) {
        toys.push(createToy())
    }
    utilService.writeJsonFile(DATA_PATH, toys)
}

function createToy() {
    const toy = toyService.getEmptyToy()
    toy._id = utilService.makeId()
    toy.name = nameMakerService.makeName()
    toy.description = utilService.makeLorem(20)
    toy.price = utilService.getRandomIntInclusive(10, 200)
    toy.labels = utilService.getRandomItems(LABELS, utilService.getRandomIntInclusive(0, 3))
    toy.inStock = Math.random() > 0.3 ? true : false
    toy.createdAt = toy.updatedAt = Date.now() - utilService.getRandomIntInclusive(0, 1000 * 60 * 60 * 24)
    return toy
}