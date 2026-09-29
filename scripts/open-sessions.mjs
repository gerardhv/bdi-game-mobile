import { chromium } from '@playwright/test'

const sessions = Number(process.argv.includes('--sessions') ? process.argv[process.argv.indexOf('--sessions') + 1] : 1)
const base = process.env.WEB_URL ?? 'http://localhost:5173'

const browser = await chromium.launch({ headless: false })
for (let index = 0; index < sessions; index++) {
  const host = await browser.newContext()
  const page = await host.newPage()
  await page.goto(`${base}/#/`)
  await page.getByTestId('start-session').click()
  await page.getByText('Code').waitFor()
}
console.log(`Opened ${sessions} host window(s). Join from extra browser profiles via the QR or session code.`)
await new Promise(() => {})
