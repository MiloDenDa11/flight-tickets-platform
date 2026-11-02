import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtureApi, sync, overview } from './fixtures';

const output = '../.ui-review/admin-refresh';
async function openAdmin(page: Page, section = '') {
  await page.goto('/admin' + (section ? '/' + section : ''));
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForLoadState('networkidle');
}
async function checkWidth(page: Page) {
  const size = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  expect(size.content, `Overflow at ${size.width}px`).toBeLessThanOrEqual(size.width + 1);
}

test('admin settings visual reference', async ({ page }) => {
  test.setTimeout(90000);
  await fixtureApi(page, { role: 'ADMIN' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await openAdmin(page, 'settings');
    const phase = process.env.ADMIN_UI_PHASE === 'before' ? 'before' : 'after';
    await page.screenshot({ path: `${output}/settings-${phase}-${width}.png`, fullPage: true });
    await page.screenshot({ path: `${output}/settings-${phase}-${width}-viewport.png` });
  }
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`admin readable layout and modal at ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await fixtureApi(page, { role: 'ADMIN' });
    for (const section of ['settings', '', 'flights', 'fares', 'revenue']) {
      await openAdmin(page, section); await checkWidth(page);
      if (section === 'settings' || section === '' || section === 'flights') await page.screenshot({ path: `${output}/${section || 'overview'}-${width}.png`, fullPage: true });
      if (section === 'flights') {
        const trigger = page.getByRole('button', { name: 'Tạo lịch nội bộ' }); await trigger.click();
        const dialog = page.getByRole('dialog', { name: 'Cập nhật dữ liệu quản trị' }); await expect(dialog).toBeVisible(); await checkWidth(page);
        if (width === 390 || width === 1440) await page.screenshot({ path: `${output}/modal-${width}.png` });
        await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
      }
    }
    expect(errors).toEqual([]);
  });
}

test('admin settings preserve real availability and sync guards', async ({ page }) => {
  const requests = await fixtureApi(page, { role: 'ADMIN' }); await openAdmin(page, 'settings');
  await expect(page.getByRole('heading', { name: 'Cài đặt hệ thống', exact: true })).toBeVisible();
  const services = page.locator('.ad-connection-grid > .ad-panel');
  await expect(services.nth(0)).toContainText('Sẵn sàng'); await expect(services.nth(1)).toContainText('Mất kết nối'); await expect(services.nth(2)).toContainText('DEMO');
  const cards = page.locator('.ad-source-grid > article'); await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) { await expect(card).toContainText('Chưa cấu hình'); await expect(card).toContainText('Chưa ghi nhận'); await expect(card.getByRole('button', { name: 'Đồng bộ ngay' })).toBeDisabled(); }
  expect(requests.filter(request => request.path.startsWith('/admin/sync/') && request.method === 'POST')).toEqual([]);
  await page.getByRole('button', { name: 'Tối', exact: true }).click(); await expect(page.locator('.admin-app')).toHaveAttribute('data-theme', 'dark');
  await expect(cards.first().getByRole('button', { name: 'Đồng bộ ngay' })).toBeDisabled();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: `${output}/settings-dark-1440.png`, fullPage: true });
});

test('admin sync retains running, cooldown and submit behavior', async ({ page }) => {
  const requests = await fixtureApi(page, { role: 'ADMIN' });
  const now = new Date().toISOString(), later = new Date(Date.now() + 600000).toISOString();
  await page.route('**/api/v1/admin/sync/status', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { ...sync, kinds: [{ kind: 'schedule', configured: true, lastAttemptAt: now, lastSuccessAt: now }, { kind: 'status', configured: true, runningUntil: later }, { kind: 'fares', configured: true, nextAllowedAt: later }] } }) }));
  await openAdmin(page, 'settings'); const cards = page.locator('.ad-source-grid > article');
  await expect(cards.nth(0).getByRole('button', { name: 'Đồng bộ ngay' })).toBeEnabled();
  await expect(cards.nth(1).getByRole('button')).toBeDisabled(); await expect(cards.nth(1)).toContainText('Đang đồng bộ');
  await expect(cards.nth(2).getByRole('button')).toBeDisabled(); await expect(cards.nth(2)).toContainText('Cho phép lại');
  await cards.nth(0).getByRole('button', { name: 'Đồng bộ ngay' }).click();
  await expect.poll(() => requests.filter(request => request.path === '/admin/sync/schedule' && request.method === 'POST').length).toBe(1);
  await expect(page.getByRole('status')).toContainText('Đã nhận yêu cầu đồng bộ');
});

for (const width of [360, 1440]) {
  test(`admin remaining sections stay readable at ${width}px`, async ({ page }) => {
    test.setTimeout(90000); await page.setViewportSize({ width, height: 1000 }); await fixtureApi(page, { role: 'ADMIN' });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    for (const section of ['bookings', 'customers', 'airlines', 'airports', 'reviews', 'activity']) { await openAdmin(page, section); await checkWidth(page); }
    expect(errors).toEqual([]);
  });
}

test('admin larger settings and management controls meet accessibility checks', async ({ page }) => {
  test.setTimeout(150000); await fixtureApi(page, { role: 'ADMIN' });
  const violations: unknown[] = [];
  for (const theme of ['light', 'dark']) {
    for (const section of ['settings', '', 'flights']) {
      await openAdmin(page, section);
      if (await page.locator('.admin-app').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: theme === 'dark' ? 'Chuyển giao diện tối' : 'Chuyển giao diện sáng' }).click();
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      violations.push(...result.violations.map(issue => ({ section, theme, id: issue.id, nodes: issue.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
    }
  }
  expect(violations).toEqual([]);
});

test('admin stylesheet does not change customer layout after navigation', async ({ page }) => {
  await fixtureApi(page, { role: 'ADMIN' }); await page.goto('/'); await expect(page.locator('#hero-heading')).toBeVisible();
  const appearance = () => page.evaluate(() => ['body', '.site-header', '#hero-heading', '.search-form'].map(selector => { const element = document.querySelector(selector)!; const style = getComputedStyle(element); return [selector, style.fontFamily, style.fontSize, style.color, style.backgroundColor, element.getBoundingClientRect().width]; }));
  const before = await appearance();
  await page.getByRole('link', { name: 'Vào trang quản trị' }).click(); await expect(page.locator('.admin-app')).toBeVisible();
  await page.getByRole('link', { name: 'Về trang đặt vé', exact: true }).click(); await expect(page.locator('#hero-heading')).toBeVisible();
  expect(await appearance()).toEqual(before);
});

test('admin chart labels and keyboard tooltips reflow with observation data', async ({ page }) => {
  await fixtureApi(page, { role: 'ADMIN' });
  // Fixture data exercise the chart branch only; they never enter application source or the database.
  const dates = [2, 1, 0].map(offset => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10));
  const series = dates.map(date => ({ date, gross: 1200000, refunds: 0, tickets: 1 }));
  await page.route('**/api/v1/admin/analytics/overview**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { ...overview, kpis: { ...overview.kpis, revenue: 3600000, tickets: 3, successful: 3 }, report: { ...overview.report, gross: 3600000, net: 3600000, tickets: 3, orders: 3, series } } }) }));
  await page.goto(`/admin?start=${dates[0]}&end=${dates[2]}`);
  const chart = page.locator('.ad-chart-canvas').first(); await expect(chart).toBeVisible();
  const points = chart.locator('rect[data-point]'); await points.first().focus(); await page.keyboard.press('ArrowRight');
  await expect(chart.getByRole('status')).toContainText(dates[1]); await expect(chart.getByRole('status')).toContainText('1.200.000');
  await page.setViewportSize({ width: 390, height: 1000 }); await checkWidth(page); await points.last().focus();
  await expect(chart.getByRole('status')).toContainText(dates[2]);
});

test('admin unavailable settings keep the error state and retry available', async ({ page }) => {
  await fixtureApi(page, { role: 'ADMIN' }); let attempts = 0;
  await page.route('**/api/v1/admin/settings', route => ++attempts === 1 ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Tạm thời chưa kết nối được dịch vụ.' }) }) : route.fallback());
  await openAdmin(page, 'settings'); await expect(page.getByRole('alert')).toContainText('Tạm thời chưa kết nối');
  await expect(page.locator('.ad-connection-grid')).toHaveCount(0);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(scan.violations).toEqual([]);
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await expect(page.locator('.ad-connection-grid > .ad-panel')).toHaveCount(3);
  expect(attempts).toBe(2);
});
