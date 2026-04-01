module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set in environment variables' });

  const { filename, content } = req.body || {};
  if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });

  const url = 'https://api.github.com/repos/mindgame77/mooonarch/contents/images/' + filename;
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json', 'User-Agent': 'mooonarch' },
    body: JSON.stringify({ message: 'upload image', content })
  });

  if (!putRes.ok) { const e = await putRes.json(); return res.status(500).json({ error: e.message }); }

  const imageUrl = 'https://raw.githubusercontent.com/mindgame77/mooonarch/main/images/' + filename;
  res.status(200).json({ url: imageUrl });
};
