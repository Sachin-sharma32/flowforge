import { expect, test } from '@playwright/test';
import { installApiMocks } from './support/mock-api';

test.describe('Guard + Workflow Creation', () => {
  test('redirects /dashboard to /login when auth profile is unauthorized', async ({ page }) => {
    await installApiMocks(page, {
      auth: {
        meAuthorized: false,
      },
    });

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-form')).toBeVisible();
  });

  test('creates a workflow from /workflows/new and opens editor', async ({ page }) => {
    await installApiMocks(page, {
      workflows: {
        createResultId: 'wf-created-99',
      },
    });

    await page.goto('/workflows/new');

    await expect(page.getByTestId('workflow-create-form')).toBeVisible();
    await page.getByTestId('workflow-name-input').fill('Inbound Order Router');
    await page.getByTestId('workflow-description-input').fill('Routes high-priority orders to ops');
    await page.getByTestId('workflow-trigger-webhook').click();
    await page.getByTestId('workflow-create-submit').click();

    await expect(page).toHaveURL(/\/workflows\/wf-created-99\/edit$/);
    await expect(page.getByText('Visual Workflow Editor')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inbound Order Router' })).toBeVisible();
  });
});
