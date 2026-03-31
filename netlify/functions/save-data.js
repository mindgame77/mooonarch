const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const store = getStore('site-data');
  await store.set('data', JSON.stringify(body));

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
