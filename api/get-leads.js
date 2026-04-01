module.exports = async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  const REPO = 'mindgame77/mooonarch-leads';
  const headers = { Authorization: 'token ' + token, 'User-Agent': 'mooonarch' };

  try {
    const apiRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/leads.json', { headers });
    if (apiRes.status === 404) return res.status(200).json({ leads: [] });
    const data = await apiRes.json();
    const leads = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    return res.status(200).json({ leads });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
