import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  onModuleInit(): void {
    const credPath = process.env.FCM_CREDENTIALS;
    if (!credPath) {
      this.logger.warn('FCM_CREDENTIALS not set — push notifications disabled');
      return;
    }
    try {
      const credentials = JSON.parse(
        Buffer.from(credPath, 'base64').toString('utf-8'),
      );
      admin.initializeApp({ credential: admin.credential.cert(credentials) });
      this.initialized = true;
      this.logger.log('Firebase Admin initialized');
    } catch (e: any) {
      this.logger.error('Failed to init Firebase Admin', e.message);
    }
  }

  async send(
    token: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    if (!this.initialized) return;
    try {
      await admin.messaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (e: any) {
      if (e.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(
          `Token ${token.slice(0, 8)}… not registered — should remove`,
        );
        return;
      }
      this.logger.error(`FCM send failed for ${token.slice(0, 8)}…`, e.message);
    }
  }

  async sendMulticast(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ success: number; failure: number }> {
    if (!this.initialized || tokens.length === 0)
      return { success: 0, failure: 0 };
    try {
      const result = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      return { success: result.successCount, failure: result.failureCount };
    } catch (e: any) {
      this.logger.error(`FCM multicast failed`, e.message);
      return { success: 0, failure: tokens.length };
    }
  }
}
