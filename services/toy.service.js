import { utilService } from './util.service.js'

export const toyService = {
    query,
    get,
    remove,
    save,
    getEmptyToy,
    getDefaultQueryParams,
    getLabels,
    getPageCount
}

const DATA_PATH = './data/toy.json'
const PAGE_SIZE = 10

const toys = utilService.readJsonFile(DATA_PATH)

function query(queryParams = _getDefaultQueryParams()) {
    let filteredToys = toys
    const { txt, minPrice, maxPrice, labels, sortBy, sortDir, pageIdx } = queryParams
    if (txt) {
        const regExp = new RegExp(txt, 'i')
        filteredToys = filteredToys.filter(toy => (
            regExp.test(toy.name) ||
            regExp.test(toy.description)
        ))
    }
    if (minPrice) {
        filteredToys = filteredToys.filter(toy => toy.price >= minPrice)
    }
    if (maxPrice) {
        filteredToys = filteredToys.filter(toy => toy.price <= maxPrice)
    }
    if (labels.length > 0) {
        filteredToys = filteredToys.filter(toy => labels.every(label => toy.labels.includes(label)))
    }

    if (sortBy === 'title') {
        filteredToys = filteredToys.sort((toy1, toy2) => toy1.title.localeCompare(toy2.title) * sortDir)
    } else if (sortBy === 'price' || sortBy === 'createdAt') {
        filteredToys = filteredToys.sort((toy1, toy2) => (toy1[sortBy] - toy2[sortBy]) * sortDir)
    }

    // const startIdx = pageIdx * PAGE_SIZE
    // filteredToys = filteredToys.slice(startIdx, startIdx + PAGE_SIZE)

    return Promise.resolve({
        filteredToys,
        queryParams,
        totalNumOfToys: toys.length
    })
}

function get(toyId) {
    const toy = toys.find(toy => toy._id === toyId)
    return Promise.resolve(toy)
}

function remove(toyId) {
    const idx = toys.findIndex(toy => toy._id === toyId)

    if (idx === -1) {
        return Promise.reject(`Toy with id '${toyId}' does not exist.`)
    }

    const toyToRemove = toys[idx]
    toys.splice(idx, 1)
    return _saveToysToFile()
        .then(() => toyToRemove)
}

function save(toyToSave) {
    toyToSave.updatedAt = Date.now()
    toyToSave = _removeUndefinedProps(toyToSave)

    if (toyToSave._id) {
        const idx = toys.findIndex(toy => toy._id === toyToSave._id)
        if (idx === -1) return Promise.reject(`Toy with id '${toyToSave._id}' does not exist.`)
        toyToSave = { ...toys[idx], ...toyToSave }
        toys[idx] = toyToSave
    } else {
        toyToSave._id = utilService.makeId()
        toyToSave.createdAt = Date.now()
        toys.push(toyToSave)
    }

    return _saveToysToFile()
        .then(() => toyToSave)
}

function getEmptyToy() {
    return Promise.resolve({
        title: 'New toy',
        price: 0,
        labels: [],
        creator: {
            _id: '',
            fullName: ''
        }
    })
}

function getDefaultQueryParams() {
    return Promise.resolve(_getDefaultQueryParams())
}

function getLabels() {
    const toyLabels = toys.reduce((acc, toy) => {
        return acc = [...acc, ...toy.labels]
    }, [])
    return Promise.resolve([...new Set(toyLabels)])
}

function getPageCount() {
    return Promise.resolve(Math.ceil(toys.length / PAGE_SIZE))
}

function _getDefaultQueryParams() {
    return {
        txt: '',
        minPrice: '',
        maxPrice: '',
        labels: [],
        inStock: 'all',
        sortBy: '',
        sortDir: '',
        pageIdx: 0
    }
}

function _saveToysToFile() {
    return utilService.writeJsonFile(DATA_PATH, toys)
}

function _removeUndefinedProps(obj) {
    return Object.keys(obj).reduce((acc, key) => {
        if (obj[key] !== undefined) {
            acc[key] = obj[key]
        }
        return acc
    }, {})
}