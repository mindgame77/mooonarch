exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set in Netlify environment variables' }) };

  let data;
  try { data = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

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
    return { statusCode: 409, body: JSON.stringify({ error: 'Refusing to overwrite real paintings with placeholder data' }) };
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
  const putBody = { message: 'update site data [skip ci]', content };
  if (sha) putBody.sha = sha;

  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/data.json', {
    method: 'PUT', headers, body: JSON.stringify(putBody)
  });

  if (!res.ok) { const e = await res.json(); return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
