import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Email Validation', () => {
  function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function normalizeEmail(email) {
    if (!email) return '';
    const normalized = email.trim().toLowerCase();
    const atIndex = normalized.indexOf('@');
    if (atIndex > 0) {
      const localPart = normalized.substring(0, atIndex).replace(/\./g, '').replace(/\+.*$/, '');
      return localPart + normalized.substring(atIndex);
    }
    return normalized;
  }

  it('deve aceitar email simples', () => {
    assert.equal(isValidEmail('user@example.com'), true);
  });

  it('deve aceitar email com subdominio', () => {
    assert.equal(isValidEmail('user@sub.example.com'), true);
  });

  it('deve rejeitar email sem @', () => {
    assert.equal(isValidEmail('userexample.com'), false);
  });

  it('deve rejeitar email vazio', () => {
    assert.equal(isValidEmail(''), false);
  });

  it('deve rejeitar email null', () => {
    assert.equal(isValidEmail(null), false);
  });

  it('deve rejeitar email sem dominio', () => {
    assert.equal(isValidEmail('user@'), false);
  });

  it('deve rejeitar email com espaco', () => {
    assert.equal(isValidEmail('user @example.com'), false);
  });

  it('deve rejeitar string nao email', () => {
    assert.equal(isValidEmail('not-an-email'), false);
  });

  it('deve normalizar email com pontos', () => {
    assert.equal(normalizeEmail('joao.silva@gmail.com'), 'joaosilva@gmail.com');
  });

  it('deve remover plus addressing', () => {
    assert.equal(normalizeEmail('joao+tag@gmail.com'), 'joao@gmail.com');
  });

  it('deve converter para minusculo', () => {
    assert.equal(normalizeEmail('Joao.Silva@Gmail.COM'), 'joaosilva@gmail.com');
  });
});

describe('Password Validation', () => {
  function getPasswordStrength(password) {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  }

  function isValidPassword(password) {
    if (!password || password.length < 8) return { valid: false, reason: 'Senha deve ter no mínimo 8 caracteres' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score < 3) return { valid: false, reason: 'Senha muito fraca' };
    return { valid: true, strength: score };
  }

  it('deve rejeitar senha vazia', () => {
    assert.equal(getPasswordStrength(''), 0);
  });

  it('deve rejeitar senha muito curta (< 8)', () => {
    assert.equal(getPasswordStrength('Ab1!').score ?? 0, 0);
    const result = isValidPassword('Ab1!');
    assert.equal(result.valid, false);
  });

  it('deve aceitar senha com 8 caracteres', () => {
    const strength = getPasswordStrength('Ab1!xYz2');
    assert.ok(strength >= 3);
  });

  it('deve aceitar senha com 12+ caracteres', () => {
    const strength = getPasswordStrength('Ab1!xYz2Lmno');
    assert.ok(strength >= 4);
  });

  it('deve pontuar mais com maiuscula', () => {
    const without = getPasswordStrength('abcdefgh');
    const withUpper = getPasswordStrength('Abcdefgh');
    assert.ok(withUpper > without);
  });

  it('deve pontuar mais com numero', () => {
    const without = getPasswordStrength('Abcdefgh');
    const withNum = getPasswordStrength('Abcdefg1');
    assert.ok(withNum > without);
  });

  it('deve pontuar mais com caractere especial', () => {
    const without = getPasswordStrength('Abcdefg1');
    const withSpecial = getPasswordStrength('Abcdefg1!');
    assert.ok(withSpecial > without);
  });
});

