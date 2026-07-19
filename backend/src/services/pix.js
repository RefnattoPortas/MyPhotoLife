import { env } from '../config/index.js';

const PIX_EXPIRATION_MINUTES = 30;

function generateBrCode(pixKey, amount, txId, merchantName, merchantCity) {
  const merchantNameClean = (merchantName || 'MyPhotoLife').substring(0, 25).toUpperCase();
  const merchantCityClean = (merchantCity || 'SAO PAULO').substring(0, 15).toUpperCase();
  const txIdClean = (txId || '***').substring(0, 25);

  const amountFormatted = amount.toFixed(2);

  const payload = [
    '000201',
    '010212',
    '26' + padLength('0014BR.GOV.BCB.PIX' + '01' + padLength(pixKey)),
    '52040000',
    '5303986',
    '54' + padLength(amountFormatted),
    '5802BR',
    '59' + padLength(merchantNameClean),
    '60' + padLength(merchantCityClean),
    '62' + padLength('05' + padLength(txIdClean)),
    '6304',
  ].join('');

  const crc16 = calculateCRC16(payload);
  return payload + crc16;
}

function padLength(value) {
  const len = String(value).length;
  return String(len).padStart(2, '0') + value;
}

function calculateCRC16(payload) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export async function generatePixPayment({ amount, pixKey, pixKeyType, merchantName, orderId }) {
  const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60 * 1000);
  const txId = `MPL${orderId.replace(/-/g, '').substring(0, 25)}`;

  let pixQrcode = null;
  let pixCopyPaste = null;
  let gatewayPaymentId = null;

  if (env.pix.gatewayUrl && env.pix.gatewayApiKey) {
    try {
      const pixPayload = {
        amount,
        order_id: orderId,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
        merchant_name: merchantName,
        expires_at: expiresAt.toISOString(),
      };

      const pixResponse = await fetch(`${env.pix.gatewayUrl}/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.pix.gatewayApiKey}`,
        },
        body: JSON.stringify(pixPayload),
      });

      if (pixResponse.ok) {
        const pixData = await pixResponse.json();
        pixQrcode = pixData.qrcode || null;
        pixCopyPaste = pixData.copy_paste || null;
        gatewayPaymentId = pixData.id || null;
        if (pixData.expires_at) {
          expiresAt.setTime(new Date(pixData.expires_at).getTime());
        }
      }
    } catch {
      // Fallback to static BR Code if gateway fails
    }
  }

  if (!pixCopyPaste) {
    pixCopyPaste = generateBrCode(pixKey, amount, txId, merchantName, 'SAO PAULO');
    pixQrcode = null;
  }

  return { pixQrcode, pixCopyPaste, pixExpiresAt: expiresAt, gatewayPaymentId };
}

export async function queryGatewayPayment(paymentId) {
  if (!env.pix.gatewayUrl || !env.pix.gatewayApiKey) {
    return null;
  }

  try {
    const response = await fetch(`${env.pix.gatewayUrl}/charge/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.pix.gatewayApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export { PIX_EXPIRATION_MINUTES };
