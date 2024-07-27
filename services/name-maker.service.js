import { utilService } from './util.service.js'

const funNouns = [
    'Dragon',
    'Unicorn',
    'Pirate',
    'Rocket',
    'Robot',
    'Dinosaur',
    'Ninja',
    'Mermaid',
    'Wizard',
    'Monster',
    'Knight',
    'Alien',
    'Superhero',
    'Fairy',
    'Detective',
    'Cowboy',
    'Princess',
    'Pirate',
    'Gladiator',
    'Ghost'
]

const toyTypes = [
    'Lego',
    'Doll',
    'Puzzle',
    'Action Figure',
    'Train Set',
    'Car',
    'Building Blocks',
    'Play-Doh',
    'Board Game',
    'Stuffed Animal',
    'Kite',
    'Bike',
    'Yo-Yo',
    'Robot Kit',
    'Race Track',
    'Slime',
    'RC Car',
    'Toy Sword',
    'Art Set',
    'Balloon'
]

export const nameMakerService = {
    makeName,
}

function makeName() {
    const funNoun = utilService.getRandomItems(funNouns)
    const toyType = utilService.getRandomItems(toyTypes)
    return `${funNoun} ${toyType}`
}