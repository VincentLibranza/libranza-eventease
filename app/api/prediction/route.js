import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { promptText } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) return NextResponse.json({ error: "AI Key missing" }, { status: 500 });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      }
    );

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from AI response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON");
    
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}