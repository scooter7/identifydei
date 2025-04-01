import { KEYWORDS } from '../../lib/keywords';
import axios from 'axios';
import * as cheerio from 'cheerio';

function searchKeywordsWithScore(text, keywordsList) {
  const textLower = text.toLowerCase();
  const found = [];

  for (const { keyword, score } of keywordsList) {
    if (textLower.includes(keyword.toLowerCase())) {
      found.push({ keyword, score });
    }
  }

  return found;
}

function removeIgnored(text, ignoreList) {
  let cleaned = text;
  ignoreList.forEach(ignore => {
    const regex = new RegExp(ignore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  return cleaned;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { urls, ignoreText } = req.body;
  if (!urls) {
    return res.status(400).json({ error: 'No URLs provided' });
  }

  const ignoreLines = (ignoreText || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const urlList = urls.split(',').map(u => u.trim()).filter(Boolean);
  const results = [];

  let totalScore = 0;

  for (const url of urlList) {
    const result = { url, keywords_found: [], page_score: 0 };

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const html = response.data;
      const $ = cheerio.load(html);
      const text = removeIgnored($('body').text(), ignoreLines);

      const matches = searchKeywordsWithScore(text, KEYWORDS);
      const pageScore = matches.reduce((sum, m) => sum + m.score, 0);

      result.keywords_found = matches.map(m => m.keyword);
      result.page_score = pageScore;

      totalScore += pageScore;

      // Optional: Social media post date
      const socialDomains = ['twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com'];
      if (socialDomains.some(domain => url.includes(domain))) {
        const timeTag = $('time').attr('datetime');
        if (timeTag) result.social_media_date = timeTag;
      }

    } catch (err) {
      result.error = err.message;
    }

    results.push(result);
  }

  const averageSensitivityScore = urlList.length > 0
    ? +(totalScore / urlList.length).toFixed(2)
    : 0;

  return res.status(200).json({ results, averageSensitivityScore });
}
