import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtureApi } from './fixtures';

async function noOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
  expect(dimensions.page, `Page overflows at ${dimensions.viewport}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
}
async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `../.ui-review/redesign/${name}.png`, fullPage: !name.startsWith('home-') && name !== 'culture-story' });
}

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`public and account layouts at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 }); await fixtureApi(page);
    for (const path of ['/', '/flights', '/flights/1', '/checkout?outbound=11&passengers=1', '/bookings', '/bookings/browser-booking', '/profile', '/favorites', '/assistant']) {
      await page.goto(path); await expect(page.locator('h1')).toBeVisible(); await page.waitForLoadState('networkidle');
      await noOverflow(page);
      if (path === '/' || path === '/flights' || path.startsWith('/checkout') || path === '/profile') await screenshot(page, `${path === '/' ? 'home' : path.split('?')[0].slice(1)}-${width}`);
    }
    expect(errors).toEqual([]);
  });
}

test('home globe renders, pauses, stops out of view and handles context loss', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const state = window as typeof window & { __flightGlDraws: number }; state.__flightGlDraws = 0;
    for (const name of ['drawElements', 'drawArrays'] as const) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function(...args: number[]) { state.__flightGlDraws++; return original.apply(this, args as never); } as typeof original;
    }
  });
  await fixtureApi(page); await page.goto('/');
  await expect(page.locator('.hero-world')).toHaveClass(/ready/, { timeout: 20000 });
  const canvas = page.locator('.hero-globe-canvas canvas'); await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Tạm dừng chuyển động địa cầu' }).click();
  await expect(page.getByRole('button', { name: 'Tiếp tục chuyển động địa cầu' })).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(150);
  const pausedDraws = await page.evaluate(() => (window as typeof window & { __flightGlDraws: number }).__flightGlDraws);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as typeof window & { __flightGlDraws: number }).__flightGlDraws)).toBe(pausedDraws);
  await page.getByRole('button', { name: 'Tiếp tục chuyển động địa cầu' }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __flightGlDraws: number }).__flightGlDraws)).toBeGreaterThan(pausedDraws);
  await screenshot(page, 'home-webgl');
  await page.locator('#destinations').scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
  const hiddenDraws = await page.evaluate(() => (window as typeof window & { __flightGlDraws: number }).__flightGlDraws);
  await page.waitForTimeout(250); expect(await page.evaluate(() => (window as typeof window & { __flightGlDraws: number }).__flightGlDraws)).toBe(hiddenDraws);
  await page.evaluate(() => window.scrollTo(0, 0));
  await canvas.evaluate(element => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('.hero-world')).toHaveClass(/fallback/);
  await expect(page.locator('.hero-globe-fallback')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('button', { name: 'Tạm dừng chuyển động địa cầu' })).toHaveCount(0);
});

test('reduced motion and unavailable WebGL retain image and working search', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await fixtureApi(page); await page.goto('/');
  await expect(page.locator('.hero-globe-fallback img')).toBeVisible();
  await expect(page.locator('.hero-globe-canvas canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tìm chuyến bay', exact: true }).click();
  await expect(page).toHaveURL(/\/flights\?/);
  await expect(page.locator('.flight-card')).toHaveCount(1);
});

test('WebGL initialization failure falls back without breaking the page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: unknown[]) { if (type.includes('webgl')) return null; return original.apply(this, [type, ...args] as never); } as typeof original; });
  await fixtureApi(page); await page.goto('/'); await page.waitForTimeout(1800);
  await expect(page.locator('.hero-world')).toHaveClass(/fallback/);
  await expect(page.getByRole('button', { name: 'Tìm chuyến bay', exact: true })).toBeEnabled();
});

test('culture tabs support keyboard navigation and image failure', async ({ page }) => {
  await fixtureApi(page); await page.goto('/');
  await page.getByRole('tab', { name: /Hà Nội/ }).focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Tokyo/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Một thành phố.');
  await page.locator('.culture-photo img').evaluate(image => image.dispatchEvent(new Event('error')));
  await expect(page.locator('.culture-photo .travel-image-fallback')).toBeVisible();
  await page.getByRole('tab', { name: /Seoul/ }).click(); await page.locator('#cultures').evaluate(element => element.scrollIntoView({ block: 'start' }));
  await screenshot(page, 'culture-story');
});

test('mobile navigation traps focus and restores it with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await fixtureApi(page, { role: 'GUEST' }); await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Mở menu điều hướng' }); await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Điều hướng' })).toBeVisible();
  await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('link', { name: 'Tạo tài khoản', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Đóng menu', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); await noOverflow(page);
});

test('search keeps URL contracts, validates route and supports return trip and traveler count', async ({ page }) => {
  const requests = await fixtureApi(page); await page.goto('/');
  await page.getByRole('button', { name: 'Khứ hồi', exact: true }).click();
  await page.getByRole('button', { name: /1 hành khách/ }).click();
  await page.getByRole('button', { name: 'Tăng số hành khách' }).click();
  await page.getByRole('combobox', { name: 'Hạng vé', exact: true }).selectOption('BUSINESS');
  await page.getByRole('button', { name: /Hoàn tất/ }).click();
  await page.getByRole('button', { name: 'Tìm chuyến bay', exact: true }).click();
  await expect(page).toHaveURL(/passengers=2/); await expect(page).toHaveURL(/cabinClass=BUSINESS/); await expect(page).toHaveURL(/returnDate=/);
  await expect(page.locator('.flight-card')).toBeVisible();
  expect(requests.some(request => request.path === '/flights' && request.search.includes('cabinClass=BUSINESS'))).toBeTruthy();
});

