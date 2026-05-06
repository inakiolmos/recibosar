import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

async function seed() {
  console.log('Seeding...')

  // Merchant de prueba
  const [merchant] = await sql<{ id: string }[]>`
    INSERT INTO merchants (name, slug, brand_color, subscription_status)
    VALUES ('La Parrilla de Don Juan', 'don-juan', '#c1440e', 'trial')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `
  console.log(`Merchant: ${merchant.id}`)

  // Tiles
  const [tile1] = await sql<{ id: string }[]>`
    INSERT INTO tiles (merchant_id, location_label)
    VALUES (${merchant.id}, 'Caja 1')
    RETURNING id
  `
  await sql`
    INSERT INTO tiles (merchant_id, location_label)
    VALUES (${merchant.id}, 'Caja 2')
  `
  console.log(`Tiles creadas`)

  // Ticket reciente (dentro de la ventana de 5 min) para que la demo funcione
  const [ticket] = await sql<{ id: string }[]>`
    INSERT INTO tickets (
      merchant_id, tile_id, items,
      subtotal, tax, total, currency,
      emitted_at
    ) VALUES (
      ${merchant.id},
      ${tile1.id},
      ${sql.json([
        { description: 'Asado x2 personas', qty: 1, unit_price: 8500, total: 8500 },
        { description: 'Morcilla artesanal', qty: 2, unit_price: 1200, total: 2400 },
        { description: 'Empanadas x6', qty: 1, unit_price: 2100, total: 2100 },
        { description: 'Coca-Cola 500ml', qty: 3, unit_price: 850, total: 2550 },
      ])},
      ${13677.69},
      ${2872.31},
      ${15550},
      'ARS',
      NOW()
    )
    RETURNING id
  `
  console.log(`Ticket reciente: ${ticket.id}`)

  // Tickets históricos (fuera de la ventana)
  await sql`
    INSERT INTO tickets (
      merchant_id, tile_id, items,
      subtotal, tax, total, currency,
      emitted_at
    ) VALUES
    (
      ${merchant.id}, ${tile1.id},
      ${sql.json([
        { description: 'Picada grande', qty: 1, unit_price: 5500, total: 5500 },
        { description: 'Cerveza Quilmes', qty: 4, unit_price: 900, total: 3600 },
      ])},
      ${7521.01}, ${1578.99}, ${9100}, 'ARS',
      NOW() - INTERVAL '2 hours'
    ),
    (
      ${merchant.id}, ${tile1.id},
      ${sql.json([
        { description: 'Bife de chorizo', qty: 2, unit_price: 4200, total: 8400 },
        { description: 'Ensalada mixta', qty: 1, unit_price: 1800, total: 1800 },
        { description: 'Agua mineral', qty: 2, unit_price: 600, total: 1200 },
      ])},
      ${9421.49}, ${1978.51}, ${11400}, 'ARS',
      NOW() - INTERVAL '5 hours'
    )
  `
  console.log('Tickets históricos creados')

  await sql.end()
  console.log('Seed completo.')
  console.log('')
  console.log('Demo: abrí http://localhost:3000/r/don-juan en el celular.')
  console.log('Merchant ID:', merchant.id)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
