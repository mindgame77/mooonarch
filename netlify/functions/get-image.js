const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const filename = event.queryStringParameters && event.queryStringParameters.id;
  if (!filename) return { statusCode: 400, body: 'Missing id' };

  const store = getStore({ name: 'images', consistency: 'strong' });
  const content = await store.get(filename);
  if (!content) return { statusCode: 404, body: 'Not found' };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' },
    body: content,
    isBase64Encoded: true
  };
};