test('flight error can retry, empty results stay honest, mobile filters work', async ({ page }) => {
  const state = { flightError: true, emptyFlights: false };
  await page.setViewportSize({ width: 390, height: 844 }); const requests = await fixtureApi(page, state); await page.goto('/flights');
  await expect(page.getByRole('alert')).toContainText('Máy chủ tìm kiếm đang bận');
  const before = requests.filter(request => request.path === '/flights').length;
  state.flightError = false; await page.getByRole('button', { name: /Thử lại tìm kiếm/ }).click();
  await expect.poll(() => requests.filter(request => request.path === '/flights').length).toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Bộ lọc chuyến bay' }).click();
  await expect(page.locator('#flight-filters')).toBeVisible(); await noOverflow(page);
  await expect(page.locator('.flight-card')).toBeVisible(); state.emptyFlights = true; await page.reload();
  await expect(page.locator('.empty')).toContainText('Không có chuyến phù hợp'); await expect(page.locator('.flight-card')).toHaveCount(0);
});

test('same-airport search errors describe and focus the fields', async ({ page }) => {
  await fixtureApi(page); await page.goto('/');
  const destination = page.getByRole('combobox', { name: 'Điểm đến', exact: true }); await destination.fill('SGN');
  await page.getByRole('option', { name: /SGN/ }).click(); await page.getByRole('button', { name: 'Tìm chuyến bay', exact: true }).click();
  const origin = page.getByRole('combobox', { name: 'Điểm đi', exact: true }); await expect(origin).toBeFocused(); await expect(origin).toHaveAttribute('aria-invalid', 'true');
  const errorId = await origin.getAttribute('aria-describedby'); expect(errorId).toBeTruthy(); await expect(page.locator(`[id="${errorId}"]`)).toContainText('phải khác nhau');
  await expect(page).toHaveURL('/');
});

test('round-trip flight selection keeps outbound and inbound fare IDs', async ({ page }) => {
  const requests = await fixtureApi(page); await page.goto('/flights?origin=SGN&destination=HAN&returnDate=2099-01-01&passengers=2&cabinClass=ECONOMY');
  await page.getByRole('button', { name: 'Chọn chuyến đi' }).click(); await expect(page.getByRole('button', { name: 'Chọn chuyến về' })).toBeVisible();
  await page.getByRole('button', { name: 'Chọn chuyến về' }).click(); await expect(page).toHaveURL(/outbound=11&passengers=2&inbound=12/);
  await expect(page.locator('.summary-segment')).toHaveCount(2); expect(requests.some(request => request.path === '/flights' && request.search.includes('origin=HAN'))).toBeTruthy();
});

test('airport failure disables booking search and exposes retry', async ({ page }) => {
  await fixtureApi(page, { airportError: true }); await page.goto('/');
  await expect(page.getByRole('button', { name: 'Tìm chuyến bay', exact: true })).toBeDisabled();
  await expect(page.locator('.search-form').getByRole('button', { name: 'Tải lại sân bay' })).toBeVisible();
  await expect(page.locator('.destination-cta')).toHaveCount(0);
});

test('login, registration and logout preserve existing destinations', async ({ page }) => {
  const requests = await fixtureApi(page, { role: 'GUEST' }); await page.goto('/login?next=%2Fcheckout%3Foutbound%3D11');
  await page.getByLabel('Email', { exact: true }).fill('browser-test@example.test'); await page.getByLabel('Mật khẩu', { exact: true }).fill('BrowserTest123');
  await page.locator('.auth-form button[type=submit], .auth-form form > button').click();
  await expect(page).toHaveURL(/\/checkout\?outbound=11/); expect(requests.some(request => request.path === '/auth/login')).toBeTruthy();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click(); await expect(page).toHaveURL('/');
  await page.goto('/register?next=%2Fprofile'); await page.getByLabel('Họ và tên', { exact: true }).fill('Người kiểm thử'); await page.getByLabel('Email', { exact: true }).fill('browser-test@example.test'); await page.getByLabel('Mật khẩu', { exact: true }).fill('BrowserTest123');
  await page.locator('.auth-form form > button').click(); await expect(page).toHaveURL('/profile'); expect(requests.some(request => request.path === '/auth/register')).toBeTruthy();
});

test('user routes keep access protection and reject admin access', async ({ page }) => {
  await fixtureApi(page, { role: 'GUEST' }); await page.goto('/checkout?outbound=11'); await expect(page).toHaveURL(/login\?next=/);
  await page.unrouteAll(); await fixtureApi(page, { role: 'USER' }); await page.goto('/admin'); await expect(page.getByRole('alert')).toContainText('không có quyền');
});

