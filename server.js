import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import qs from 'qs'
import path from 'path'

import { utilService } from './services/util.service.js'
import { loggerService } from './services/logger.service.js'
import { toyService } from './services/toy.service.js'
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

// Toy
app.get('/api/toy', (req, res) => {
    toyService.getDefaultQueryParams()
        .then(defaultQueryParams => {
            const reqQueryParams = (req.query) ? qs.parse(req.query[0]) : {}
            const queryParams = utilService.deepMergeObjectsSourceKeysOnly(defaultQueryParams, reqQueryParams)
            return queryParams
        })
        .then(queryParams => {
            toyService.query(queryParams)
                .then(toys => res.send(toys))
                .catch(err => {
                    loggerService.error(`Couldn't get toys: ${err}`)
                    res.status(500).send(`Couldn't get toys: ${err}`)
                })
        })
})

app.get('/api/toy/default-query-params', (req, res) => {
    toyService.getDefaultQueryParams()
        .then(queryParams => res.send(queryParams))
        .catch(err => {
            loggerService.error(`Couldn't get default query params: ${err}`)
            res.status(500).send(`Couldn't get default query params: ${err}`)
        })
})

app.get('/api/toy/labels', (req, res) => {
    toyService.getLabels()
        .then(labels => res.send(labels))
        .catch(err => {
            loggerService.error(`Couldn't get labels: ${err}`)
            res.status(500).send(`Couldn't get labels: ${err}`)
        })
})

app.get('/api/toy/page-count', (req, res) => {
    toyService.getPageCount()
        .then(count => res.send(count + ''))
        .catch(err => {
            loggerService.error(`Couldn't get page count: ${err}`)
            res.status(500).send(`Couldn't get page count: ${err}`)
        })
})

app.get('/api/toy/:id', (req, res) => {
    const { id } = req.params
    const visitedToys = req.cookies.visitedToys || []

    if (!visitedToys.find(cookieToyId => cookieToyId === id)) {
        if (visitedToys.length >= MAX_VISITED_ITEMS) {
            return res.status(401).send('Wait for a bit')
        }
        visitedToys.push(id)
    }

    toyService.get(id)
        .then(toy => {
            res.cookie('visitedToys', visitedToys, { maxAge: COOKIE_MAX_AGE })
            return res.send(toy)
        })
        .catch(err => {
            loggerService.error(`Couldn't get toy ${id}: ${err}`)
            res.status(500).send(`Couldn't get toy ${id}: ${err}`)
        })
})

app.post('/api/toy', (req, res) => {
    const toyToSave = _toyFromJSON(req.body)

    toyService.save(toyToSave)
        .then(toyToSave => {
            loggerService.info(`Toy ${toyToSave._id} saved successfully`)
            res.send(toyToSave)
        })
        .catch(err => {
            loggerService.error(`Couldn't add toy: ${err}`)
            res.status(500).send(`Couldn't add toy: ${err}`)
        })

})

app.put('/api/toy/:id', (req, res) => {
    const toyToSave = _toyFromJSON(req.body)
    toyToSave._id = req.body._id

    toyService.save(toyToSave)
        .then(toyToSave => {
            loggerService.info(`Toy ${toyToSave._id} saved successfully`)
            res.send(toyToSave)
        })
        .catch(err => {
            loggerService.error(`Couldn't update toy: ${err}`)
            res.status(500).send(`Couldn't update toy: ${err}`)
        })
})

app.delete('/api/toy/:id', (req, res) => {
    const { id } = req.params
    toyService.remove(id)
        .then(toy => {
            loggerService.info(`Toy ${toy._id} removed successfully`)
            res.send(toy)
        })
        .catch(err => {
            loggerService.error(`Couldn't remove toy: ${err}`)
            res.status(500).send(`Couldn't remove toy: ${err}`)
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
    toyService.hasToys(userId)
        .then(hasToys => {
            if (!hasToys) {
                userService.remove(userId)
                    .then(() => res.send('Removed!'))
                    .catch(err => res.status(401).send(err))
            } else {
                res.status(401).send('Cannot delete user with toys')
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

function _toyFromJSON(toyJSON) {
    const { title, description, severity, labels } = toyJSON
    const toy = {
        title: title || '',
        description: description || '',
        severity: +severity || 0,
        labels: labels || []
    }
    return toy
}