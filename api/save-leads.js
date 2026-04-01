module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  const { leads } = req.body || {};
  if (!leads) return res.status(400).json({ error: 'Missing leads' });

  const REPO = 'mindgame77/mooonarch-leads';
  const headers = { Authorization: 'token ' + token, 'User-Agent': 'mooonarch', 'Content-Type': 'application/json' };

  // Get current SHA if file exists
  let sha = null;
  try {
    const apiRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/leads.json', { headers });
    if (apiRes.ok) { const d = await apiRes.json(); sha = d.sha; }
  } catch(e) {}

  const content = Buffer.from(JSON.stringify(leads, null, 2)).toString('base64');
  const putBody = { message: 'update lead statuses [vercel skip]', content };
  if (sha) putBody.sha = sha;

  const putRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/leads.json', {
    method: 'PUT', headers, body: JSON.stringify(putBody)
  });

  if (!putRes.ok) { const e = await putRes.json(); return res.status(500).json({ error: e.message }); }
  res.status(200).json({ success: true });
};
