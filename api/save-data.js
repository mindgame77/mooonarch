module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set in environment variables' });

  const data = req.body;
  if (!data) return res.status(400).send('Invalid JSON');

  const REPO = 'mindgame77/mooonarch';
  const headers = { Authorization: 'token ' + token, 'User-Agent': 'mooonarch', 'Content-Type': 'application/json' };

  // Read content via raw URL (no 1MB size limit)
  let existingData = {};
  try {
    const rawRes = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/data.json?v=' + Date.now());
    if (rawRes.ok) existingData = await rawRes.json();
  } catch(e) {}

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

  // Guard: never overwrite real paintings with placeholders
  const isPlaceholder = p => p.images && p.images.some(img => img.includes('unsplash.com'));
  const incomingAllPlaceholder = (data.paintings || []).every(isPlaceholder);
  const existingHasReal = (existingData.paintings || []).some(p => !isPlaceholder(p));
  if (incomingAllPlaceholder && existingHasReal) {
    return res.status(409).json({ error: 'Refusing to overwrite real paintings with placeholder data' });
  }

  // Merge leads: keep all server leads, only update statuses from admin
  const serverLeads = existingData.leads || [];
  const adminLeads = data.leads || [];
  const merged = serverLeads.map(sl => {
    const al = adminLeads.find(x => String(x.id) === String(sl.id));
    return al ? { ...sl, status: al.status } : sl;
  });
  adminLeads.forEach(al => {
    if (!merged.find(x => String(x.id) === String(al.id))) merged.push(al);
  });
  data.leads = merged;

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const putBody = { message: 'update site data [vercel skip]', content };
  if (sha) putBody.sha = sha;

  const putRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/data.json', {
    method: 'PUT', headers, body: JSON.stringify(putBody)
  });

  if (!putRes.ok) { const e = await putRes.json(); return res.status(500).json({ error: e.message }); }
  res.status(200).json({ success: true });
};
