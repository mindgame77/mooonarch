module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  const body = req.body;
  if (!body) return res.status(400).send('Invalid JSON');

  const PRIVATE_REPO = 'mindgame77/mooonarch-leads';
  const PUBLIC_REPO = 'mindgame77/mooonarch';
  const headers = { Authorization: 'token ' + token, 'User-Agent': 'mooonarch', 'Content-Type': 'application/json' };

  // Read existing leads from private repo
  let leads = [];
  let sha = null;
  try {
    const apiRes = await fetch('https://api.github.com/repos/' + PRIVATE_REPO + '/contents/leads.json', { headers });
    if (apiRes.ok) {
      const d = await apiRes.json();
      sha = d.sha;
      leads = JSON.parse(Buffer.from(d.content, 'base64').toString('utf8'));
    }
  } catch(e) {}

  leads.push({
    id: Date.now(),
    date: new Date().toISOString(),
    painting: body.painting || '',
    name: body.name || '',
    email: body.email || '',
    phone: body.phone || '',
    country: body.country || '',
    status: 'new'
  });

  const content = Buffer.from(JSON.stringify(leads, null, 2)).toString('base64');
  const putBody = { message: 'new inquiry [vercel skip]', content };
  if (sha) putBody.sha = sha;

  const putRes = await fetch('https://api.github.com/repos/' + PRIVATE_REPO + '/contents/leads.json', {
    method: 'PUT', headers, body: JSON.stringify(putBody)
  });

  if (!putRes.ok) { const e = await putRes.json(); return res.status(500).json({ error: e.message }); }

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

  res.status(200).json({ success: true });
};
