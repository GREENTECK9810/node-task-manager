const express = require('express')
const User = require('../models/users')
const auth = require('../middleware/auth')
const multer = require('multer')
const sharp = require('sharp')
const router = new express.Router()

router.post('/users', async (req, res) => {
    const user = new User(req.body)
    
    try {
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({user, token})
    }catch (e) {
        res.status(400).send(e)
    }

})

router.post('/users/login', async (req, res) => {
    try{
    const user = await User.findByCredentials(req.body.email, req.body.password)
    const token = await user.generateAuthToken()
    res.send({ user, token})
    } catch (e) {
        res.status(400).send()
    }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        const user = req.user
        user.tokens = user.tokens.filter((token) => {
            return token.token !== req.token
        })

        await user.save()
        res.status(200).send()
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.status(200).send()
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/users/me', auth, async (req, res) => {

    res.send(req.user)

})

router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const ValidUpdates = ['name','email','password','age']
    const isValidUpdates = updates.every((update) => ValidUpdates.includes(update))

    if(!isValidUpdates){
        return res.status(400).send('Invalid updates')
    }

    try {

        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.delete('/users/me', auth, async (req, res) => {

    try {
        await req.user.remove()
        res.send(req.user)
    } catch (e) {
        res.status(500).send(e)
    }
})



const upload = multer({
    limits: {
        fileSize: 1000000,
    },
    fileFilter(req, file, cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png|jfif)$/)){
            return cb(new Error('Please upload an image'))
        }

        cb(undefined, true)
    }
})
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {

    const buffer = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer()
    
    req.user.avatar = buffer
    await req.user.save()

    res.send()
}, (error, req, res, next) => {
    res.status(400).send({error: error.message})
})

router.delete('/users/me/avatar', auth, async(req, res) => {
    
    req.user.avatar = undefined
    await req.user.save()

    res.send()
})

router.get('/users/me/avatar', auth, async(req, res) => {

    try {

        const user = req.user

        if(!user || !user.avatar){
            throw new Error()
        }

        res.set('Content-Type', 'image/jpg')
        res.send(user.avatar)
        
    } catch (e) {
        res.status(404).send()
    }
})

module.exports = router