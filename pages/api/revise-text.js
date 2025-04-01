import { OpenAI } from 'openai';
import { KEYWORDS } from '../../lib/keywords';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'No input text provided' });
  }

  // Create bullet list of keywords
  const keywordList = KEYWORDS.map(kw => `- ${kw.keyword || kw}`).join('\n');
  const systemPrompt = `
You are a content editor. Your job is to revise text to remove or replace any terms that appear in the following glossary. 
Do not reference, allude to, or reword them in a way that keeps their original ideological implication.

Glossary of Prohibited Terms:
${keywordList}

Be neutral and professional. Do not make the text sound ideological. Make it sound clean, straightforward, and non-political.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user', content: text }
      ],
    });

    const revisedText = completion.choices[0].message.content;

    // Optional post-filter: highlight any missed keywords (QA step)
    const remaining = KEYWORDS.filter(({ keyword }) =>
      revisedText.toLowerCase().includes(keyword.toLowerCase())
    ).map(k => k.keyword);

    return res.status(200).json({ 
      revised: revisedText,
      remaining_keywords: remaining
    });

  } catch (err) {
    console.error('Error during OpenAI call:', err);
    return res.status(500).json({ error: 'Failed to generate revision' });
  }
}