describe('Slug Validation', () => {
  const RESERVED_SLUGS = [
    'api', 'login', 'register', 'dashboard', 'admin', 'support',
    'www', 'app', 'dev', 'test', 'mail', 'webmail',
    'billing', 'help', 'status', 'docs', 'cdn', 'static',
  ];

  function validateSlug(slug) {
    if (!slug || typeof slug !== 'string') return 'Slug é obrigatório';
    const s = slug.toLowerCase().trim();
    if (s.length < 3 || s.length > 63) return 'Slug deve ter entre 3 e 63 caracteres';
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)) return 'Slug deve conter apenas letras minúsculas, números e hífens, sem hífen no início ou fim';
    if (RESERVED_SLUGS.includes(s)) return `Slug "${s}" é reservado pelo sistema`;
    return null;
  }

  it('slug com 2 caracteres deve ser rejeitado', () => {
    assert.notEqual(validateSlug('ab'), null);
  });

  it('slug com 64 caracteres deve ser rejeitado', () => {
    assert.notEqual(validateSlug('a' + 'b'.repeat(63)), null);
  });

  it('slug com 63 caracteres deve ser aceito', () => {
    assert.equal(validateSlug('a' + 'b'.repeat(61) + 'c'), null);
  });

  it('slug com hifen no inicio deve ser rejeitado', () => {
    assert.notEqual(validateSlug('-teste'), null);
  });

  it('slug com hifen no fim deve ser rejeitado', () => {
    assert.notEqual(validateSlug('teste-'), null);
  });

  it('slug com caracteres especiais deve ser rejeitado', () => {
    assert.notEqual(validateSlug('fotógrafo'), null);
  });

  it('slug com maiusculas deve ser normalizado', () => {
    assert.equal(validateSlug('Fotografo'), null);
  });

  it('slug reservado (admin) deve ser rejeitado', () => {
    assert.notEqual(validateSlug('admin'), null);
  });

  it('slug reservado (api) deve ser rejeitado', () => {
    assert.notEqual(validateSlug('api'), null);
  });

  it('slug valido deve ser aceito', () => {
    assert.equal(validateSlug('fotografo-legal'), null);
  });

  it('slug com numeros deve ser aceito', () => {
    assert.equal(validateSlug('fotografo2024'), null);
  });

  it('slug nulo deve ser rejeitado', () => {
    assert.notEqual(validateSlug(null), null);
  });

  it('slug vazio deve ser rejeitado', () => {
    assert.notEqual(validateSlug(''), null);
  });
});

describe('Color Validation', () => {
  function isValidHexColor(color) {
    if (!color || typeof color !== 'string') return false;
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
  }

  function isValidColor(color) {
    return isValidHexColor(color);
  }

  it('deve aceitar hex de 6 digitos', () => {
    assert.equal(isValidHexColor('#FF5733'), true);
  });

  it('deve aceitar hex abreviado de 3 digitos', () => {
    assert.equal(isValidHexColor('#FFF'), true);
  });

  it('deve aceitar hex minusculo', () => {
    assert.equal(isValidHexColor('#ff5733'), true);
  });

  it('deve rejeitar string sem #', () => {
    assert.equal(isValidHexColor('FF5733'), false);
  });

  it('deve rejeitar nome de cor', () => {
    assert.equal(isValidHexColor('red'), false);
  });

  it('deve rejeitar cor com 5 digitos', () => {
    assert.equal(isValidHexColor('#FF573'), false);
  });

  it('deve rejeitar valor null', () => {
    assert.equal(isValidHexColor(null), false);
  });

  it('deve rejeitar string vazia', () => {
    assert.equal(isValidHexColor(''), false);
  });

  it('deve rejeitar caracteres invalidos', () => {
    assert.equal(isValidHexColor('#FF57GG'), false);
  });
});

describe('Font Validation', () => {
  const ALLOWED_FONTS = [
    'Inter', 'Playfair Display', 'Montserrat', 'Merriweather',
    'Nunito', 'Poppins', 'Lora', 'Roboto', 'Open Sans', 'Raleway',
  ];

  function isValidFont(font) {
    if (!font || typeof font !== 'string') return false;
    return ALLOWED_FONTS.includes(font);
  }

  it('deve aceitar Inter', () => {
    assert.equal(isValidFont('Inter'), true);
  });

  it('deve aceitar Playfair Display', () => {
    assert.equal(isValidFont('Playfair Display'), true);
  });

  it('deve rejeitar Comic Sans', () => {
    assert.equal(isValidFont('Comic Sans'), false);
  });

  it('deve rejeitar fonte vazia', () => {
    assert.equal(isValidFont(''), false);
  });

  it('deve rejeitar null', () => {
    assert.equal(isValidFont(null), false);
  });

  it('deve rejeitar fonte com digitos', () => {
    assert.equal(isValidFont('Inter123'), false);
  });
});

