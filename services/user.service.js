import fs from 'fs'

import Cryptr from 'cryptr'
const cryptr = new Cryptr(process.env.SECRET1 || 'secret1234')

import { utilService } from './util.service.js'

let users = utilService.readJsonFile('data/user.json')

export const userService = {
    query,
    getById,
    remove,
    getLoginToken,
    validateToken,
    login,
    signup,
}

function query() {
    return Promise.resolve(users)
}

function getById(userId) {
    const user = users.find(user => user._id === userId)
    if (!user) return Promise.reject('user not found')
    return Promise.resolve(user)
}

function remove(userId) {
    const idx = users.findIndex(user => user._id === userId)
    if (idx === -1) return Promise.reject('sorry not found')
    users.splice(idx, 1)

    return _saveUsersToFile()
}

function getLoginToken(user) {
    return cryptr.encrypt(JSON.stringify(user))
}

function validateToken(loginToken) {
    try {
        const json = cryptr.decrypt(loginToken)
        const loggedInUser = JSON.parse(json)
        return loggedInUser
    } catch (err) {
        console.log('Invalid login token')
        return null
    }
}

function login({ username, password }) {
    let user = users.find(user => user.username === username && user.password === password)
    if (!user) return Promise.reject('Invalid username or password')

    const { _id, fullname, isAdmin } = user
    user = { _id, fullname, isAdmin }

    return Promise.resolve(user)
}

function signup({ fullname, username, password }) {
    if (!fullname || !username || !password) return Promise.reject('Incomplete credentials')

    let user = {
        _id: utilService.makeId(),
        fullname,
        username,
        password,
    }
    users.push(user)

    return _saveUsersToFile()
        .then(() => {
            delete user.password
            return user
        })
}

function _saveUsersToFile() {
    return new Promise((resolve, reject) => {
        const content = JSON.stringify(users, null, 2)
        fs.writeFile('./data/user.json', content, err => {
            if (err) {
                console.error(err)
                return reject(err)
            }
            resolve()
        })
    })
}