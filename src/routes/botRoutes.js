import express from 'express';
import { getClientBot } from '../controllers/clientBot.js';
import { getAdminBot } from '../controllers/adminBot.js';
import { getReceiverBot } from '../controllers/receiverBot.js';
import { getPickerBot } from '../controllers/pickerBot.js';
import { getCourierBot } from '../controllers/courierBot.js';

const router = express.Router();

// Get all bots status
router.get('/status', (req, res) => {
  const clientBot = getClientBot();
  const adminBot = getAdminBot();
  const receiverBot = getReceiverBot();
  const pickerBot = getPickerBot();
  const courierBot = getCourierBot();
  
  res.json({
    bots: {
      client: clientBot ? 'active' : 'inactive',
      admin: adminBot ? 'active' : 'inactive',
      receiver: receiverBot ? 'active' : 'inactive',
      picker: pickerBot ? 'active' : 'inactive',
      courier: courierBot ? 'active' : 'inactive',
    },
    allActive: !!(clientBot && adminBot && receiverBot && pickerBot && courierBot),
    message: 'Multi-bot system status'
  });
});

// Send message endpoint (for testing or admin use)
router.post('/send-message', async (req, res) => {
  try {
    const { chatId, text, botType = 'client' } = req.body;
    
    if (!chatId || !text) {
      return res.status(400).json({ error: 'chatId, text are required' });
    }

    let bot;
    switch (botType) {
      case 'admin':
        bot = getAdminBot();
        break;
      case 'receiver':
        bot = getReceiverBot();
        break;
      case 'picker':
        bot = getPickerBot();
        break;
      case 'courier':
        bot = getCourierBot();
        break;
      case 'client':
      default:
        bot = getClientBot();
        break;
    }

    if (!bot) {
      return res.status(503).json({ error: `${botType} bot is not initialized` });
    }

    await bot.sendMessage(chatId, text);
    res.json({ success: true, message: `Message sent via ${botType} bot` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notify admins and receivers endpoint
router.post('/notify-order', async (req, res) => {
  try {
    const { orderData } = req.body;
    
    if (!orderData) {
      return res.status(400).json({ error: 'orderData is required' });
    }

    const { notifyAdmins } = await import('../controllers/adminBot.js');
    const { notifyReceivers } = await import('../controllers/receiverBot.js');
    
    // Notify both admins and receivers
    await Promise.all([
      notifyAdmins(orderData),
      notifyReceivers(orderData)
    ]);
    
    res.json({ success: true, message: 'Admins and receivers notified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

