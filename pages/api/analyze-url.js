import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { KEYWORDS } from '../../lib/keywords';

function searchKeywords(text, keywords) {
  const found = [];
  const textLower = text.toLowerCase();
  for (const kw of keywords) {
    if (textLower.includes(kw.toLowerCase())) {
      found.push(kw);
    }
  }
  return [...new Set(found)];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { urls } = req.body;
  if (!urls) {
    return res.status(400).json({ error: 'No URLs provided' });
  }

  const urlList = urls.split(',').map(u => u.trim()).filter(Boolean);
  const results = [];

  for (const url of urlList) {
    const result = { url, keywords_found: [] };
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = response.data;
      const $ = cheerio.load(html);
      const text = $('body').text();
      result.keywords_found = searchKeywords(text, KEYWORDS);

      // Attempt to detect social media post date
      const socialDomains = ['twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com'];
      if (socialDomains.some(domain => url.includes(domain))) {
        const timeTag = $('time').attr('datetime');
        if (timeTag) {
          result.social_media_date = timeTag;
        }
      }
    } catch (err) {
      result.error = err.message;
    }
    results.push(result);
  }

  return res.status(200).json({ results });
}
