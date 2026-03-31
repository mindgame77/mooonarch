const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  const store = getStore({ name: 'site-data', consistency: 'strong' });
  const data = await store.get('data');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: data || '{}'
  };
};
