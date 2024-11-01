import { resolve } from 'node:path'
import { test } from 'node:test'
import {
  createRuntime,
  fixturesDir,
  setFixturesDir,
  setHMRTriggerFile,
  verifyHMR,
  verifyHTMLViaHTTP,
  verifyHTMLViaInject,
  verifyJSONViaHTTP,
  verifyJSONViaInject
} from '../../basic/test/helper.js'
import { safeRemove } from '../../utils/index.js'

process.setMaxListeners(100)

setFixturesDir(resolve(import.meta.dirname, './fixtures'))
setHMRTriggerFile('services/frontend/src/app/page.js')

function websocketHMRHandler (message, resolveConnection, resolveReload) {
  switch (message.action) {
    case 'sync':
      resolveConnection()
      break
    case 'serverComponentChanges':
      resolveReload()
  }
}

// Make sure no temporary files exist after execution
test.afterEach(() => {
  return Promise.all([
    safeRemove(resolve(fixturesDir, 'tmp')),
    safeRemove(resolve(fixturesDir, 'services/backend/dist')),
    safeRemove(resolve(fixturesDir, 'services/composer/dist')),
    safeRemove(resolve(fixturesDir, 'services/frontend/.next'))
  ])
})

// In this test there is purposely no platformatic.application.json file to see if we work without one
test('should detect and start a Next.js application in development mode', async t => {
  const { url } = await createRuntime(t, 'standalone')

  await verifyHTMLViaHTTP(url, '/', ['<script src="/_next/static/chunks/main-app.js'])
  await verifyHMR(url, '/_next/webpack-hmr', undefined, websocketHMRHandler)
})

test('should detect and start a Next.js application in development mode when exposed in a composer with a prefix', async t => {
  const { runtime, url } = await createRuntime(t, 'composer-with-prefix')

  const htmlContents = ['<script src="/frontend/_next/static/chunks/main-app.js']

  await verifyHTMLViaHTTP(url, '/frontend/', htmlContents)
  await verifyHTMLViaInject(runtime, 'composer', '/frontend', htmlContents)
  await verifyHMR(url, '/frontend/_next/webpack-hmr', undefined, websocketHMRHandler)

  await verifyJSONViaHTTP(url, '/example', 200, { hello: 'foobar' })
  await verifyJSONViaHTTP(url, '/frontend/on-composer', 200, { ok: true })
  await verifyJSONViaHTTP(url, '/backend/example', 200, { hello: 'foobar' })

  await verifyJSONViaInject(runtime, 'composer', 'GET', '/example', 200, { hello: 'foobar' })
  await verifyJSONViaInject(runtime, 'composer', 'GET', '/frontend/on-composer', 200, { ok: true })
  await verifyJSONViaInject(runtime, 'backend', 'GET', '/example', 200, { hello: 'foobar' })
})

test('should detect and start a Next.js application in development mode when exposed in a composer without a prefix', async t => {
  const { runtime, url } = await createRuntime(t, 'composer-without-prefix')

  const htmlContents = ['<script src="/_next/static/chunks/main-app.js']

  await verifyHTMLViaHTTP(url, '/', htmlContents)
  await verifyHTMLViaInject(runtime, 'composer', '/', htmlContents)
  await verifyHMR(url, '/_next/webpack-hmr', undefined, websocketHMRHandler)

  await verifyJSONViaHTTP(url, '/example', 200, { hello: 'foobar' })
  await verifyJSONViaHTTP(url, '/on-composer', 200, { ok: true })
  await verifyJSONViaHTTP(url, '/backend/example', 200, { hello: 'foobar' })

  await verifyJSONViaInject(runtime, 'composer', 'GET', '/example', 200, { hello: 'foobar' })
  await verifyJSONViaInject(runtime, 'composer', 'GET', '/on-composer', 200, { ok: true })
  await verifyJSONViaInject(runtime, 'backend', 'GET', '/example', 200, { hello: 'foobar' })
})

