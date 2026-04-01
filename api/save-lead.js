module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  const body = req.body;
  if (!body) return res.status(400).send('Invalid JSON');

  const REPO = 'mindgame77/mooonarch';
  const headers = { Authorization: 'token ' + token, 'User-Agent': 'mooonarch', 'Content-Type': 'application/json' };

  // Read content via raw URL (no 1MB size limit)
  let siteData = null;
  try {
    const rawRes = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/data.json?v=' + Date.now());
    if (rawRes.ok) siteData = await rawRes.json();
  } catch(e) {}

  if (!siteData) return res.status(500).json({ error: 'Could not load existing data' });

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
  const putBody = { message: 'new inquiry [vercel skip]', content };
  if (sha) putBody.sha = sha;

  const putRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/data.json', {
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
