import express from 'express'

const app = express()

app.get('/', (req, res) => {
  res.send([
    { name: 'Hello', value: 'World' },
    { name: 'Happy', value: 'Birthday' },
    { name: 'Merry', value: 'Christmas' },
    { name: 'Computer', value: 'Science' },
    { name: 'Santa', value: 'Claus' },
  ])
})

export default app.listen()
