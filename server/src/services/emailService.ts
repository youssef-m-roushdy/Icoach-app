import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: config.email.smtp.secure, // true for 465, false for other ports
  auth: {
    user: config.email.smtp.auth.user,
    pass: config.email.smtp.auth.pass,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

export class EmailService {
  private static fromEmail = config.email.from;
  private static fromName = 'iCoach';
  private static clientUrl = config.clientUrl;
  // Use backend URL for password reset and email verification pages
  private static backendUrl = process.env.BACKEND_URL || `http://localhost:${config.port}`;
  private static apiUrl = `${process.env.BACKEND_URL || `http://localhost:${config.port}`}/api/v1`;

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(
    to: string,
    firstName: string,
    verificationToken: string
  ): Promise<void> {
    try {
      // Use backend web endpoint for email verification (renders EJS page)
      const verificationUrl = `${this.backendUrl}/verify-email/${verificationToken}`;

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject: 'Verify Your iCoach Account',
        text: `
Hello ${firstName},

Welcome to iCoach! Please verify your email address to activate your account.

Click the link below to verify your email:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with iCoach, please ignore this email.

Best regards,
The iCoach Team
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            background: #4CAF50;
            color: #ffffff !important;
            padding: 12px 30px;
            text-decoration: none !important;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
            font-size: 16px;
            line-height: 1;
            letter-spacing: 0.2px;
            -webkit-text-size-adjust: none;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to iCoach!</h1>
    </div>
    <div class="content">
        <h2>Hello ${firstName},</h2>
        <p>Thank you for signing up with iCoach! We're excited to help you on your fitness journey.</p>
        <p>Please verify your email address to activate your account and get started:</p>
        <center>
            <a href="${verificationUrl}" class="button" style="display:inline-block;background:#4CAF50;color:#fff;padding:12px 30px;border-radius:6px;font-weight:600;font-size:16px;text-decoration:none;" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
        </center>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">
            <a href="${verificationUrl}"
               style="color:#1e3a8a; text-decoration:none; background:#f1f5ff; padding:6px 8px; border-radius:4px; display:inline-block; font-family: 'Courier New', monospace; font-size:13px;">
               ${verificationUrl}
            </a>
        </p>
        <p><strong>This link will expire in 24 hours.</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 14px;">
            If you didn't create an account with iCoach, please ignore this email.
        </p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} iCoach. All rights reserved.</p>
    </div>
</body>
</html>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to: ${to}`);
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   * UPDATED: Now points to backend web endpoint (renders EJS page)
   */
  static async sendPasswordResetEmail(
    to: string,           // email
    firstName: string,    // user's first name
    resetToken: string    // the actual token
): Promise<void> {
    try {
      // Use backend web endpoint for password reset (renders EJS page)
      const resetUrl = `${this.backendUrl}/reset-password/${resetToken}`;

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject: 'Reset Your iCoach Password',
        text: `
Hello ${firstName},

We received a request to reset your password for your iCoach account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
The iCoach Team
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            background: #4CAF50;
            color: #ffffff !important;
            padding: 12px 30px;
            text-decoration: none !important;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
            font-size: 16px;
            line-height: 1;
            letter-spacing: 0.2px;
            -webkit-text-size-adjust: none;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Reset Request</h1>
    </div>
    <div class="content">
        <h2>Hello ${firstName},</h2>
        <p>We received a request to reset your password for your iCoach account.</p>
        <p>Click the button below to reset your password:</p>
        <center>
            <a href="${resetUrl}" class="button" style="display:inline-block;background:#4CAF50;color:#fff;padding:12px 30px;border-radius:6px;font-weight:600;font-size:16px;text-decoration:none;" target="_blank" rel="noopener noreferrer">Reset Password</a>
        </center>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">
            <a href="${resetUrl}"
               style="color:#1e3a8a; text-decoration:none; background:#f1f5ff; padding:6px 8px; border-radius:4px; display:inline-block; font-family: 'Courier New', monospace; font-size:13px;">
               ${resetUrl}
            </a>
        </p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <p style="margin: 5px 0 0 0;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 14px;">
            For security reasons, this link will expire after 1 hour. If you need to reset your password after this time, please request a new password reset.
        </p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} iCoach. All rights reserved.</p>
    </div>
</body>
</html>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to: ${to}`);
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email after email verification
   */
  static async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject: 'Welcome to iCoach - Let\'s Get Started!',
        text: `
Hello ${firstName},

Your email has been verified successfully! Welcome to iCoach.

You can now access all features of your account:
- Track your fitness progress
- Set and achieve your fitness goals
- Get personalized recommendations
- Monitor your body metrics

Start your fitness journey today by logging in to your account.

Best regards,
The iCoach Team
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .feature-list {
            background: white;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .feature-list li {
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to iCoach!</h1>
    </div>
    <div class="content">
        <h2>Hello ${firstName},</h2>
        <p>Your email has been verified successfully! We're thrilled to have you as part of the iCoach community.</p>
        <p><strong>You now have full access to:</strong></p>
        <div class="feature-list">
            <ul>
                <li>📊 Track your fitness progress and metrics</li>
                <li>🎯 Set and achieve personalized fitness goals</li>
                <li>💪 Get customized workout recommendations</li>
                <li>📈 Monitor your body composition changes</li>
                <li>🔥 Calculate your recommended daily calories</li>
            </ul>
        </div>
        <p>Ready to start your fitness journey? Log in to your account and complete your fitness profile to get personalized recommendations.</p>
        <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
        <p>Let's achieve your fitness goals together!</p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} iCoach. All rights reserved.</p>
    </div>
</body>
</html>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to: ${to}`);
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      // Don't throw error for welcome email - it's not critical
    }
  }

  /**
   * Send password change confirmation email
   */
  static async sendPasswordChangedEmail(to: string, firstName: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject: 'Your iCoach Password Has Been Changed',
        text: `
Hello ${firstName},

This email confirms that your password has been successfully changed.

If you made this change, no further action is required.

If you did NOT change your password, please contact our support team immediately and secure your account.

Best regards,
The iCoach Team
        `,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .alert {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Changed</h1>
    </div>
    <div class="content">
        <h2>Hello ${firstName},</h2>
        <div class="alert">
            <strong>✅ Success!</strong>
            <p style="margin: 5px 0 0 0;">Your password has been successfully changed.</p>
        </div>
        <p>This email confirms that your iCoach account password was changed on ${new Date().toLocaleString()}.</p>
        <p>If you made this change, no further action is required.</p>
        <div class="warning">
            <strong>⚠️ Didn't make this change?</strong>
            <p style="margin: 5px 0 0 0;">If you did NOT change your password, please contact our support team immediately to secure your account.</p>
        </div>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} iCoach. All rights reserved.</p>
    </div>
</body>
</html>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Password changed confirmation email sent to: ${to}`);
    } catch (error) {
      console.error('❌ Error sending password changed email:', error);
      // Don't throw error - it's a confirmation email
    }
  }
}

export default EmailService;