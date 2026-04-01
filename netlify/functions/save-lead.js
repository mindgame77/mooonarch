exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set' }) };

  let body;
  try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const REPO = 'mindgame77/mooonarch';
  const headers = { Authorization: 'token ' + token, 'User-Agent': 'mooonarch', 'Content-Type': 'application/json' };

  // Read content via raw URL (no 1MB size limit)
  let siteData = null;
  try {
    const rawRes = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/data.json?v=' + Date.now());
    if (rawRes.ok) siteData = await rawRes.json();
  } catch(e) {}

  if (!siteData) return { statusCode: 500, body: JSON.stringify({ error: 'Could not load existing data' }) };

  // Get SHA via git tree API
  let sha = null;
  try {
    const refRes = await fetch('https://api.github.com/repos/' + REPO + '/git/ref/heads/main', { headers });
    const refData = await refRes.json();
    const treeRes = await fetch('https://api.github.com/repos/' + REPO + '/git/trees/' + refData.object.sha, { headers });
    const treeData = await treeRes.json();
    const file = (treeData.tree || []).find(f => f.path === 'data.json');
    if (file) sha = file.sha;
  } catch(e) {}

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

  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/data.json', {
    method: 'PUT', headers, body: JSON.stringify(putBody)
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
