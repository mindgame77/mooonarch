exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set' }) };

  let body;
  try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const url = 'https://api.github.com/repos/mindgame77/mooonarch/contents/data.json';
  let sha = null;
  let siteData = null;

  try {
    const getRes = await fetch(url, { headers: { Authorization: 'token ' + token, 'User-Agent': 'mooonarch' } });
    if (getRes.ok) {
      const f = await getRes.json();
      sha = f.sha;
      siteData = JSON.parse(Buffer.from(f.content, 'base64').toString('utf8'));
    }
  } catch(e) {}

  // Never commit if we couldn't load existing data — would wipe paintings
  if (!siteData) return { statusCode: 500, body: JSON.stringify({ error: 'Could not load existing data' }) };

  if (!siteData.leads) siteData.leads = [];
  siteData.leads.push({
    id: Date.now(),
    date: new Date().toISOString(),
    painting: body.painting || '',
    name: body.name || '',
    email: body.email || '',
    phone: body.phone || '',
    country: body.country || '',
    status: 'new'
  });

  const content = Buffer.from(JSON.stringify(siteData, null, 2)).toString('base64');
  const putBody = { message: 'new inquiry [skip ci]', content };
  if (sha) putBody.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json', 'User-Agent': 'mooonarch' },
    body: JSON.stringify(putBody)
  });

  if (!res.ok) { const e = await res.json(); return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }

  // Send email notification via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Mooonarch <onboarding@resend.dev>',
          to: 'malytskyyol@gmail.com',
          subject: 'New inquiry: ' + (body.painting || 'a painting'),
          html: `<p><strong>Painting:</strong> ${body.painting || '—'}</p>
<p><strong>Name:</strong> ${body.name || '—'}</p>
<p><strong>Email:</strong> ${body.email || '—'}</p>
<p><strong>Phone:</strong> ${body.phone || '—'}</p>
<p><strong>Country:</strong> ${body.country || '—'}</p>`
        })
      });
    } catch(e) {}
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
