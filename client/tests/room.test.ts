import { chromium, Browser, Page, BrowserContext } from 'playwright'

describe('when navigating a room', () => {
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
  }

  beforeAll(async () => {
    browser = await chromium.launch({
      //headless: false,
      //slowMo: 300,
      //devtools: true,
      args: [
        '--allow-file-access-from-files', // allows API access for file:// URLs
        '--use-fake-ui-for-media-stream', // disables the translation popup
        '--disable-translate', // provide fake media streams
        '--mute-audio', // mute audio output
      ],
    })
    for (const user of users) await setupBrowser(browser, user)
  })

  afterAll(async () => {
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

  test.each(users)('user %p home page loads but does not show a room', async user => {
    const page = getPage(user)
    await page.goto('http://localhost:3000')
    expect(await page.title()).toBe('LFP')
    expect(await page.$('.room')).toBeNull()
  })

  test.each(users)('user %p can navigate to a room but will not enter room until login', async user => {
    const page = getPage(user)
    await page.goto('http://localhost:3000/room/123')
    expect(await page.$('.room')).toBeNull()
  })

  test.each(users)('user %p can login and enter a room', async user => {
    const page = getPage(user)
    const login = await page.$('.login input[type="text"]')
    const loginSubmit = await page.$('.login button')

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
    expect(await page.$('.call-control button.leave-call')).toBeNull()
    expect(await page.$('.call-control button.mute')).toBeNull()
    expect(await page.$('.call-control button.unmute')).toBeNull()
    // peer control shouldn't have incall styles
    expect(await page.$eval(`.peer-control[data-name=${user}]`, e => getComputedStyle(e).fontWeight)).toBe('400')
    expect(await page.$eval(`.peer-control[data-name=${user}]`, e => getComputedStyle(e).boxShadow)).toBe('none')
    // dont show mute/unmute for current user peer control, ever
    expect(await page.$(`.peer-control[data-name=${user}] button.mute`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] button.unmute`)).toBeNull()
    // current user shouldn't have test buttons yet
    expect(await page.$(`.peer-control[data-name=${user}] button.test`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] button.stop-test`)).toBeNull()
    // current user shouldn't see decibel control stuff yet
    expect(await page.$(`.peer-control[data-name=${user}] .visualizer`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .threshold`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] .gain`)).toBeNull()
  })

  test.each(users)('user %p can join call and then see the default "inCall" UI', async user => {
    const page = getPage(user)
    const joinCall = await page.$('button.join-call')
    expect(joinCall).not.toBeNull()
    await joinCall?.click()

    await page.waitForSelector('.call-control button.leave-call')

    expect(await page.$('.call-control button.leave-call')).not.toBeNull()
    expect(await page.$('.call-control button.mute')).not.toBeNull()
    // unmute shouldn't show unless they click mute
    expect(await page.$('.call-control button.unmute')).toBeNull()
    // peer control should now have incall styles
    expect(await page.$eval(`.peer-control[data-name=${user}]`, e => getComputedStyle(e).fontWeight)).not.toBe('400')
    expect(await page.$eval(`.peer-control[data-name=${user}]`, e => getComputedStyle(e).boxShadow)).not.toBe('none')
    // dont show mute/unmute for current user peer control, ever
    expect(await page.$(`.peer-control[data-name=${user}] button.mute`)).toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] button.unmute`)).toBeNull()
    // current user should now have test button
    expect(await page.$(`.peer-control[data-name=${user}] button.test`)).not.toBeNull()
    expect(await page.$(`.peer-control[data-name=${user}] button.stop-test`)).toBeNull()
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
    const muteBtn = await page.$('.call-control button.mute')
    expect(muteBtn).not.toBeNull()
    await muteBtn?.click()

    const unmuteBtn = await page.$('.call-control button.unmute')
    expect(unmuteBtn).not.toBeNull()
    await unmuteBtn?.click()

    expect(await page.$('.call-control button.mute')).not.toBeNull()
    expect(await page.$('.call-control button.unmute')).toBeNull()
  })

  test.each(users)('user %p toggling test works properly', async user => {
    const page = getPage(user)
    const testBtn = await page.$('.peer-control button.test')
    expect(testBtn).not.toBeNull()
    await testBtn?.click()

    const stopTestBtn = await page.$('.peer-control button.stop-test')
    expect(stopTestBtn).not.toBeNull()
    await stopTestBtn?.click()

    expect(await page.$('.peer-control button.test')).not.toBeNull()
    expect(await page.$('.peer-control button.stop-test')).toBeNull()
  })

  test.each(users)('user %p can mute other users', async user => {
    const page = getPage(user)

    for (const otherUser of users.filter(u => u !== user)) {
      const muteBtn = await page.$(`.peer-control[data-name=${otherUser}] button.mute`)
      expect(muteBtn).not.toBeNull()
      await muteBtn?.click()

      const unmuteBtn = await page.$(`.peer-control[data-name=${otherUser}] button.unmute`)
      expect(unmuteBtn).not.toBeNull()
      expect(await page.$(`.peer-control[data-name=${otherUser}] button.mute`)).toBeNull()
      await unmuteBtn?.click()

      expect(await page.$(`.peer-control[data-name=${otherUser}] button.unmute`)).toBeNull()
      expect(await page.$(`.peer-control[data-name=${otherUser}] button.mute`)).not.toBeNull()
    }
  })
})
