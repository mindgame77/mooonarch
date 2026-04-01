exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set in Netlify environment variables' }) };

  let data;
  try { data = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const url = 'https://api.github.com/repos/mindgame77/mooonarch/contents/data.json';
  let sha = null;
  let existingData = {};
  try {
    const getRes = await fetch(url, { headers: { Authorization: 'token ' + token, 'User-Agent': 'mooonarch' } });
    if (getRes.ok) {
      const f = await getRes.json();
      sha = f.sha;
      existingData = JSON.parse(Buffer.from(f.content, 'base64').toString('utf8'));
    }
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
  // Add any leads in admin that aren't on server yet (edge case)
  adminLeads.forEach(al => {
    if (!merged.find(x => String(x.id) === String(al.id))) merged.push(al);
  });
  data.leads = merged;

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = { message: 'update site data [skip ci]', content };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json', 'User-Agent': 'mooonarch' },
    body: JSON.stringify(body)
  });

  if (!res.ok) { const e = await res.json(); return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
