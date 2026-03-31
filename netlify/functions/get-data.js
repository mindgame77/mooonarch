const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  const store = getStore('site-data');
  const data = await store.get('data');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: data || '{}'
  };
};
