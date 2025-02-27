import { safeRemove } from '@platformatic/utils'
import { deepStrictEqual, ok } from 'node:assert'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { pino } from 'pino'
import { prepareRuntime } from '../../basic/test/helper.js'
import { loadRawConfigurationFile, saveConfigurationFile } from '../lib/utils.js'
import { wattpm } from './helper.js'

const logger = pino()

test('build - should build the application', async t => {
  const { root: buildDir } = await prepareRuntime(t, 'build', false, 'watt.json')
  const serviceDir = resolve(buildDir, 'web/main')

  t.after(async () => {
    await safeRemove(resolve(serviceDir, 'dist'))
  })

  await wattpm('build', buildDir)

  ok(existsSync(resolve(serviceDir, 'dist/index.js')))
})

test('build - should handle build errors', async t => {
  const { root: buildDir } = await prepareRuntime(t, 'build-error', false, 'watt.json')
  const serviceDir = resolve(buildDir, 'web/main')

  t.after(async () => {
    await safeRemove(resolve(serviceDir, 'web/main/dist'))
  })

  const result = await wattpm('build', buildDir, { reject: false })
  deepStrictEqual(result.exitCode, 1)
  ok(result.stdout.includes('Building service "main" has failed with exit code 1.'))

  ok(!existsSync(resolve(serviceDir, 'dist/index.js')))
})

test('install - should install dependencies of autoloaded services', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json', async root => {
    await safeRemove(resolve(root, 'node_modules'))
    await safeRemove(resolve(root, 'web/main/node_modules'))
  })

  // Introduce a validation error. In that case with invalid configuration, the transformConfig will not be invoked.
  const configurationFile = resolve(rootDir, 'watt.json')
  const originalFileContents = await loadRawConfigurationFile(logger, configurationFile)
  originalFileContents.logger = { level: 'invalid' }
  await saveConfigurationFile(logger, configurationFile, originalFileContents)

  const installProcess = await wattpm('install', rootDir)

  ok(installProcess.stdout.includes('Installing dependencies for the application using npm ...'))
  ok(installProcess.stdout.includes('Installing dependencies for the service main using npm ...'))
})

test('install - should install dependencies of application and its services using npm by default', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json', async root => {
    await safeRemove(resolve(root, 'node_modules'))
    await safeRemove(resolve(root, 'web/main/node_modules'))
  })

  const installProcess = await wattpm('install', rootDir)

  ok(installProcess.stdout.includes('Installing dependencies for the application using npm ...'))
  ok(installProcess.stdout.includes('Installing dependencies for the service main using npm ...'))
})

test('install - should install dependencies of application and its services using npm by default', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json', async root => {
    await safeRemove(resolve(root, 'node_modules'))
    await safeRemove(resolve(root, 'web/main/node_modules'))
  })

  const installProcess = await wattpm('install', rootDir, '-p')

  ok(installProcess.stdout.includes('Installing production dependencies for the application using npm ...'))
  ok(installProcess.stdout.includes('Installing production dependencies for the service main using npm ...'))
})

test('install - should install dependencies of application and its services using a specific package manager', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json', async root => {
    await safeRemove(resolve(root, 'node_modules'))
    await safeRemove(resolve(root, 'web/main/node_modules'))
  })

  const installProcess = await wattpm('install', rootDir, '-P', 'pnpm')

  ok(installProcess.stdout.includes('Installing dependencies for the application using pnpm ...'))
  ok(installProcess.stdout.includes('Installing dependencies for the service main using pnpm ...'))
})

test('install - should respect the service package manager, if any', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json', async root => {
    await safeRemove(resolve(root, 'node_modules'))
    await safeRemove(resolve(root, 'web/main/node_modules'))
  })

  const configurationFile = resolve(rootDir, 'watt.json')
  const originalFileContents = await loadRawConfigurationFile(logger, configurationFile)
  originalFileContents.services = [
    {
      id: 'main',
      path: 'web/main',
      packageManager: 'npm'
    }
  ]
  await saveConfigurationFile(logger, configurationFile, originalFileContents)

  const installProcess = await wattpm('install', rootDir, '-P', 'pnpm')

  ok(installProcess.stdout.includes('Installing dependencies for the application using pnpm ...'))
  ok(installProcess.stdout.includes('Installing dependencies for the service main using npm ...'))
})

test('install - should install production dependencies only', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json', async root => {
    await safeRemove(resolve(root, 'node_modules'))
    await safeRemove(resolve(root, 'web/main/node_modules'))
  })

  const installProcess = await wattpm('install', rootDir, '-p', '-P', 'pnpm')

  ok(installProcess.stdout.includes('Installing production dependencies for the application using pnpm ...'))
  ok(installProcess.stdout.includes('Installing production dependencies for the service main using pnpm ...'))
})
