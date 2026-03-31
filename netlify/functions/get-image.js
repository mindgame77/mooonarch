function getCtx() {
  const raw = process.env.NETLIFY_BLOBS_CONTEXT;
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64').toString()); } catch(e) { return null; }
}

async function getBlob(storeName, key) {
  const ctx = getCtx();
  if (!ctx) return null;
  const url = `${ctx.edgeURL}/${ctx.siteID}/${storeName}/${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${ctx.token}` } });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return await res.text();
}

exports.handler = async (event) => {
  const filename = event.queryStringParameters && event.queryStringParameters.id;
  if (!filename) return { statusCode: 400, body: 'Missing id' };

  try {
    const content = await getBlob('images', filename);
    if (!content) return { statusCode: 404, body: 'Not found' };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' },
      body: content,
      isBase64Encoded: true
    };
  } catch(e) {
    return { statusCode: 500, body: e.message };
  }
};
