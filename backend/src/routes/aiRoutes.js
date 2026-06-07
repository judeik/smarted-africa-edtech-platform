import express from 'express';
import { chat, deleteSession } from '../controllers/aiController.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/chat', aiLimiter, chat);
router.delete('/session/:sessionId', deleteSession);

export default router;
