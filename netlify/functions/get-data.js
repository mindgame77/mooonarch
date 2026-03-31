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

exports.handler = async () => {
  try {
    const data = await getBlob('site-data', 'data');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: data || '{}'
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
