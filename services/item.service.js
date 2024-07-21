import fs from 'fs'

import { utilService } from './util.service.js'

export const itemService = {
    query,
    get,
    remove,
    save,
    getEmptyItem,
    getDefaultQueryParams,
    getLabels,
    getPageCount
}

const DATA_PATH = './data/item.json'
const PAGE_SIZE = 10

const items = utilService.readJsonFile(DATA_PATH)

function query(queryParams = _getDefaultQueryParams()) {
    let filteredItems = items
    const { txt, maxPrice, labels, sortBy, sortDir, pageIdx } = queryParams

    if (txt) {
        const regExp = new RegExp(filterBy.txt, 'i')
        filteredItems = filteredItems.filter(item => (
            regExp.test(item.title) ||
            regExp.test(item.description)
        ))
    }
    if (maxPrice) {
        filteredItems = filteredItems.filter(item => item.price <= maxPrice)
    }
    if (labels.length > 0) {
        filteredItems = filteredItems.filter(item => filterBy.labels.every(label => item.labels.includes(label)))
    }

    if (sortBy === 'title') {
        filteredItems = filteredItems.sort((item1, item2) => item1.title.localeCompare(item2.title) * sortDir)
    } else if (sortBy === 'price' || sortBy === 'createdAt') {
        filteredItems = filteredItems.sort((item1, item2) => (item1[sortBy] - item2[sortBy]) * sortDir)
    }

    const startIdx = pageIdx * PAGE_SIZE
    filteredItems = filteredItems.slice(startIdx, startIdx + PAGE_SIZE)

    return Promise.resolve(filteredItems)
}

function get(itemId) {
    const item = items.find(item => item._id === itemId)
    return Promise.resolve(item)
}

function remove(itemId) {
    const idx = items.findIndex(item => item._id === itemId)

    if (idx === -1) {
        return Promise.reject(`Item with id '${itemId}' does not exist.`)
    }

    const itemToRemove = items[idx]
    items.splice(idx, 1)
    return _saveItemsToFile()
        .then(() => itemToRemove)
}

function save(itemToSave) {
    itemToSave.updatedAt = Date.now()
    itemToSave = _removeUndefinedProps(itemToSave)

    if (itemToSave._id) {
        const idx = items.findIndex(item => item._id === itemToSave._id)
        items.splice(idx, 1, itemToSave)
    } else {
        itemToSave._id = utilService.makeId()
        itemToSave.createdAt = Date.now()
        items.push(itemToSave)
    }

    return _saveItemsToFile()
        .then(() => itemToSave)
}

function getEmptyItem() {
    return Promise.resolve({
        title: 'New item',
        description: '',
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
    const itemLabels = items.reduce((acc, item) => {
        return acc = [...acc, ...item.labels]
    }, [])
    return Promise.resolve([...new Set(itemLabels)])
}

function getPageCount() {
    return Promise.resolve(Math.ceil(items.length / PAGE_SIZE))
}

function _getDefaultQueryParams() {
    return {
        txt: '',
        maxPrice: '',
        labels: [],
        sortBy: '',
        sortDir: '',
        pageIdx: 0
    }
}

function _saveItemsToFile() {
    return utilService.writeJsonFile(DATA_PATH, items)
}

function _removeUndefinedProps(obj) {
    return Object.keys(obj).reduce((acc, key) => {
        if (obj[key] !== undefined) {
            acc[key] = obj[key]
        }
        return acc
    }, {})
}