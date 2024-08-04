import fs from 'fs'
import fr from 'follow-redirects'

const { http, https } = fr

export const utilService = {
    readJsonFile,
    writeJsonFile,
    download,
    httpGet,
    makeId,
    makeLorem,
    deepMergeObjectsSourceKeysOnly,
    getRandomIntInclusive,
    getRandomItems,
}


function readJsonFile(path) {
    const str = fs.readFileSync(path, 'utf8')
    const json = JSON.parse(str)
    return json
}

function writeJsonFile(path, data) {
    return new Promise((resolve, reject) => {
        const jsonData = JSON.stringify(data, null, 2)

        fs.writeFile(path, jsonData, (err) => {
            if (err) return reject(err)
            resolve()
        })
    })
}

function download(url, fileName) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(fileName)
        https.get(url, (content) => {
            content.pipe(file)
            file.on('error', reject)
            file.on('finish', () => {
                file.close()
                resolve()
            })
        })
    })
}

function httpGet(url) {
    const protocol = url.startsWith('https') ? https : http
    const options = {
        method: 'GET'
    }

    return new Promise((resolve, reject) => {
        const req = protocol.request(url, options, (res) => {
            let data = ''
            res.on('data', (chunk) => {
                data += chunk
            })
            res.on('end', () => {
                resolve(data)
            })
        })
        req.on('error', (err) => {
            reject(err)
        })
        req.end()
    })

}

function makeId(length = 6) {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
}

function makeLorem(size = 100) {
    const words = ['The sky', 'above', 'the port', 'was', 'the color', 'of nature', 'tuned', 'to', 'a live channel', 'All', 'this happened', 'more or less', 'I', 'had', 'the story', 'bit by bit', 'from various people', 'and', 'as generally', 'happens', 'in such cases', 'each time', 'it', 'was', 'a different story', 'a pleasure', 'to', 'burn']
    var txt = ''
    while (size > 0) {
        size--
        txt += words[Math.floor(Math.random() * words.length)]
        if (size >= 1) txt += ' '
    }
    return txt
}

function deepMergeObjectsSourceKeysOnly(source, target) {
    const merged = { ...source }

    for (const key in source) {
        if (target.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                merged[key] = deepMergeObjectsSourceKeysOnly(source[key], target[key])
            } else {
                merged[key] = convertType(source[key], target[key])
            }
        }
    }

    return merged
}

function convertType(sourceValue, targetValue) {
    const sourceType = typeof sourceValue
    switch (sourceType) {
        case 'number':
            return Number(targetValue)
        case 'boolean':
            return Boolean(targetValue)
        case 'string':
            return String(targetValue)
        default:
            return targetValue
    }
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min //The maximum is inclusive and the minimum is inclusive 
}

function getRandomItems(items, size = undefined, duplicationAllowed = false) {
    if (size && size > items.length && !duplicationAllowed) return

    const res = []
    const srcArray = (duplicationAllowed) ? items : [...items]
    const iterations = size || 1
    for (let i = 0; i < iterations; i++) {
        if (!duplicationAllowed && srcArray.length === 0) break
        const randIdx = Math.floor(Math.random() * srcArray.length)
        res.push(srcArray[randIdx])
        if (!duplicationAllowed) srcArray.splice(randIdx, 1)
    }

    return (size === undefined) ? res[0] : res
}
