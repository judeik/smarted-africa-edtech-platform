import Anthropic from '@anthropic-ai/sdk';
import redis from '../config/redis.js';
import env from '../config/env.js';

const client = new Anthropic({ apiKey: env.anthropicApiKey });

const INJECTION_PATTERNS = [
  'ignore previous', 'ignore all instructions', 'disregard your',
  'you are now', 'act as', 'pretend you are', 'roleplay as',
  'jailbreak', 'dan mode', 'developer mode', 'override your',
  'system prompt', 'new instructions:', 'forget everything',
];

const LANGUAGE_NAMES = {
  en: 'English', yo: 'Yoruba', ha: 'Hausa', ig: 'Igbo',
  fr: 'French', pt: 'Portuguese', sw: 'Swahili', am: 'Amharic',
};

const SYSTEM_PROMPT = `You are SmartEd AI, an expert educational tutor for African students preparing for:
- WAEC (West African Examinations Council)
- JAMB (Joint Admissions and Matriculation Board)
- NECO (National Examinations Council)
- GCE (General Certificate of Education)
- NCE (Nigeria Certificate in Education)

Guidelines:
1. Only answer questions related to these examinations and their subject areas.
2. If asked about unrelated topics, politely redirect: "I'm specialized in WAEC/JAMB/NECO/GCE/NCE preparation. What subject can I help with?"
3. Provide clear, step-by-step explanations suitable for secondary school students.
4. When solving problems, show working and explain each step.
5. Maintain an encouraging, positive tone.
6. The user's first message will include their language preference — respond in that language.
7. For past exam questions, explain both the answer and the reasoning.`;

export function validateMessage(text) {
  const t = (text || '').trim();
  if (!t) throw Object.assign(new Error('Question cannot be empty'), { status: 400 });
  if (t.length > 2000) throw Object.assign(new Error('Question too long (max 2000 characters)'), { status: 400 });
  const lower = t.toLowerCase();
  for (const pattern of INJECTION_PATTERNS) {
    if (lower.includes(pattern)) throw Object.assign(new Error('Message contains disallowed content'), { status: 400 });
  }
  return t;
}

async function getSession(sessionId) {
  try {
    const data = await redis.get(`ai:session:${sessionId}`);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

async function saveSession(sessionId, history) {
  try {
    const trimmed = history.slice(-(env.aiMaxHistoryTurns * 2));
    await redis.set(`ai:session:${sessionId}`, JSON.stringify(trimmed), 'EX', env.aiSessionTtl);
  } catch { /* session persistence is non-critical */ }
}

export async function clearSession(sessionId) {
  await redis.del(`ai:session:${sessionId}`).catch(() => {});
}

function buildRequest(history, userText, language) {
  const langName = LANGUAGE_NAMES[language] || 'English';
  let system = SYSTEM_PROMPT;
  if (language !== 'en') system += `\n\nIMPORTANT: Respond in ${langName} for this session.`;
  return { system, messages: [...history, { role: 'user', content: userText }] };
}

export async function streamChat(res, sessionId, userText, language) {
  const history = await getSession(sessionId);
  const { system, messages } = buildRequest(history, userText, language);
  let fullResponse = '';

  const stream = await client.messages.create({
    model: env.anthropicModel,
    max_tokens: 1024,
    system,
    messages,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullResponse += event.delta.text;
      res.write(`data: ${JSON.stringify({ token: event.delta.text, session_id: sessionId })}\n\n`);
    }
  }

  await saveSession(sessionId, [
    ...history,
    { role: 'user', content: userText },
    { role: 'assistant', content: fullResponse },
  ]);

  return fullResponse;
}

export async function completeChat(sessionId, userText, language) {
  const history = await getSession(sessionId);
  const { system, messages } = buildRequest(history, userText, language);

  const message = await client.messages.create({
    model: env.anthropicModel,
    max_tokens: 1024,
    system,
    messages,
  });

  const answer = message.content[0].text;

  await saveSession(sessionId, [
    ...history,
    { role: 'user', content: userText },
    { role: 'assistant', content: answer },
  ]);

  return { answer, tokens: message.usage.input_tokens + message.usage.output_tokens };
}
