import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Ingrediente (ej: Arroz)')).toBeVisible({ timeout: 10000 });
});

test('Carga el buscador correctamente', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'LazyChef' })).toBeVisible();
});

test('Muestra sugerencias al escribir', async ({ page }) => {
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').fill('ace', { delay: 100 });
    await expect(page.locator('.sugerencias-box')).toBeVisible();
    await expect(page.locator('.sugerencia-item').first()).toBeVisible();
});

test('Selecciona un ingrediente y lo añade a la nevera', async ({ page }) => {
    // Escribimos "aceite" con un retraso de 100ms entre cada tecla
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').fill('Aceite', { delay: 100 });
    await page.locator('.sugerencia-item').first().click();
    await page.getByRole('button', { name: 'Confirmar Selección' }).click();
    await expect(page.locator('#mi-nevera')).toContainText('Aceite');
});