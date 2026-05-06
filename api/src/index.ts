import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ticketRoutes } from './routes/tickets'
import { merchantRoutes } from './routes/merchants'

const app = Fastify({ logger: true })

app.register(cors, {
  origin: process.env.WEB_URL || '*',
})

app.register(ticketRoutes, { prefix: '/api' })
app.register(merchantRoutes, { prefix: '/api' })

app.get('/health', async () => ({ status: 'ok' }))

const port = parseInt(process.env.PORT ?? '3001', 10)

app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
