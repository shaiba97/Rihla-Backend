import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { Boom } from '@hapi/boom';
import pino from 'pino';

const authFolder = path.resolve('./whatsapp-auth');

let sock: ReturnType<typeof makeWASocket> | null = null;
let isConnected = false;
let connectPromise: Promise<void> | null = null;

export async function getWhatsAppSock(): Promise<ReturnType<typeof makeWASocket>> {
  if (sock && isConnected) return sock;

  if (connectPromise) {
    await connectPromise;
    return sock!;
  }

  connectPromise = new Promise<void>((resolve, reject) => {
    (async () => {
      try {
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);

        sock = makeWASocket({
          auth: state,
          logger: pino({ level: 'warn' }),
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            console.log('\n📱 SCAN QR CODE TO CONNECT WHATSAPP:\n');
            qrcode.generate(qr, { small: true });
          }

          if (connection === 'open') {
            isConnected = true;
            console.log('✅ WhatsApp connected!');
            resolve();
          }

          if (connection === 'close') {
            isConnected = false;
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            console.log('WhatsApp disconnected, code:', statusCode);
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
              sock = null;
              connectPromise = null;
              console.log('🔄 Reconnecting WhatsApp...');
            } else {
              console.log('🔴 WhatsApp logged out.');
              reject(new Error('WhatsApp logged out'));
            }
          }
        });
      } catch (err) {
        reject(err);
      }
    })();
  });

  await connectPromise;
  return sock!;
}

export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<void> {
  const s = await getWhatsAppSock();

  let number = to
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9+]/g, '');
  if (number.startsWith('+')) {
    number = number.slice(1);
  }
  const jid = `${number}@s.whatsapp.net`;

  await s.sendMessage(jid, { text: message });
  console.log(`✅ WhatsApp sent to +${number}`);
}
