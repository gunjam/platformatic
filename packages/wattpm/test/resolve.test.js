import { createDirectory, safeRemove } from '@platformatic/utils'
import { deepStrictEqual, ok } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { test } from 'node:test'
import { pino } from 'pino'
import { prepareRuntime, temporaryFolder } from '../../basic/test/helper.js'
import { appendEnvVariable } from '../lib/commands/external.js'
import { loadRawConfigurationFile, saveConfigurationFile } from '../lib/utils.js'
import { prepareGitRepository, wattpm } from './helper.js'

const logger = pino()

test('resolve - should clone a URL when the environment variable is set to a folder inside the repo', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  const repo = await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '{PLT_GIT_REPO_URL}')
  await appendEnvVariable(resolve(rootDir, '.env'), 'PLT_SERVICE_RESOLVED_PATH', 'web/resolved')

  const resolveProcess = await wattpm('resolve', rootDir)

  ok(resolveProcess.stdout.includes(`Cloning ${repo} into web${sep}resolved`))
  ok(resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))

  deepStrictEqual(await readFile(resolve(rootDir, 'web/resolved/branch'), 'utf8'), 'main')
})

test('resolve - should clone a URL when the environment variable is not set', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  const repo = await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '{PLT_GIT_REPO_URL}')

  const resolveProcess = await wattpm('resolve', rootDir)

  ok(resolveProcess.stdout.includes(`Cloning ${repo} into ${relative(rootDir, 'external/resolved')}`))
  ok(resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))
})

test('resolve - should do nothing when the directory already exists inside the repo', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  const repo = await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '{PLT_GIT_REPO_URL}')

  const envValue = resolve(rootDir, 'whatever')
  await createDirectory(envValue)
  await appendEnvVariable(resolve(rootDir, '.env'), 'PLT_SERVICE_RESOLVED_PATH', 'whatever')

  const resolveProcess = await wattpm('resolve', rootDir)
  ok(!resolveProcess.stdout.includes(`Cloning ${repo}`))
  ok(!resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))
})

test('resolve - should do nothing when the directory already exists outside the repo', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  const repo = await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '{PLT_GIT_REPO_URL}')

  const envValue = resolve(temporaryFolder, 'outside-' + Date.now())
  await createDirectory(envValue)
  await appendEnvVariable(resolve(rootDir, '.env'), 'PLT_SERVICE_RESOLVED_PATH', envValue)

  const resolveProcess = await wattpm('resolve', rootDir)
  ok(!resolveProcess.stdout.includes(`Cloning ${repo}`))
  ok(!resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))
})

test('resolve - should do nothing when the autogenerated directory already exists inside the repo', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  const repo = await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '{PLT_GIT_REPO_URL}')
  await createDirectory(resolve(rootDir, 'external/resolved'))

  const resolveProcess = await wattpm('resolve', rootDir)
  ok(!resolveProcess.stdout.includes(`Cloning ${repo}`))
  ok(!resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))
  ok(
    resolveProcess.stdout.includes(
      `Skipping service resolved as the generated path external${sep}resolved already exists.`
    ),
    resolveProcess.stdout
  )
})

test('resolve - should throw an error when the directory outside the repo do not exist', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  const repo = await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '{PLT_GIT_REPO_URL}')

  const envValue = resolve(temporaryFolder, 'outside-' + Date.now())
  await appendEnvVariable(resolve(rootDir, '.env'), 'PLT_SERVICE_RESOLVED_PATH', envValue)

  const resolveProcess = await wattpm('resolve', rootDir, { reject: false })
  ok(!resolveProcess.stdout.includes(`Cloning ${repo}`))
  ok(!resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))
  ok(
    resolveProcess.stdout.includes(
      `Skipping service resolved as the non existent directory ${envValue} is outside the project directory.`
    )
  )
})

test('resolve - should attempt to clone with username and password', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  t.after(() => safeRemove(rootDir))

  const url = 'https://127.0.0.1:60000/platformatic/wattpm-fixtures.git'
  process.chdir(rootDir)
  await wattpm('import', rootDir, '-i', 'resolved', url)
  const resolveProcess = await wattpm('resolve', '-u', 'foo', '-p', 'bar', rootDir, { reject: false })

  ok(resolveProcess.stdout.includes(`Cloning ${url} as user foo`))
  ok(resolveProcess.stdout.includes(`Cloning into '${resolve(rootDir, 'external/resolved')}'`))
  ok(resolveProcess.stdout.includes('Unable to clone repository of the service resolved'))
})

test('resolve - should clone a different branch', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  const repo = await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '-b', 'another', '{PLT_GIT_REPO_URL}')
  await appendEnvVariable(resolve(rootDir, '.env'), 'PLT_SERVICE_RESOLVED_PATH', 'web/resolved')

  const resolveProcess = await wattpm('resolve', rootDir)

  ok(resolveProcess.stdout.includes(`Cloning ${repo} (branch another) into web${sep}resolved`))
  ok(resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))

  deepStrictEqual(await readFile(resolve(rootDir, 'web/resolved/branch'), 'utf8'), 'another')
})

test('resolve - should install dependencies using a different package manager', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  const repo = await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '{PLT_GIT_REPO_URL}')
  await appendEnvVariable(resolve(rootDir, '.env'), 'PLT_SERVICE_RESOLVED_PATH', 'web/resolved')

  const resolveProcess = await wattpm('resolve', '-P', 'pnpm', rootDir)

  ok(resolveProcess.stdout.includes(`Cloning ${repo} into web${sep}resolved`))
  ok(resolveProcess.stdout.includes('Installing dependencies for the application using pnpm ...'))
  ok(resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))

  deepStrictEqual(await readFile(resolve(rootDir, 'web/resolved/branch'), 'utf8'), 'main')
})

test('install - should respect the service package manager, if any', async t => {
  const { root: rootDir } = await prepareRuntime(t, 'main', false, 'watt.json')
  await prepareGitRepository(t, rootDir)
  t.after(() => safeRemove(rootDir))

  process.chdir(rootDir)
  await wattpm('import', rootDir, '-h', '-i', 'resolved', '{PLT_GIT_REPO_URL}')
  await appendEnvVariable(resolve(rootDir, '.env'), 'PLT_SERVICE_RESOLVED_PATH', 'web/resolved')

  const configurationFile = resolve(rootDir, 'watt.json')
  const originalFileContents = await loadRawConfigurationFile(logger, configurationFile)
  originalFileContents.web[0].packageManager = 'npm'
  await saveConfigurationFile(logger, configurationFile, originalFileContents)

  const resolveProcess = await wattpm('resolve', '-P', 'pnpm', rootDir)

  ok(resolveProcess.stdout.includes('Installing dependencies for the service resolved using npm ...'))
})
