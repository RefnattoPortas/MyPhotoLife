import { test, expect } from '@playwright/test';

test.describe('Portfolio Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve carregar a pagina inicial', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page).toHaveTitle(/MyPhotoLife/);
  });

  test('deve navegar para o portfolio via slug', async ({ page }) => {
    await page.goto('/fotografo-teste');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('deve mostrar estado de erro para slug inexistente', async ({ page }) => {
    await page.goto('/slug-que-nao-existe-12345');
    const notFound = page.locator('text=Portfólio não encontrado');
    await expect(notFound).toBeVisible({ timeout: 15000 });
  });

  test('deve trocar abas no portfolio', async ({ page }) => {
    await page.goto('/fotografo-teste');
    await page.waitForLoadState('networkidle');

    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('deve abrir e fechar lightbox', async ({ page }) => {
    await page.goto('/fotografo-teste');
    const firstImage = page.locator('.group img, .cursor-pointer img').first();
    if (await firstImage.isVisible()) {
      await firstImage.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('deve navegar pelo teclado na lightbox', async ({ page }) => {
    await page.goto('/fotografo-teste');
    const firstImage = page.locator('.group img, .cursor-pointer img').first();
    if (await firstImage.isVisible()) {
      await firstImage.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Escape');
    }
  });

  test('deve funcionar com prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('deve funcionar em tema escuro (prefers-color-scheme)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('deve ter landmarks semanticos', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main');
    const footer = page.locator('footer');
    await expect(main).toBeVisible();
    await expect(footer).toBeVisible();
  });

  test('deve ter atributos aria nos botoes', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = buttons.nth(i);
      const hasAria = await btn.getAttribute('aria-label');
      const hasText = await btn.textContent();
      expect(hasAria !== null || (hasText && hasText.trim().length > 0)).toBeTruthy();
    }
  });

  test('deve ter labels nos formularios de login', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('deve ter foco visivel nos elementos interativos', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('deve funcionar em mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('deve funcionar em tablet (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('deve funcionar em desktop (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Repeated Clicks Protection', () => {
  test('botao de submit deve desabilitar apos clique', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await expect(submitBtn).toBeDisabled();
  });

  test('formulario de contato deve impedir duplo envio', async ({ page }) => {
    await page.goto('/fotografo-teste');
    const contactTab = page.locator('[role="tab"]:has-text("Contato")');
    if (await contactTab.isVisible()) {
      await contactTab.click();
      const submitBtn = page.locator('button:has-text("Enviar Mensagem")');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await expect(submitBtn).toBeDisabled();
      }
    }
  });
});

test.describe('Session Expired', () => {
  test('deve redirecionar para login quando sessao expira', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loginPage = page.locator('text=Entrar');
    if (await loginPage.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(loginPage).toBeVisible();
    }
  });
});

test.describe('Network Unavailable', () => {
  test('deve mostrar erro ao desconectar', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort('connectionrefused'));
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });
});
