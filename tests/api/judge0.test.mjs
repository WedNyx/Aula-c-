import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.JUDGE0_API_KEY = 'test-secret'
process.env.JUDGE0_API_HOST = 'judge0.test'
process.env.JUDGE0_API_URL = 'https://judge0.test'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_SERVICE_KEY
delete process.env.KV_REST_API_URL
delete process.env.KV_REST_API_TOKEN

const calls = []
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options })
  if (String(url).endsWith('/languages')) {
    return Response.json([{ id: 51, name: 'C# (Mono 6.6.0.161)' }, { id: 99, name: 'C# (Mono 7.0.0)' }])
  }
  if (options.method === 'POST') return Response.json({ token: 'abc-123' })
  return Response.json({
    stdout: Buffer.from('Olá, Wed!\n').toString('base64'),
    stderr: null,
    compile_output: null,
    message: null,
    status: { id: 3, description: 'Accepted' },
    time: '0.02',
    memory: 4096,
  })
}

function request(body) {
  return { method: 'POST', body, headers: { 'x-forwarded-for': '203.0.113.4' }, socket: {} }
}

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

const handlerPath = pathToFileURL(path.join(dirname, '../../api/execute-code.js')).href
const { default: handler } = await import(handlerPath)
const res = response()
await handler(request({
  language: 'csharp',
  mode: 'run',
  stdin: 'Wed',
  files: [
    { name: 'Program.cs', code: 'using System;\nConsole.WriteLine($"Olá, {Console.ReadLine()}!");' },
    { name: 'Pessoa.cs', code: 'using System;\nclass Pessoa {}' },
  ],
}), res)

assert.equal(res.statusCode, 200)
assert.equal(res.body.success, true)
assert.equal(res.body.stdout, 'Olá, Wed!\n')
assert.equal(calls[0].options.headers['X-RapidAPI-Key'], 'test-secret')
assert.equal(calls[0].options.headers['X-RapidAPI-Host'], 'judge0.test')

const submission = calls.find((call) => call.options.method === 'POST')
const submittedBody = JSON.parse(submission.options.body)
assert.equal(submittedBody.language_id, 99)
assert.equal(submittedBody.enable_network, false)
assert.equal(Buffer.from(submittedBody.stdin, 'base64').toString(), 'Wed')
const submittedCode = Buffer.from(submittedBody.source_code, 'base64').toString()
assert.equal((submittedCode.match(/using System;/g) || []).length, 1)
assert.match(submittedCode, /Pessoa\.cs/)

const invalid = response()
await handler(request({ language: 'python', sourceCode: 'print(1)' }), invalid)
assert.equal(invalid.statusCode, 400)
assert.equal(invalid.body.error, 'language_not_allowed')

const health = response()
await handler({ method: 'GET', headers: {}, socket: {} }, health)
assert.equal(health.body.configured, true)
assert.equal(health.body.available, true)
assert.equal(health.body.language.id, 99)

console.log('✅ Judge0: execução, segurança, C# e health check validados')
