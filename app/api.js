import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { promptText } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY; // Vercel pulls this from your settings

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      }
    );

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;
    
    // Clean JSON from markdown if necessary
    const cleanedJson = aiText.replace(/```json|```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleanedJson));
  } catch (error) {
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500 });
  }
}