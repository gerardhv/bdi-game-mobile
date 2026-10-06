import { expect, test, type Browser, type Page } from '@playwright/test'

const ACCESS_ORGS = ['admin', 'owner', 'provider', 'consumer'] as const
type AccessOrg = (typeof ACCESS_ORGS)[number]

const PHONE_SIZES: Record<AccessOrg, { width: number; height: number }> = {
  admin: { width: 360, height: 640 },
  owner: { width: 390, height: 844 },
  provider: { width: 430, height: 932 },
  consumer: { width: 360, height: 640 },
}

async function openAccessHost(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await context.newPage()
  await page.goto('/#/')
  await page.getByTestId('game-access').click()
  await page.getByTestId('start-session').click()
  await expect(page.getByTestId('session-code')).toBeVisible()
  const code = (await page.getByTestId('session-code').innerText()).trim()
  return { context, page, code }
}

async function joinAccess(browser: Browser, code: string, org: AccessOrg) {
  const context = await browser.newContext({ viewport: PHONE_SIZES[org], isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto(`/#/join?code=${code}`)
  await page.getByTestId(`free-${org}`).click()
  await page.getByTestId('claim-role').click()
  await expect(page.getByTestId(`phone-${org}`)).toBeVisible()
  await page.getByTestId('ready').click()
  return { context, page }
}

async function waitHold(page: Page) {
  await page.waitForTimeout(3200)
}

test('access happy path: onboard, auth, policy, revoke, restore', async ({ browser }) => {
  test.setTimeout(6 * 60_000)
  const host = await openAccessHost(browser)
  const phones: Record<AccessOrg, Page> = {} as Record<AccessOrg, Page>
  for (const org of ACCESS_ORGS) {
    phones[org] = (await joinAccess(browser, host.code, org)).page
  }
  await expect(host.page.getByTestId('access-board').or(host.page.getByTestId('start-round'))).toBeVisible({ timeout: 15000 })
  if (await host.page.getByTestId('start-round').isVisible().catch(() => false)) {
    await host.page.getByTestId('start-round').click()
  }
  await expect(host.page.getByTestId('access-board')).toBeVisible({ timeout: 15000 })

  await phones.consumer.getByTestId('submit-dossier').click()
  await waitHold(host.page)
  await phones.admin.getByTestId('commit-dossier').click()
  await waitHold(host.page)
  await expect(host.page.getByTestId('access-phase-strip')).toBeVisible()
  await expect(host.page.getByTestId('phase-involve')).toHaveClass(/status-active/)
  await phones.owner.getByTestId('register-carrier').click()
  await waitHold(host.page)
  await phones.owner.getByTestId('set-policy').click()
  await waitHold(host.page)
  await phones.consumer.getByTestId('cred-cred-valid').click()
  await waitHold(host.page)
  await phones.provider.getByTestId('check-request').click()
  await waitHold(host.page)
  await phones.consumer.getByTestId('ask-load-T-101').click()
  await waitHold(host.page)
  await phones.consumer.getByTestId('ask-finance-T-101').click()
  await waitHold(host.page)
  await phones.consumer.getByTestId('ask-load-T-102').click()
  await waitHold(host.page)
  await phones.owner.getByTestId('set-policy').click()
  await waitHold(host.page)
  await phones.consumer.getByTestId('ask-load-T-101').click()
  await waitHold(host.page)
  await phones.owner.getByTestId('set-policy').click()
  await waitHold(host.page)
  await phones.consumer.getByTestId('ask-load-T-101').click()
  await waitHold(host.page)
  await expect(host.page.getByTestId('access-debrief')).toBeVisible({ timeout: 15000 })
  await expect(phones.consumer.getByTestId('received-load-T-101')).toBeVisible()

  const hostScroll = await host.page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, w: window.innerWidth,
    sh: document.documentElement.scrollHeight, h: window.innerHeight,
  }))
  expect(hostScroll.sw).toBeLessThanOrEqual(hostScroll.w)
  expect(hostScroll.sh).toBeLessThanOrEqual(hostScroll.h + 2)
})
