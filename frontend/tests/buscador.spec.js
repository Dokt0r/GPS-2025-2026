import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Ingrediente (ej: Arroz)')).toBeVisible({ timeout: 10000 });
});

test('Carga el buscador correctamente', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'LazyChef' })).toBeVisible();
});

test('Muestra el mensaje de nevera vacía al iniciar', async ({ page }) => {
    // Comprueba el 'empty state' del componente ListaNevera
    await expect(page.getByText('Tu nevera está vacía. Añade algo arriba.')).toBeVisible();
});

test('Muestra sugerencias al escribir', async ({ page }) => {
    // Le decimos que espere a que no haya peticiones de red pendientes
    await page.waitForLoadState('networkidle');

    // Ahora ya es seguro escribir
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').pressSequentially('ace', { delay: 100 });
    await expect(page.locator('.sugerencias-box')).toBeVisible();
    await expect(page.locator('.sugerencia-item').first()).toBeVisible();
});
test('Selecciona un ingrediente y lo añade a la nevera', async ({ page }) => {
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').pressSequentially('Aceite', { delay: 100 });
    await page.locator('.sugerencia-item').first().click();
    await page.getByRole('button', { name: 'Confirmar Selección' }).click();
    
    // Comprobamos que el ingrediente está en la lista y el mensaje de vacío desaparece
    await expect(page.locator('#mi-nevera')).toContainText('Aceite');
    await expect(page.getByText('Tu nevera está vacía. Añade algo arriba.')).not.toBeVisible();
});

test('Muestra una notificación (toast) al añadir un ingrediente', async ({ page }) => {
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').pressSequentially('Tomate', { delay: 100 });
    await page.locator('.sugerencia-item').first().click();
    await page.getByRole('button', { name: 'Confirmar Selección' }).click();
    
    // Comprobamos que sale el Toast de éxito
    const toast = page.locator('.toast-notification.success');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Añadido:');
});

test('Añade múltiples ingredientes a la nevera', async ({ page }) => {
    // Añadimos el primero
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').pressSequentially('Aceite', { delay: 100 });
    await page.locator('.sugerencia-item').first().click();
    await page.getByRole('button', { name: 'Confirmar Selección' }).click();

    // Limpiamos el buscador (si es necesario) o simplemente escribimos el segundo
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').fill(''); // Limpia rápido el input
    await page.getByPlaceholder('Ingrediente (ej: Arroz)').pressSequentially('Lombarda', { delay: 100 });
    await page.locator('.sugerencia-item').first().click();
    await page.getByRole('button', { name: 'Confirmar Selección' }).click();

    // Verificamos que AMBOS están en la lista
    const nevera = page.locator('#mi-nevera');
    await expect(nevera).toContainText('Aceite');
    await expect(nevera).toContainText('Lombarda');
    // Verificamos que hay exactamente 2 elementos (<li>)
    await expect(page.locator('.ingrediente-item')).toHaveCount(2);
});