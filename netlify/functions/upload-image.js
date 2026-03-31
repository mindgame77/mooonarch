exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set in Netlify environment variables' }) };

  let body;
  try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { filename, content } = body;
  if (!filename || !content) return { statusCode: 400, body: 'Missing filename or content' };

  const url = 'https://api.github.com/repos/mindgame77/mooonarch/contents/images/' + filename;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'upload image', content })
  });

  if (!res.ok) { const e = await res.json(); return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }

  const imageUrl = 'https://raw.githubusercontent.com/mindgame77/mooonarch/main/images/' + filename;
  return { statusCode: 200, body: JSON.stringify({ url: imageUrl }) };
};
