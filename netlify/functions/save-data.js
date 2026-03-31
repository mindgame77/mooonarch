exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set in Netlify environment variables' }) };

  let data;
  try { data = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const url = 'https://api.github.com/repos/mindgame77/mooonarch/contents/data.json';
  let sha = null;
  try {
    const getRes = await fetch(url, { headers: { Authorization: 'token ' + token, 'User-Agent': 'mooonarch' } });
    if (getRes.ok) { const f = await getRes.json(); sha = f.sha; }
  } catch(e) {}

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = { message: 'update site data', content };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json', 'User-Agent': 'mooonarch' },
    body: JSON.stringify(body)
  });

  if (!res.ok) { const e = await res.json(); return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
