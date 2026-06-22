const QRCode = require('qrcode');
const env = require('../config/env');

/**
 * buildVerificationPayload
 * Builds the string encoded into the QR code. A real deployment would
 * point this at a public verification endpoint, e.g.
 * https://whiteforest.com/verify/WF-2026-87452
 */
const buildVerificationPayload = (referenceNumber) => {
  const baseUrl = env.CLIENT_URL || 'https://whiteforest.com';
  return `${baseUrl}/verify-booking?ref=${encodeURIComponent(referenceNumber)}`;
};

/**
 * generateQRCodeDataURL
 * Returns a base64 PNG data URL of the QR code, ready to embed directly
 * into a PDF via pdfkit's doc.image().
 */
const generateQRCodeDataURL = async (referenceNumber) => {
  const payload = buildVerificationPayload(referenceNumber);
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
  });
  return { payload, dataUrl };
};

/**
 * generateQRCodeBuffer
 * Returns a raw PNG buffer of the QR code (alternative to data URL).
 */
const generateQRCodeBuffer = async (referenceNumber) => {
  const payload = buildVerificationPayload(referenceNumber);
  const buffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
  });
  return { payload, buffer };
};

module.exports = {
  buildVerificationPayload,
  generateQRCodeDataURL,
  generateQRCodeBuffer,
};
