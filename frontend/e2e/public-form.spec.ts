import { test, expect } from '@playwright/test';

const TOKEN = process.env.E2E_FORM_TOKEN || 'REPLACE_WITH_REAL_TOKEN';

test.describe('public form', () => {
  test('renders an active form', async ({ page }) => {
    await page.goto(`/f/${TOKEN}`);
    await expect(page.getByRole('button', { name: /submit response/i })).toBeVisible();
  });

  test('blocks submit when a required question is empty', async ({ page }) => {
    await page.goto(`/f/${TOKEN}`);
    await page.getByRole('button', { name: /submit response/i }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('submits successfully when filled', async ({ page }) => {
    await page.goto(`/f/${TOKEN}`);

    const inputs = page.locator('form input[required], form textarea[required]');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const type = await el.getAttribute('type');
      if (type === 'email') await el.fill('e2e@example.com');
      else if (type === 'number') await el.fill('30');
      else if (type === 'date') await el.fill('2000-01-01');
      else await el.fill('E2E test value');
    }

    await page.getByRole('button', { name: /submit response/i }).click();
    await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible();
  });

  test('shows the closed state for an inactive form', async ({ page }) => {
    const closedToken = process.env.E2E_CLOSED_TOKEN;
    test.skip(!closedToken, 'E2E_CLOSED_TOKEN not set');
    await page.goto(`/f/${closedToken}`);
    await expect(page.getByRole('heading', { name: /this form is closed/i })).toBeVisible();
  });
});
