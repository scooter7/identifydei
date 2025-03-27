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

  // Build prompt that avoids all glossary keywords
  const filteredKeywords = KEYWORDS.join(', ');
  const systemPrompt = `You are a content editor. Your job is to revise input text to remove and replace any terms that appear in this glossary:\n\n${filteredKeywords}\n\nMake sure the new version does not include or allude to any of these terms. Write clearly and neutrally.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
    });

    const revisedText = completion.choices[0].message.content;
    return res.status(200).json({ revised: revisedText });
  } catch (err) {
    console.error('Error during OpenAI call:', err);
    return res.status(500).json({ error: 'Failed to generate revision' });
  }
}
