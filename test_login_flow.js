const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

async function testFlow() {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  const res = await axios.get('https://sp.srmist.edu.in/srmiststudentportal/', {
    httpsAgent,
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  console.log('GET Portal status:', res.status);
  console.log('Set-Cookie headers:', res.headers['set-cookie']);

  const $ = cheerio.load(res.data);
  const captchaSrc = $('img#secure_captcha').attr('data-src');
  console.log('Captcha src:', captchaSrc);

  const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  // Download captcha
  const capUrl = 'https://sp.srmist.edu.in' + captchaSrc;
  const capRes = await axios.get(capUrl, {
    httpsAgent,
    headers: {
      'User-Agent': userAgent,
      'Cookie': cookies,
      'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/'
    }
  });
  console.log('Captcha download status:', capRes.status);
  console.log('New Set-Cookie on captcha:', capRes.headers['set-cookie']);

  // Extract config
  let secConfig = {};
  $('script').each((_, s) => {
    const txt = $(s).html() || '';
    if (txt.includes('SECURE_CONFIG')) {
      const matchNonce = txt.match(/nonce\s*[=:]\s*'([^']+)'/i);
      const matchDomainField = txt.match(/domainFieldName\s*[=:]\s*'([^']+)'/i);
      const matchCaptchaField = txt.match(/captchaFieldName\s*[=:]\s*'([^']+)'/i);
      const matchDelimiter = txt.match(/randomDelimiter\s*[=:]\s*'([^']+)'/i);
      if (matchDomainField) secConfig.domainField = matchDomainField[1];
      if (matchCaptchaField) secConfig.captchaField = matchCaptchaField[1];
      if (matchDelimiter) secConfig.delimiter = matchDelimiter[1];
    }
  });

  console.log('Extracted config:', secConfig);
}

testFlow().catch(console.error);
