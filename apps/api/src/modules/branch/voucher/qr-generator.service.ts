import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrGeneratorService {
  /**
   * Generate a QR code image as a data URL (base64 PNG).
   */
  async generateDataUrl(content: string): Promise<string> {
    return QRCode.toDataURL(content, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    });
  }
}
