import { chromium } from 'playwright'

const roomId = process.env.ROOM_ID ?? `harness-${Date.now()}`
const baseOrigin = process.env.BASE_URL ?? 'http://localhost:5173'
const baseUrl = `${baseOrigin}${baseOrigin.includes('?') ? '&' : '?'}room=${encodeURIComponent(roomId)}`
const probeName = `persist_probe_${Date.now().toString().slice(-6)}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

async function fieldDisplayNameEquals(fieldId, expectedName) {
	return page.evaluate(
		({ targetFieldId, expected }) => {
			if (!window.__reviewDebug) return false
			return window.__reviewDebug.getFieldDisplayName(targetFieldId) === expected
		},
		{ targetFieldId: fieldId, expected: expectedName }
	)
}

async function waitForFieldName(fieldId, expectedName, timeoutMs = 15000) {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (await fieldDisplayNameEquals(fieldId, expectedName)) return true
		await page.waitForTimeout(250)
	}
	return false
}

page.on('console', (msg) => {
	console.log(`[browser:${msg.type()}] ${msg.text()}`)
})

try {
	console.log(`[harness] opening ${baseUrl}`)
	await page.goto(baseUrl, { waitUntil: 'networkidle' })
	await page.getByRole('button', { name: /copy room link/i }).waitFor({ timeout: 30000 })
	await page.waitForFunction(() => window.__reviewReady === true, { timeout: 30000 })

	if (process.env.SKIP_RESET !== '1') {
		console.log('[harness] resetting canvas to baseline')
		await page.getByRole('button', { name: 'Reset' }).click()
		await page.waitForTimeout(1500)
	}

	const targetFieldId = await page.evaluate(() => window.__reviewDebug?.getFirstEditableFieldId() ?? null)
	if (!targetFieldId) {
		throw new Error('Could not resolve target editable field id')
	}
	console.log(`[harness] invoking rename flow for field ${targetFieldId} -> ${probeName}`)
	await page.waitForFunction(() => !!window.__reviewDebug, { timeout: 15000 })
	await page.evaluate(
		({ fieldId, newName }) => {
			window.__reviewDebug.renameField(fieldId, newName)
		},
		{ fieldId: targetFieldId, newName: probeName }
	)
	if (!(await waitForFieldName(targetFieldId, probeName))) {
		const actual = await page.evaluate(
			(fieldId) => window.__reviewDebug?.getFieldDisplayName(fieldId) ?? null,
			targetFieldId
		)
		console.log(`[harness] post-edit field value observed: ${actual}`)
		throw new Error('Probe value was not visible in v4 spec state after edit')
	}
	console.log('[harness] reloading page and re-checking')
	await page.reload({ waitUntil: 'networkidle' })
	await page.getByRole('button', { name: /copy room link/i }).waitFor({ timeout: 30000 })
	await page.waitForFunction(() => window.__reviewReady === true, { timeout: 30000 })
	await page.waitForFunction(() => !!window.__reviewDebug, { timeout: 15000 })
	if (!(await waitForFieldName(targetFieldId, probeName))) {
		const actual = await page.evaluate(
			(fieldId) => window.__reviewDebug?.getFieldDisplayName(fieldId) ?? null,
			targetFieldId
		)
		console.log(`[harness] post-reload field value observed: ${actual}`)
		throw new Error('Probe value was not visible in v4 spec state after reload')
	}

	console.log(`[harness] PERSISTENCE_OK field_name=${probeName}`)
} finally {
	await browser.close()
}
