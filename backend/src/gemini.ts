// Gemini 호출 헬퍼 (REST, 의존성 없음)
const KEY = () => process.env.GEMINI_API_KEY || '';
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function call(prompt: string, json: boolean): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent?key=${KEY()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const d: any = await res.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function geminiJson<T = any>(prompt: string): Promise<T> {
  const t = await call(prompt, true);
  const m = t.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : t);
}

export async function geminiText(prompt: string): Promise<string> {
  return (await call(prompt, false)).trim();
}