test('checkout, simulated payment, download and cancellation preserve payloads and focus', async ({ page }) => {
  const requests = await fixtureApi(page); await page.goto('/flights'); await page.getByRole('button', { name: 'Chọn chuyến đi' }).click();
  await expect(page).toHaveURL(/\/checkout\?outbound=11&passengers=1/);
  await page.getByLabel('Họ và tên trên giấy tờ').fill('NGUOI KIEM THU'); await page.getByLabel('Ngày sinh').fill('1995-01-01'); await page.getByLabel('Số CCCD / hộ chiếu').fill('TEST123456');
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: /Giữ chỗ & tiếp tục/ }).click(); await expect(page).toHaveURL('/bookings/browser-booking');
  const order = requests.find(request => request.path === '/bookings' && request.method === 'POST'); expect(order?.body).toMatchObject({ fareIds: [11], contactEmail: 'browser-test@example.test' });
  await page.getByRole('button', { name: /Thanh toán mô phỏng/ }).click(); await expect(page.getByRole('status')).toContainText('Đặt vé đã được xác nhận');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: /Tải vé điện tử/ }).click(); expect((await download).suggestedFilename()).toBe('ticket-UITEST.txt');
  const cancel = page.getByRole('button', { name: 'Hủy đơn đặt vé' }); await cancel.click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Giữ lại đơn' })).toBeFocused(); await page.keyboard.press('Escape'); await expect(cancel).toBeFocused();
  await cancel.click(); await dialog.getByRole('button', { name: 'Xác nhận hủy' }).click(); await expect(page.getByRole('status')).toContainText('Đơn đặt vé đã được hủy');
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`admin layouts, real empty chart states and dialogs at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 }); await fixtureApi(page, { role: 'ADMIN' });
    await page.goto('/admin'); await expect(page.locator('.ad-kpi').first()).toBeVisible(); await noOverflow(page); await screenshot(page, `admin-${width}`);
    await page.goto('/admin/flights'); await expect(page.locator('.ad-table')).toBeVisible(); await noOverflow(page);
    await page.getByRole('button', { name: 'Tạo lịch nội bộ' }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await noOverflow(page); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('admin sidebar collapse, theme, keyboard drawer and server filters retain behavior', async ({ page }) => {
  const requests = await fixtureApi(page, { role: 'ADMIN' }); await page.goto('/admin');
  await page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click(); await expect(page.locator('.admin-app')).toHaveClass(/sidebar-collapsed/); await noOverflow(page);
  await page.getByRole('link', { name: 'Chuyến bay', exact: true }).click(); await expect(page).toHaveURL('/admin/flights');
  await page.getByRole('button', { name: 'Chuyển giao diện tối' }).click(); await expect(page.locator('.admin-app')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('combobox', { name: 'Lọc trạng thái' }).selectOption('SCHEDULED'); await expect(page).toHaveURL(/status=SCHEDULED/);
  await expect.poll(() => requests.some(request => request.path === '/admin/monitoring' && request.search.includes('status=SCHEDULED'))).toBeTruthy();
  await screenshot(page, 'admin-dark-collapsed');
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'Mở điều hướng', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Điều hướng quản trị' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Mở điều hướng', exact: true })).toBeFocused();
});

test('remaining admin sections render without exceptions or fake missing-data charts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await fixtureApi(page, { role: 'ADMIN' });
  for (const section of ['fares','bookings','customers','airlines','revenue','airports','reviews','activity','settings']) { await page.goto('/admin/' + section); await expect(page.locator('h1')).toBeVisible(); await noOverflow(page); }
  expect(errors).toEqual([]);
});

test('accessibility checks for homepage, auth, results, booking and admin', async ({ page }) => {
  test.setTimeout(120000);
  const violations: unknown[] = [];
  await fixtureApi(page);
  for (const path of ['/', '/flights', '/checkout?outbound=11', '/bookings/browser-booking']) {
    await page.goto(path); await expect(page.locator('h1')).toBeVisible();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    violations.push(...scan.violations.map(item => ({ path, id: item.id, impact: item.impact, elements: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
  }
  await page.unrouteAll(); await fixtureApi(page, { role: 'ADMIN' }); await page.goto('/admin'); await expect(page.locator('.ad-kpi').first()).toBeVisible();
  for (const theme of ['light','dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Chuyển giao diện tối' }).click();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); violations.push(...scan.violations.map(item => ({ path: '/admin (' + theme + ')', id: item.id, elements: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
  }
  await page.unrouteAll(); await fixtureApi(page, { role: 'GUEST' });
  for (const path of ['/login','/register','/forgot-password']) {
    await page.goto(path); await expect(page.locator('.auth-form, .narrow')).toBeVisible();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); violations.push(...scan.violations.map(item => ({ path, id: item.id, elements: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
  }
  expect(violations).toEqual([]);
});

test('guest auth, recovery and 404 pages work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 }); await fixtureApi(page, { role: 'GUEST' });
  for (const path of ['/login','/register','/forgot-password','/reset-password?token=browser-test','/missing']) { await page.goto(path); await expect(page.locator('h1').last()).toBeVisible(); await noOverflow(page); }
});
