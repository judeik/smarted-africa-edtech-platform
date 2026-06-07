import crypto from 'crypto';
import { validateMessage, streamChat, completeChat, clearSession } from '../services/aiService.js';

export const chat = async (req, res, next) => {
  const { message, session_id, language = 'en', stream: shouldStream = true } = req.body;
  const sessionId = session_id || crypto.randomUUID();

  try {
    const text = validateMessage(message);

    if (shouldStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('X-Session-Id', sessionId);
      res.flushHeaders();

      let closed = false;
      req.on('close', () => { closed = true; });

      try {
        await streamChat(res, sessionId, text, language);
        if (!closed) {
          res.write(`data: ${JSON.stringify({ done: true, session_id: sessionId })}\n\n`);
          res.end();
        }
      } catch (streamErr) {
        if (!closed) {
          res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
          res.end();
        }
      }
    } else {
      const { answer, tokens } = await completeChat(sessionId, text, language);
      res.json({ success: true, answer, session_id: sessionId, tokens });
    }
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    await clearSession(req.params.sessionId);
    res.json({ success: true, cleared: true });
  } catch (err) {
    next(err);
  }
};
