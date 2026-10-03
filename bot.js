const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const pino = require('pino');

const app = express();
app.use(express.json());

// ===== NÚMEROS QUE RECIBEN NOTIFICACIONES =====
const NUMEROS = [
  '18295282022', // 👩 Mamá
  '18294382022'  // 👨 Tú (Christian)
];

let sock = null;

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');
  
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Alcancías Carol', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\n📱 ESCANEA ESTE QR CON WHATSAPP DEL BOT (849-486-7620):\n');
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexión cerrada. Reconectando...', shouldReconnect);
      if (shouldReconnect) iniciarBot();
    } else if (connection === 'open') {
      console.log('✅ ¡Bot conectado y funcionando!');
    }
  });

  // ===== ENDPOINT QUE RECIBE PEDIDOS DE LA PÁGINA WEB =====
  app.post('/pedido', async (req, res) => {
    const { cliente, telefono, direccion, ciudad, total, productos, orderId } = req.body;
    
    const mensaje = 
      `🐷 *¡NUEVO PEDIDO!* 🐷\n\n` +
      `🆔 Pedido: *${orderId || 'N/A'}*\n` +
      `👤 Cliente: ${cliente}\n` +
      `📞 Teléfono: ${telefono}\n` +
      `🏠 Dirección: ${direccion}\n` +
      `🏙️ Ciudad: ${ciudad}\n\n` +
      `🛒 *Productos:*\n${productos}\n\n` +
      `💰 *TOTAL: $${total}*\n\n` +
      `📅 ${new Date().toLocaleString('es-DO')}`;

    try {
      for (const numero of NUMEROS) {
        await sock.sendMessage(`${numero}@s.whatsapp.net`, { text: mensaje });
        console.log(`✅ Mensaje enviado a ${numero}`);
      }
      res.json({ ok: true, mensaje: 'Notificaciones enviadas' });
    } catch (e) {
      console.error('❌ Error:', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get('/', (req, res) => {
    res.json({ 
      status: 'Bot Alcancías Carol funcionando 🐷',
      numeros: NUMEROS 
    });
  });
}

iniciarBot();

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Servidor escuchando en puerto ${process.env.PORT || 3000}`);
});