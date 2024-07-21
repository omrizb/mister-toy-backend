import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import qs from 'qs'
import path from 'path'

import { utilService } from './services/util.service.js'
import { loggerService } from './services/logger.service.js'
import { itemService } from './services/item.service.js'
import { userService } from './services/user.service.js'

const PORT = 3030
const COOKIE_MAX_AGE = 10 * 60 * 1000
const MAX_VISITED_ITEMS = 10

const app = express()

const corsOptions = {
    origin: [
        'http://127.0.0.1:8080',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'http://localhost:5173',
    ],
    credentials: true,
}

app.use(express.static('public'))
app.use(cookieParser())
app.use(express.json())
app.use(cors(corsOptions))

// Item
app.get('/api/item', (req, res) => {
    itemService.getDefaultQueryParams()
        .then(defaultQueryParams => {
            const reqQueryParams = (req.query) ? qs.parse(req.query[0]) : {}
            const queryParams = utilService.deepMergeObjectsSourceKeysOnly(defaultQueryParams, reqQueryParams)
            return queryParams
        })
        .then(queryParams => {
            itemService.query(queryParams)
                .then(items => res.send(items))
                .catch(err => {
                    loggerService.error(`Couldn't get items: ${err}`)
                    res.status(500).send(`Couldn't get items: ${err}`)
                })
        })
})

app.get('/api/item/default-query-params', (req, res) => {
    itemService.getDefaultQueryParams()
        .then(queryParams => res.send(queryParams))
        .catch(err => {
            loggerService.error(`Couldn't get default query params: ${err}`)
            res.status(500).send(`Couldn't get default query params: ${err}`)
        })
})

app.get('/api/item/labels', (req, res) => {
    itemService.getLabels()
        .then(labels => res.send(labels))
        .catch(err => {
            loggerService.error(`Couldn't get labels: ${err}`)
            res.status(500).send(`Couldn't get labels: ${err}`)
        })
})

app.get('/api/item/page-count', (req, res) => {
    itemService.getPageCount()
        .then(count => res.send(count + ''))
        .catch(err => {
            loggerService.error(`Couldn't get page count: ${err}`)
            res.status(500).send(`Couldn't get page count: ${err}`)
        })
})

app.get('/api/item/:id', (req, res) => {
    const { id } = req.params
    const visitedItems = req.cookies.visitedItems || []

    if (!visitedItems.find(cookieItemId => cookieItemId === id)) {
        if (visitedItems.length >= MAX_VISITED_ITEMS) {
            return res.status(401).send('Wait for a bit')
        }
        visitedItems.push(id)
    }

    itemService.get(id)
        .then(item => {
            res.cookie('visitedItems', visitedItems, { maxAge: COOKIE_MAX_AGE })
            return res.send(item)
        })
        .catch(err => {
            loggerService.error(`Couldn't get item ${id}: ${err}`)
            res.status(500).send(`Couldn't get item ${id}: ${err}`)
        })
})

app.post('/api/item', (req, res) => {
    const itemToSave = _itemFromJSON(req.body)

    itemService.save(itemToSave)
        .then(itemToSave => {
            loggerService.info(`Item ${itemToSave._id} saved successfully`)
            res.send(itemToSave)
        })
        .catch(err => {
            loggerService.error(`Couldn't add item: ${err}`)
            res.status(500).send(`Couldn't add item: ${err}`)
        })

})

app.put('/api/item/:id', (req, res) => {
    const itemToSave = _itemFromJSON(req.body)
    itemToSave._id = req.body._id

    itemService.save(itemToSave)
        .then(itemToSave => {
            loggerService.info(`Item ${itemToSave._id} saved successfully`)
            res.send(itemToSave)
        })
        .catch(err => {
            loggerService.error(`Couldn't update item: ${err}`)
            res.status(500).send(`Couldn't update item: ${err}`)
        })
})

app.delete('/api/item/:id', (req, res) => {
    const { id } = req.params
    itemService.remove(id)
        .then(item => {
            loggerService.info(`Item ${item._id} removed successfully`)
            res.send(item)
        })
        .catch(err => {
            loggerService.error(`Couldn't remove item: ${err}`)
            res.status(500).send(`Couldn't remove item: ${err}`)
        })
})

// User
app.get('/api/user', (req, res) => {
    const { loginToken } = req.cookies

    const loggedInUser = userService.validateToken(loginToken)
    if (!loggedInUser || !loggedInUser.isAdmin) return res.status(401).send('Cannot get users')

    userService.query()
        .then(users => res.send(users))
        .catch(err => {
            loggerService.error(`Cannot get users: ${err}`)
            res.status(500).send(`Cannot get users: ${err}`)
        })
})

app.get('/api/user/:userId', (req, res) => {
    const { userId } = req.params

    userService.getById(userId)
        .then(user => res.send(user))
        .catch(err => {
            loggerService.error(`Cannot get user ${userId}: ${err}`)
            res.status(500).send(`Cannot get user ${userId}: ${err}`)
        })
})

app.delete('/api/user/:userId', (req, res) => {
    const { loginToken } = req.cookies

    const loggedInUser = userService.validateToken(loginToken)
    if (!loggedInUser?.isAdmin) return res.status(401).send('Not allowed')

    const { userId } = req.params
    itemService.hasItems(userId)
        .then(hasItems => {
            if (!hasItems) {
                userService.remove(userId)
                    .then(() => res.send('Removed!'))
                    .catch(err => res.status(401).send(err))
            } else {
                res.status(401).send('Cannot delete user with items')
            }
        })
})

// Authentication
app.post('/api/login', (req, res) => {
    const credentials = {
        username: req.body.username,
        password: req.body.password
    }

    userService.login(credentials)
        .then(user => {
            const loginToken = userService.getLoginToken(user)
            res.cookie('loginToken', loginToken)
            res.send(user)
        })
        .catch(err => {
            loggerService.error(`Login failed: ${err}`)
            res.status(401).send(`Login failed: ${err}`)
        })
})

app.post('/api/logout', (req, res) => {
    res.clearCookie('loginToken')
    res.send('Logged out')
})

app.post('/api/signup', (req, res) => {
    const userDetails = req.body

    userService.signup(userDetails)
        .then(user => {
            const loginToken = userService.getLoginToken(user)
            res.cookie('loginToken', loginToken)
            res.send(user)
        })
        .catch(err => res.status(403).send('Signup failed'))
})

// Fallback route
app.get('/**', (req, res) => {
    res.sendFile(path.resolve('public/index.html'))
})

// Start server
app.listen(PORT, () => console.log(`Server is up. Listening port ${PORT}.`))

function _itemFromJSON(itemJSON) {
    const { title, description, severity, labels } = itemJSON
    const item = {
        title: title || '',
        description: description || '',
        severity: +severity || 0,
        labels: labels || []
    }
    return item
}