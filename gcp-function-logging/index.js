import { http } from '@google-cloud/functions-framework'
import { Storage } from '@google-cloud/storage'

/* ---- Environment variables ---- */
const LOG_TOKEN = process.env.LOG_TOKEN
const LOG_BUCKET = process.env.LOG_BUCKET
const LOG_BASE_DIR = process.env.LOG_BASE_DIR

if (!LOG_TOKEN || !LOG_BUCKET || !LOG_BASE_DIR) {
  throw new Error('LOG_TOKEN, LOG_BUCKET and LOG_BASE_DIR must be set')
}

/* ---- GCS client (global) ---- */
const storage = new Storage()
const bucket = storage.bucket(LOG_BUCKET)

/* ---- HTTP Function ---- */
http('receiveLog', async (req, res) => {
  /* Method check */
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  /* Token check */
  const auth = req.get('authorization') || ''
  if (auth !== `Bearer ${LOG_TOKEN}`) {
    res.status(401).send('Unauthorized')
    return
  }

  /* Body check */
  const log = req.body
  if (!log || !log.timestamp_unix || !log.client_ip) {
    res.status(400).send('Invalid log payload')
    return
  }

  /* Timestamp validation */
  const date = new Date(log.timestamp_unix)
  if (Number.isNaN(date.getTime())) {
    res.status(400).send('Invalid timestamp')
    return
  }

  /* Path generation (UTC / Hive-style) */
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  const filename =
    `${Date.now()}-${crypto.randomUUID()}.json`

  const objectPath =
    `${LOG_BASE_DIR}/year=${year}/month=${month}/day=${day}/${filename}`

  /* Write to GCS (1 request = 1 object) */
  await bucket.file(objectPath).save(
    JSON.stringify(log),
    {
      contentType: 'application/json',
      resumable: false
    }
  )

  res.status(204).end()
})
