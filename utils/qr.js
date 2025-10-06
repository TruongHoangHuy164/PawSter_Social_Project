import crypto from 'crypto';
import QRCode from 'qrcode';

const ALG = 'sha256';

export const generateFriendQR = async (userId, secret, ttlMs = 3600000) => {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac(ALG, secret).update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${sig}`).toString('base64url');
  const qrData = JSON.stringify({ t: token, v: 1 });
  const dataURL = await QRCode.toDataURL(qrData, { errorCorrectionLevel: 'M' });
  return { token, expiresAt: new Date(exp), qr: dataURL };
};

export const verifyFriendQR = (token, secret) => {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [userId, exp, sig] = decoded.split('.');
    if (!userId || !exp || !sig) return { valid: false, reason: 'Malformed token' };
    if (Date.now() > Number(exp)) return { valid: false, reason: 'Expired' };
    const payload = `${userId}.${exp}`;
    const expected = crypto.createHmac(ALG, secret).update(payload).digest('hex');
    if (expected !== sig) return { valid: false, reason: 'Signature mismatch' };
    return { valid: true, userId };
  } catch (e) {
    return { valid: false, reason: 'Decode error' };
  }
};
