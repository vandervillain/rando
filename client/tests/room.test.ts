import { chromium, Browser, Page, BrowserContext } from 'playwright'

const clientUrl = "http://localhost:3000"

describe('when navigating a room', () => {
  let log: string = ''
  const users = ['A', 'B', 'C']
  let browser: Browser
  const contexts: Record<string, BrowserContext> = {}
  const pages: Record<string, Page> = {}

  const getPage = (user: string) => pages[user]
  const setupBrowser = async (browser: Browser, user: string) => {
    contexts[user] = await browser.newContext({
      permissions: ['microphone'],
    })
    pages[user] = await contexts[user].newPage()
    pages[user].on('console', m => {
      log += `${user}: ${m.text()}\n`
    })
  }
  const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  beforeAll(async () => {
    browser = await chromium.launch({
      // logger: {
      //   isEnabled: () => true,
      //   log: (name, severity, message) => console.log(message)
      // },
      //headless: false,
      //slowMo: 300,
      //devtools: true,
      args: [
        '--allow-file-access-from-files', // allows API access for file:// URLs
        '--use-fake-device-for-media-stream', // use fake device for Media Stream to replace actual camera and microphone.
        '--use-fake-ui-for-media-stream', // bypass the media stream infobar by selecting the default device for media streams
        '--disable-translate', // provide fake media streams
        '--mute-audio', // mute audio output
      ],
    })
    for (const user of users) await setupBrowser(browser, user)
  })

  afterAll(async () => {
    console.log(log)

    for (let p in pages) {
      await pages[p].close()
      delete pages[p]
    }
    for (let c in contexts) {
      await contexts[c].close()
      delete contexts[c]
    }
    await browser.close()
  })

  test.each(users)('user %p home page loads, shows create room', async user => {
    const page = getPage(user)
    await page.goto(clientUrl)
    expect(await page.title()).toBe('rando')
    expect(await page.$('.create-room')).not.toBeNull()
  })

  test.each(users)('user %p can navigate to a room but will not enter room until login', async user => {
    const page = getPage(user)
    await page.goto(`${clientUrl}/r/test`)

    expect(await page.$('.room')).toBeNull()
    expect(await page.$('.login input[type="text"]')).not.toBeNull()
  })

  test.each(users)('user %p can create a room', async user => {
    const page = getPage(user)
    await page.goto(clientUrl)

    const roomInput = await page.$('.create-room input[type="text"]')
    const roomSubmit = await page.$('.create-room .submit')

    expect(roomInput).not.toBeNull()
    expect(roomSubmit).not.toBeNull()

    await roomInput?.type('test')
    await roomSubmit?.click()

    const login = await page.waitForSelector('.login input[type="text"]')
    expect(login).not.toBeNull()
  })

  test.each(users)('user %p can login', async user => {
    const page = getPage(user)

    const login = await page.$('.login input[type="text"]')
    const loginSubmit = await page.$('.login .submit')

    expect(login).not.toBeNull()
    expect(loginSubmit).not.toBeNull()

    await login?.type(user)
    await loginSubmit?.click()

    expect(await page.$('.room')).not.toBeNull()
  })

  test.each(users)('user %p can see all members in room', async user => {
    const page = getPage(user)
    for (const user of users) expect(await page.$(`.peer-control[data-name=${user}]`)).not.toBeNull()
  })

  test.each(users)('user %p does not see the "inCall" UI before joining the call', async user => {
    const page = getPage(user)
    expect(await page.$('.call-control .leave-call')).toBeNull()
    expect(await page.$('.call-control .mute')).toBeNull()
    expect(await page.$('.call-control .unmute')).toBeNull()
    // peer control shouldn't have incall styles
    expect(await page.$eval(`.peer-control[data-name=${user}]`, e => getComputedStyle(e).fontWeight)).toBe('400')
    expect(await page.$eval(`.peer-control[data-name=${user}]`, e => getComputedStyle(e).boxShadow)).toBe('none')
    // dont show mute/unmute for current user peer control, ever
    expect(await page.$(`.peer-control[data-name=${user}] .mute`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .unmute`)).toBeNull()
    // current user shouldn't have test buttons yet
    expect(await page.$(`.peer-control[data-name=${user}] .test`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .stop-test`)).toBeNull()
    // current user shouldn't see decibel control stuff yet
    expect(await page.$(`.peer-control[data-name=${user}] .visualizer`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .threshold`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .gain`)).toBeNull()
  })

  test.each(users)('user %p can join call and then see the default "inCall" UI', async user => {
    const page = getPage(user)
    const joinCall = await page.$('.join-call')
    expect(joinCall).not.toBeNull()
    await joinCall?.click()

    try {
      await page.waitForSelector('.call-control .leave-call', { timeout: 5000 })
    } catch (e) {
      console.error(e)
      await page.screenshot({ path: 'tests/screenshots/join-call-timeout.png', fullPage: true })
    }

    expect(await page.$('.call-control .leave-call')).not.toBeNull()
    expect(await page.$('.call-control .mute')).not.toBeNull()
    // unmute shouldn't show unless they click mute
    expect(await page.$('.call-control .unmute')).toBeNull()
    // peer control should now have incall styles
    expect(await page.$eval(`.peer-control[data-name=${user}]`, e => getComputedStyle(e).fontWeight)).not.toBe('400')
    expect(await page.$eval(`.peer-control[data-name=${user}]`, e => getComputedStyle(e).boxShadow)).not.toBe('none')
    // dont show mute/unmute for current user peer control, ever
    expect(await page.$(`.peer-control[data-name=${user}] .mute`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .unmute`)).toBeNull()
    // current user should now have test button
    expect(await page.$(`.peer-control[data-name=${user}] .test`)).not.toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .stop-test`)).toBeNull()
    // current user should now see decibel control stuff
    expect(await page.$(`.peer-control[data-name=${user}] .visualizer`)).not.toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .threshold`)).not.toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .gain`)).not.toBeNull()
  })

  test.each(users)('user %p can see that all members in room are in call', async user => {
    const page = getPage(user)
    for (const user of users) expect(await page.$(`.peer-control[data-name=${user}][data-incall=true]`)).not.toBeNull()
  })

  test.each(users)('user %p toggling self mute works properly', async user => {
    const page = getPage(user)
    const muteBtn = await page.$('.call-control .mute')
    expect(muteBtn).not.toBeNull()
    await muteBtn?.click()

    const unmuteBtn = await page.$('.call-control .unmute')
    expect(unmuteBtn).not.toBeNull()
    await unmuteBtn?.click()

    expect(await page.$('.call-control .mute')).not.toBeNull()
    expect(await page.$('.call-control .unmute')).toBeNull()
  })

  test.each(users)('user %p toggling test works properly', async user => {
    const page = getPage(user)
    const testBtn = await page.$('.peer-control .test')
    expect(testBtn).not.toBeNull()
    await testBtn?.click()

    const stopTestBtn = await page.$('.peer-control .stop-test')
    expect(stopTestBtn).not.toBeNull()
    await stopTestBtn?.click()

    expect(await page.$('.peer-control .test')).not.toBeNull()
    expect(await page.$('.peer-control .stop-test')).toBeNull()
  })

  test.each(users)('user %p can mute other users', async user => {
    const page = getPage(user)

    for (const otherUser of users.filter(u => u !== user)) {
      const muteBtn = await page.$(`.peer-control[data-name=${otherUser}] .mute`)
      expect(muteBtn).not.toBeNull()
      await muteBtn?.click()

      const unmuteBtn = await page.$(`.peer-control[data-name=${otherUser}] .unmute`)
      expect(unmuteBtn).not.toBeNull()
      expect(await page.$(`.peer-control[data-name=${otherUser}] .mute`)).toBeNull()
      await unmuteBtn?.click()

      expect(await page.$(`.peer-control[data-name=${otherUser}] .unmute`)).toBeNull()
      expect(await page.$(`.peer-control[data-name=${otherUser}] .mute`)).not.toBeNull()
    }
  })
})
