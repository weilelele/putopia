// Disposable native MongoDB. No existing environment files or remote URI accepted.
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { MongoClient } from 'mongodb'
const base = '/private/tmp/putopia-initiation-sandbox'
const { MongoMemoryServer } = await import(pathToFileURL(`${base}/mongo/node_modules/mongodb-memory-server-core/lib/index.js`))
const server = await MongoMemoryServer.create({ binary: { version: '8.2.6', downloadDir: `${base}/mongo-binaries` }, instance: { ip: '127.0.0.1' } })
const uri = server.getUri('putopia_payment_sandbox')
assert.equal(new URL(uri).hostname, '127.0.0.1')
const client = new MongoClient(uri)
try {
  await client.connect()
  const collection = client.db().collection('verification_marker')
  await collection.insertOne({ name: 'isolated-payment-fixture' })
  assert.equal((await collection.findOne({ name: 'isolated-payment-fixture' })).name, 'isolated-payment-fixture')
  await fs.writeFile(`${base}/mongo.env`, `COSMO_MONGO_URI=${uri}\n`, { mode: 0o600 })
  console.log(JSON.stringify({ mongo: '8.2.6 native loopback', writeRead: 'passed', productionConnection: false, serving: process.argv.includes('--serve') }))
  if (process.argv.includes('--serve')) await new Promise(resolve => {
    process.once('SIGINT', resolve); process.once('SIGTERM', resolve)
  })
} finally {
  await client.close()
  await server.stop()
  await fs.rm(`${base}/mongo.env`, { force: true })
}