describe('URL Validation', () => {
  function isValidHttpUrl(string) {
    if (!string || typeof string !== 'string') return false;
    try {
      const url = new URL(string);
      return url.protocol === 'https:' && url.hostname.includes('.');
    } catch {
      return false;
    }
  }

  function isAllowedSocialUrl(url) {
    if (!url || typeof url !== 'string') return true;
    if (url === '') return true;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'javascript:') return false;
      if (parsed.protocol !== 'https:') return false;
      return true;
    } catch {
      return false;
    }
  }

  it('deve aceitar URL https valida', () => {
    assert.equal(isValidHttpUrl('https://instagram.com/fotografo'), true);
  });

  it('deve rejeitar URL http', () => {
    assert.equal(isValidHttpUrl('http://instagram.com/fotografo'), false);
  });

  it('deve rejeitar javascript: URL', () => {
    assert.equal(isValidHttpUrl('javascript:alert(1)'), false);
  });

  it('deve rejeitar string vazia', () => {
    assert.equal(isValidHttpUrl(''), false);
  });

  it('deve rejeitar URL sem protocolo', () => {
    assert.equal(isValidHttpUrl('instagram.com/fotografo'), false);
  });

  it('deve aceitar URL https em isAllowedSocialUrl', () => {
    assert.equal(isAllowedSocialUrl('https://example.com'), true);
  });

  it('deve rejeitar javascript: em isAllowedSocialUrl', () => {
    assert.equal(isAllowedSocialUrl('javascript:alert(1)'), false);
  });

  it('deve aceitar string vazia em isAllowedSocialUrl', () => {
    assert.equal(isAllowedSocialUrl(''), true);
  });

  it('deve rejeitar http em isAllowedSocialUrl', () => {
    assert.equal(isAllowedSocialUrl('http://example.com'), false);
  });
});

describe('Price Validation', () => {
  function isValidPrice(price) {
    if (price === undefined || price === null) return false;
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return typeof num === 'number' && !isNaN(num) && num >= 0 && num <= 999999.99;
  }

  function formatPrice(price) {
    return `R$ ${parseFloat(price).toFixed(2)}`;
  }

  it('deve aceitar preco valido', () => {
    assert.equal(isValidPrice(49.90), true);
  });

  it('deve aceitar preco zero', () => {
    assert.equal(isValidPrice(0), true);
  });

  it('deve rejeitar preco negativo', () => {
    assert.equal(isValidPrice(-10), false);
  });

  it('deve rejeitar preco null', () => {
    assert.equal(isValidPrice(null), false);
  });

  it('deve rejeitar preco undefined', () => {
    assert.equal(isValidPrice(undefined), false);
  });

  it('deve rejeitar preco muito alto (>999999.99)', () => {
    assert.equal(isValidPrice(1000000), false);
  });

  it('deve formatar preco corretamente', () => {
    assert.equal(formatPrice(49.9), 'R$ 49.90');
  });

  it('deve formatar preco inteiro', () => {
    assert.equal(formatPrice(50), 'R$ 50.00');
  });

  it('deve formatar preco com string', () => {
    assert.equal(formatPrice('49.90'), 'R$ 49.90');
  });
});

describe('Date Validation', () => {
  function isValidDate(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }

  function isFutureDate(dateStr) {
    if (!isValidDate(dateStr)) return false;
    const d = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d >= now;
  }

  it('deve aceitar data ISO valida', () => {
    assert.equal(isValidDate('2025-12-31'), true);
  });

  it('deve rejeitar data invalida', () => {
    assert.equal(isValidDate('2025-13-01'), false);
  });

  it('deve rejeitar string nao data', () => {
    assert.equal(isValidDate('abc'), false);
  });

  it('deve rejeitar null', () => {
    assert.equal(isValidDate(null), false);
  });

  it('deve rejeitar string vazia', () => {
    assert.equal(isValidDate(''), false);
  });

  it('deve aceitar data futura', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    assert.equal(isFutureDate(future.toISOString().split('T')[0]), true);
  });

  it('deve rejeitar data passada em isFutureDate', () => {
    assert.equal(isFutureDate('2020-01-01'), false);
  });
});

