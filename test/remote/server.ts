import express from 'express'

const app = express()

app.get('/test1', (req, res) => {
  res.send([
    { name: 'Hello', value: 'World' },
    { name: 'Happy', value: 'Birthday' },
    { name: 'Merry', value: 'Christmas' },
    { name: 'Computer', value: 'Science' },
    { name: 'Santa', value: 'Claus' },
  ])
})

app.get('/test2', (req, res) => {
  setTimeout(() => {
    res.send([
      { name: 'Hello', value: 'World' },
      { name: 'Happy', value: 'Birthday' },
      { name: 'Merry', value: 'Christmas' },
      { name: 'Computer', value: 'Science' },
      { name: 'Santa', value: 'Claus' },
    ])
  }, 3000)
})

export default app.listen()