// In this file the platformatic.runtime.json purposely does not specify a platformatic.application.json to see if we automatically detect one
test('should detect and start a Next.js application in development mode when exposed in a composer with a custom config and by autodetecting the prefix', async t => {
  const { runtime, url } = await createRuntime(t, 'composer-autodetect-prefix')

  const htmlContents = ['<script src="/nested/base/dir/_next/static/chunks/main-app.js']

  await verifyHTMLViaHTTP(url, '/nested/base/dir/', htmlContents)
  await verifyHTMLViaInject(runtime, 'composer', '/nested/base/dir', htmlContents)
  await verifyHMR(url, '/nested/base/dir/_next/webpack-hmr', undefined, websocketHMRHandler)

  await verifyJSONViaHTTP(url, '/example', 200, { hello: 'foobar' })
  await verifyJSONViaHTTP(url, '/nested/base/dir/on-composer', 200, { ok: true })
  await verifyJSONViaHTTP(url, '/backend/example', 200, { hello: 'foobar' })

  await verifyJSONViaInject(runtime, 'composer', 'GET', '/example', 200, { hello: 'foobar' })
  await verifyJSONViaInject(runtime, 'composer', 'GET', '/nested/base/dir/on-composer', 200, { ok: true })
  await verifyJSONViaInject(runtime, 'backend', 'GET', '/example', 200, { hello: 'foobar' })
})

test('should detect and start a Next.js application in development mode with working React Server Components and Next.js Server API', async t => {
  const { runtime, url } = await createRuntime(t, 'server-side')

  const htmlContents = ['<script src="/frontend/_next/static/chunks/main-app.js']

  await verifyHTMLViaHTTP(url, '/frontend/', htmlContents)
  await verifyHTMLViaInject(runtime, 'composer', '/frontend', htmlContents)
  await verifyHMR(url, '/frontend/_next/webpack-hmr', undefined, websocketHMRHandler)

  await verifyJSONViaHTTP(url, '/example', 200, { hello: 'foobar' })
  await verifyJSONViaHTTP(url, '/frontend/on-composer', 200, { ok: true })
  await verifyJSONViaHTTP(url, '/backend/example', 200, { hello: 'foobar' })
  await verifyJSONViaHTTP(url, '/backend/mesh', 200, { ok: true })

  await verifyJSONViaInject(runtime, 'composer', 'GET', '/example', 200, { hello: 'foobar' })
  await verifyJSONViaInject(runtime, 'composer', 'GET', '/frontend/on-composer', 200, { ok: true })
  await verifyJSONViaInject(runtime, 'backend', 'GET', '/example', 200, { hello: 'foobar' })
  await verifyJSONViaInject(runtime, 'backend', 'GET', '/mesh', 200, { ok: true })
})

test('should detect and start a Next.js application in development mode when using custom commands', async t => {
  const { runtime, url } = await createRuntime(t, 'composer-custom-commands')

  const htmlContents = ['<script src="/frontend/_next/static/chunks/main-app.js']

  await verifyHTMLViaHTTP(url, '/frontend/', htmlContents)
  await verifyHTMLViaInject(runtime, 'composer', '/frontend', htmlContents)
  await verifyHMR(url, '/frontend/_next/webpack-hmr', undefined, websocketHMRHandler)

  await verifyJSONViaHTTP(url, '/example', 200, { hello: 'foobar' })
  await verifyJSONViaHTTP(url, '/frontend/on-composer', 200, { ok: true })
  await verifyJSONViaHTTP(url, '/backend/example', 200, { hello: 'foobar' })

  await verifyJSONViaInject(runtime, 'composer', 'GET', '/example', 200, { hello: 'foobar' })
  await verifyJSONViaInject(runtime, 'composer', 'GET', '/frontend/on-composer', 200, { ok: true })
  await verifyJSONViaInject(runtime, 'backend', 'GET', '/example', 200, { hello: 'foobar' })
})
