import crypto from 'crypto';
import axios from 'axios';

const {
  MOMO_PARTNER_CODE,
  MOMO_ACCESS_KEY,
  MOMO_SECRET_KEY,
  MOMO_ENDPOINT,
  MOMO_REDIRECT_URL,
  MOMO_IPN_URL
} = process.env;

export function isMomoConfigured() {
  return !!(MOMO_PARTNER_CODE && MOMO_ACCESS_KEY && MOMO_SECRET_KEY && MOMO_ENDPOINT && MOMO_REDIRECT_URL && MOMO_IPN_URL);
}

function buildRawSignatureCreate({ amount, extraData, orderId, orderInfo, requestId, requestType, redirectUrl, ipnUrl }) {
  return `accessKey=${MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
         `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_PARTNER_CODE}` +
         `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
}

export function signHmacSHA256(raw) {
  return crypto.createHmac('sha256', MOMO_SECRET_KEY).update(raw).digest('hex');
}

export async function createMoMoOrder({ amount, orderId, orderInfo, extraDataObj }) {
  const requestType = 'captureWallet';
  const requestId = orderId;
  const extraData = Buffer.from(JSON.stringify(extraDataObj || {}), 'utf8').toString('base64');

  const rawSignature = buildRawSignatureCreate({
    amount, extraData, orderId, orderInfo, requestId, requestType,
    redirectUrl: MOMO_REDIRECT_URL, ipnUrl: MOMO_IPN_URL
  });
  const signature = signHmacSHA256(rawSignature);

  const body = {
    partnerCode: MOMO_PARTNER_CODE,
    accessKey: MOMO_ACCESS_KEY,
    requestId,
    amount: String(amount),
    orderId,
    orderInfo,
    redirectUrl: MOMO_REDIRECT_URL,
    ipnUrl: MOMO_IPN_URL,
    requestType,
    extraData,
    signature,
    lang: 'vi'
  };

  const url = `${MOMO_ENDPOINT}/v2/gateway/api/create`;
  try {
    const { data } = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    return data;
  } catch (err) {
    // Surface as a structured error to controller
    const resp = err.response?.data;
    const message = resp?.message || err.message || 'MoMo create request failed';
    const code = err.response?.status || 500;
    const e = new Error(message);
    e.statusCode = code;
    e.momoResponse = resp;
    throw e;
  }
}

export function verifyIpnSignature(ipnBody) {
  const {
    amount, extraData = '', message = '', orderId, orderInfo, orderType = '',
    partnerCode, payType = '', requestId, responseTime = '', resultCode, transId
  } = ipnBody;

  const raw = `accessKey=${MOMO_ACCESS_KEY}` +
              `&amount=${amount}` +
              `&extraData=${extraData}` +
              `&message=${message}` +
              `&orderId=${orderId}` +
              `&orderInfo=${orderInfo}` +
              `&orderType=${orderType}` +
              `&partnerCode=${partnerCode}` +
              `&payType=${payType}` +
              `&requestId=${requestId}` +
              `&responseTime=${responseTime}` +
              `&resultCode=${resultCode}` +
              `&transId=${transId}`;
  const expected = signHmacSHA256(raw);
  return expected === ipnBody.signature;
}