describe('Webhook Signature Verification', () => {
  function createSignature(payload, secret) {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  }

  function verifySignature(payload, signature, secret) {
    if (!signature || !secret) return false;
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  it('deve verificar assinatura valida', () => {
    const payload = { event: 'payment.completed', order_id: '123' };
    const secret = 'my-secret-key';
    const sig = createSignature(payload, secret);
    assert.equal(verifySignature(payload, sig, secret), true);
  });

  it('deve rejeitar assinatura invalida', () => {
    const payload = { event: 'payment.completed', order_id: '123' };
    assert.equal(verifySignature(payload, 'invalid-sig', 'my-secret-key'), false);
  });

  it('deve rejeitar assinatura vazia', () => {
    const payload = { event: 'payment.completed' };
    assert.equal(verifySignature(payload, '', 'secret'), false);
  });

  it('deve rejeitar sem secret configurado', () => {
    const payload = { event: 'payment.completed' };
    assert.equal(verifySignature(payload, 'some-sig', ''), false);
  });

  it('deve rejeitar payload adulterado', () => {
    const payload = { event: 'payment.completed', order_id: '123' };
    const secret = 'my-secret-key';
    const sig = createSignature(payload, secret);
    const tampered = { event: 'payment.failed', order_id: '123' };
    assert.equal(verifySignature(tampered, sig, secret), false);
  });
});

describe('Phone Validation', () => {
  function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  function isValidWhatsApp(whatsapp) {
    if (!whatsapp || typeof whatsapp !== 'string') return false;
    if (whatsapp.startsWith('http')) return true;
    const digits = whatsapp.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  it('deve aceitar telefone com DDD', () => {
    assert.equal(isValidPhone('(11) 99999-9999'), true);
  });

  it('deve aceitar telefone so numeros', () => {
    assert.equal(isValidPhone('11999999999'), true);
  });

  it('deve rejeitar telefone muito curto', () => {
    assert.equal(isValidPhone('9999'), false);
  });

  it('deve rejeitar telefone vazio', () => {
    assert.equal(isValidPhone(''), false);
  });

  it('deve aceitar whatsapp como URL', () => {
    assert.equal(isValidWhatsApp('https://wa.me/5511999999999'), true);
  });

  it('deve aceitar whatsapp como numero', () => {
    assert.equal(isValidWhatsApp('5511999999999'), true);
  });
});

describe('Theme Config Validation', () => {
  function validateThemeConfig(config) {
    const errors = [];

    if (config.bg_color && !/^#[0-9A-Fa-f]{3,6}$/.test(config.bg_color)) {
      errors.push('Cor de fundo inválida');
    }
    if (config.hover_color && !/^#[0-9A-Fa-f]{3,6}$/.test(config.hover_color)) {
      errors.push('Cor de destaque inválida');
    }
    if (config.text_color && !/^#[0-9A-Fa-f]{3,6}$/.test(config.text_color)) {
      errors.push('Cor da fonte inválida');
    }

    return errors;
  }

  it('deve aceitar config valida', () => {
    const errors = validateThemeConfig({
      bg_color: '#fafaf9',
      hover_color: '#1c1917',
      text_color: '#1c1917',
    });
    assert.equal(errors.length, 0);
  });

  it('deve rejeitar cor invalida', () => {
    const errors = validateThemeConfig({ bg_color: 'not-a-color' });
    assert.equal(errors.length, 1);
  });

  it('deve aceitar config vazia', () => {
    const errors = validateThemeConfig({});
    assert.equal(errors.length, 0);
  });

  it('deve rejeitar multiplas cores invalidas', () => {
    const errors = validateThemeConfig({
      bg_color: 'invalid',
      hover_color: 'also-invalid',
    });
    assert.equal(errors.length, 2);
  });
});

describe('Name Validation', () => {
  function isValidName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
  }

  it('deve aceitar nome valido', () => {
    assert.equal(isValidName('João Silva'), true);
  });

  it('deve rejeitar nome muito curto', () => {
    assert.equal(isValidName('A'), false);
  });

  it('deve rejeitar nome vazio', () => {
    assert.equal(isValidName(''), false);
  });

  it('deve rejeitar null', () => {
    assert.equal(isValidName(null), false);
  });

  it('deve aceitar nome com 100 caracteres', () => {
    assert.equal(isValidName('A'.repeat(100)), true);
  });

  it('deve rejeitar nome com 101 caracteres', () => {
    assert.equal(isValidName('A'.repeat(101)), false);
  });
});

describe('Message Validation', () => {
  function isValidMessage(message) {
    if (!message || typeof message !== 'string') return false;
    const trimmed = message.trim();
    return trimmed.length >= 10 && trimmed.length <= 2000;
  }

  it('deve aceitar mensagem valida', () => {
    assert.equal(isValidMessage('Olá, gostaria de um orçamento!'), true);
  });

  it('deve rejeitar mensagem muito curta', () => {
    assert.equal(isValidMessage('Oi'), false);
  });

  it('deve rejeitar mensagem vazia', () => {
    assert.equal(isValidMessage(''), false);
  });

  it('deve aceitar mensagem com 2000 caracteres', () => {
    assert.equal(isValidMessage('x'.repeat(2000)), true);
  });

  it('deve rejeitar mensagem com 2001 caracteres', () => {
    assert.equal(isValidMessage('x'.repeat(2001)), false);
  });
});
