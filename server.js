import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(__dirname));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/chat', async (req, res) => {
  try {
    const { question, language, context } = req.body || {};

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const safeLanguage = language === 'hi' ? 'Hindi' : 'English';
    const trimmedContext = Array.isArray(context) ? context : [];

    const contextPrompt = trimmedContext
      .map((item, index) => {
        const title = item?.title ? item.title : `Section ${index + 1}`;
        const content = item?.content ? item.content : '';
        return `#${index + 1} ${title}\n${content}`;
      })
      .join('\n\n');

    const userPrompt = `
You are a Vedic astrology assistant. Answer in ${safeLanguage}.
Use ONLY the following report context:

${contextPrompt || '(No context provided)'}

Question: ${question}
Answer:
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.4,
      max_tokens: 700
    });

    const answer = completion.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      throw new Error('Empty response from OpenAI.');
    }

    res.json({ answer });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'ChatGPT call failed.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open your browser and visit: http://localhost:${PORT}`);
});

