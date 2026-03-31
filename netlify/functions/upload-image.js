function getCtx() {
  const raw = process.env.NETLIFY_BLOBS_CONTEXT;
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64').toString()); } catch(e) { return null; }
}

async function setBlob(storeName, key, value) {
  const ctx = getCtx();
  if (!ctx) throw new Error('Netlify Blobs not available');
  const url = `${ctx.edgeURL}/${ctx.siteID}/${storeName}/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { authorization: `Bearer ${ctx.token}`, 'content-type': 'text/plain' },
    body: value
  });
  if (!res.ok) throw new Error('Store failed: ' + res.status);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { filename, content } = body;
  if (!filename || !content) return { statusCode: 400, body: JSON.stringify({ error: 'Missing filename or content' }) };

  try {
    await setBlob('images', filename, content);
    return {
      statusCode: 200,
      body: JSON.stringify({ url: '/.netlify/functions/get-image?id=' + encodeURIComponent(filename) })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
