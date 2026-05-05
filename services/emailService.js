const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendEmail(to, subject, text) {
    try {
      const response = await this.resend.emails.send({
        from: 'onboarding@resend.dev', // or your domain later
        to,
        subject,
        text,
      });

      console.log("✅ Email sent:", response);
    } catch (error) {
      console.error("❌ Email FAILED:", error);
    }
  }
}

module.exports = new EmailService();