import { createDirectory } from '@platformatic/utils'
import { join } from 'desm'
import { execa } from 'execa'
import fastify from 'fastify'
import { promises as fs } from 'node:fs'
import { symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import stripAnsi from 'strip-ansi'

process.env.MARKETPLACE_TEST = 'true'
const pltRoot = fileURLToPath(new URL('../..', import.meta.url))

const sleep = promisify(setTimeout)

export const keys = {
  DOWN: '\x1B\x5B\x42',
  UP: '\x1B\x5B\x41',
  ENTER: '\x0D',
  SPACE: '\x20'
}

export const createPath = join(import.meta.url, '..', '..', 'create-platformatic.mjs')

const match = (str, match) => {
  if (Array.isArray(match)) {
    return match.some(m => str.includes(m))
  }
  return str.includes(match)
}

export const walk = async dir => {
  let files = await fs.readdir(dir)
  files = await Promise.all(
    files.map(async file => {
      const filePath = path.join(dir, file)
      const stats = await fs.stat(filePath)
      if (stats.isDirectory()) return walk(filePath)
      else if (stats.isFile()) return filePath
    })
  )
  return files.reduce((all, folderContents) => all.concat(folderContents), [])
}

export const getServices = async dir => {
  const files = await fs.readdir(dir)
  const services = []
  for (const file of files) {
    services.push(file)
  }
  return services
}

// Actions are in the form:
// {
//    match: 'Server listening at',
//    do: [keys.DOWN, keys.ENTER]
// }
export async function executeCreatePlatformatic (dir, actions = [], options = {}) {
  const done = options.done || 'You are all set!'
  const pkgMgrInstall = options.pkgMgrInstall || false
  const pkgManager = options.pkgManager || 'npm'
  const marketplaceHost = options.marketplaceHost

  const runCreatePlatformatic = async () => {
    const questions = [...actions]
    try {
      const execaOptions = {
        cwd: dir,
        env: {
          NO_COLOR: 'true'
        }
      }

      if (pkgManager === 'pnpm') {
        execaOptions.env.npm_config_user_agent = 'pnpm/6.14.1 npm/? node/v16.4.2 darwin x64'
      }

      const child = execa(
        'node',
        [createPath, `--install=${pkgMgrInstall.toString()}`, `--marketplace-host=${marketplaceHost}`],
        execaOptions
      )

      // We just need the "lastPrompt" printed before the process stopped to wait for an answer
      // If we don't have any outptu from process for more than 500ms, we assume it's waiting for an answer
      let lastPrompt = ''

      child.stdout.on('data', chunk => {
        const str = stripAnsi(chunk.toString()).trim()
        if (str) {
          lastPrompt = str
        }
      })

      let expectedQuestion = questions.shift()

      // We need this because the prompt prints an introduction before asking anything.
      // If we don't like this, we could use a flag to recognize when the introduction is done
      await sleep(5000)

      while (true) {
        if (!expectedQuestion) {
          await sleep(500)
          // We processed all expected questions, so now we wait for the process to be done.
          // If the "done" string is not printed, the test will timeout
          if (lastPrompt && lastPrompt.includes(done)) {
            safeKill(child)
            return
          }
        } else if (match(lastPrompt, expectedQuestion.match)) {
          console.log('==> MATCH', expectedQuestion.match)
          lastPrompt = ''

          for (const key of expectedQuestion.do) {
            child.stdin?.write(key)
            const waitAfter = expectedQuestion.waitAfter || 500
            await sleep(waitAfter)
          }
          expectedQuestion = questions.shift()
        } else {
          throw new Error(`Expected ${expectedQuestion.match}, got ${lastPrompt}`)
        }
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }
  await runCreatePlatformatic()
}

export async function safeKill (child) {
  child.kill('SIGINT')
  if (os.platform() === 'win32') {
    try {
      await execa('taskkill', ['/pid', child.pid, '/f', '/t'])
    } catch (err) {
      if (err.stderr.indexOf('not found') === 0) {
        console.error(`Failed to kill process ${child.pid}`)
        console.error(err)
      }
    }
  }
}

export async function startMarketplace (t, opts = {}) {
  const marketplace = fastify()

  marketplace.get('/templates', async (request, reply) => {
    if (opts.templatesCallback) {
      return opts.templatesCallback(request, reply)
    }
    return [{ name: '@platformatic/composer' }, { name: '@platformatic/db' }, { name: '@platformatic/service' }]
  })

  await marketplace.listen({ port: 0 })
  t.after(() => marketplace.close())

  const address = marketplace.server.address()
  return `http://127.0.0.1:${address.port}`
}

export async function linkDependencies (projectDir, dependencies) {
  for (const dep of dependencies) {
    console.log('==> Linking dependency', dep, path.resolve(projectDir, 'node_modules', dep))
    const moduleRoot = path.resolve(projectDir, 'node_modules', dep)
    const resolved = path.resolve(pltRoot, 'node_modules', dep)

    await createDirectory(path.resolve(projectDir, 'node_modules'))
    if (dep.includes('@platformatic')) {
      await createDirectory(path.resolve(projectDir, 'node_modules', '@platformatic'))
    }
    // Symlink the dependency
    await symlink(resolved, moduleRoot, 'dir')
  }
}
