/**
 * Cloudflare Pages Function for ChatGPT API
 * This runs as a serverless function on Cloudflare Pages
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  // Log for debugging
  console.log('Function called:', request.method, request.url);
  
  // Handle OPTIONS for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.', method: request.method }),
      { 
        status: 405, 
        headers: { 
          'Content-Type': 'application/json',
          'Allow': 'POST, OPTIONS',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
  
  try {
    const { question, language, context: reportContext } = await request.json();

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get OpenAI API key from environment variable
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not set in environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const safeLanguage = language === 'hi' ? 'Hindi' : 'English';
    const trimmedContext = Array.isArray(reportContext) ? reportContext : [];

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

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.4,
        max_tokens: 700
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      
      let errorMessage = `OpenAI API error: ${openaiResponse.status}`;
      if (openaiResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (openaiResponse.status === 401) {
        errorMessage = 'Invalid API key. Please check your OpenAI API key.';
      } else if (openaiResponse.status === 402) {
        errorMessage = 'Payment required. Please check your OpenAI account billing.';
      }
      
      throw new Error(errorMessage);
    }

    const completion = await openaiResponse.json();
    const answer = completion.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error('Empty response from OpenAI.');
    }

    return new Response(
      JSON.stringify({ answer }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } 
      }
    );
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: 'ChatGPT call failed.',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}


