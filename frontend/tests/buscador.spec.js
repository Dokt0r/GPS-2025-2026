import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    const responsePromise = page.waitForResponse('http://localhost:3000/api/ingredientes');
    await page.goto('http://localhost:5173');
    await responsePromise;
});

test('Carga el buscador correctamente', async ({ page }) => {
    await expect(page.getByPlaceholder('Ingrediente (ej: Arroz)')).toBeVisible();
});

test('Muestra sugerencias al escribir', async ({ page }) => {
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').fill('ace');
    await expect(page.locator('.sugerencias-box')).toBeVisible();
    await expect(page.locator('.sugerencia-item').first()).toBeVisible();
});

test('Selecciona un ingrediente y lo añade a la nevera', async ({ page }) => {
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').fill('aceite');
    await page.locator('.sugerencia-item').first().click();
    await page.getByRole('button', { name: 'Confirmar Selección' }).click();
    await expect(page.locator('#mi-nevera')).toContainText('Aceite');
});