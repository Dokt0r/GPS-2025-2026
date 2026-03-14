import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    // Vamos a la página directamente
    await page.goto('/');
    // En lugar de esperar la respuesta de red (que puede fallar por mil ms), 
    // esperamos a que un elemento clave del buscador sea visible.
    await expect(page.getByPlaceholderText(/Ingrediente/i)).toBeVisible({ timeout: 10000 });
});

test('Carga el buscador correctamente', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'LazyChef' })).toBeVisible();
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