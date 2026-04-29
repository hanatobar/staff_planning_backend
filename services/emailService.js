const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail(to, subject, text) {
    try {
      await this.transporter.sendMail({
        from: `Staff Planning System <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text
      });

      console.log("Email sent to:", to);
    } catch (error) {
      console.error("Email error:", error);
    }
  }
}

module.exports = new EmailService();