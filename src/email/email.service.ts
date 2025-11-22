import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Your Auction Bay Password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Auction Bay</h1>
            <p style="color: #666; margin: 0;">Password Reset Request</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Hello,</h2>
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your password for your Auction Bay account.
              Click the button below to reset your password:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #007bff; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; background-color: #e9ecef; padding: 10px;
                      border-radius: 4px; font-family: monospace; font-size: 12px;">
              ${resetUrl}
            </p>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #999; font-size: 12px; margin-bottom: 10px;">
              <strong>Important:</strong>
            </p>
            <ul style="color: #999; font-size: 12px; margin: 0; padding-left: 20px;">
              <li>This link will expire in 1 hour for security reasons</li>
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Never share this link with anyone</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p style="margin: 0;">
              This is an automated message from Auction Bay. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      text: `
        Auction Bay - Password Reset Request

        Hello,

        We received a request to reset your password for your Auction Bay account.
        Please click the link below to reset your password:

        ${resetUrl}

        Important:
        - This link will expire in 1 hour for security reasons
        - If you didn't request this password reset, please ignore this email
        - Never share this link with anyone

        This is an automated message from Auction Bay. Please do not reply to this email.
      `,
    });
  }
}