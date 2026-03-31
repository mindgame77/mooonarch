const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { filename, content } = body;
  if (!filename || !content) return { statusCode: 400, body: 'Missing filename or content' };

  const store = getStore({ name: 'images', consistency: 'strong' });
  await store.set(filename, content);

  return {
    statusCode: 200,
    body: JSON.stringify({ url: '/.netlify/functions/get-image?id=' + encodeURIComponent(filename) })
  };
};
