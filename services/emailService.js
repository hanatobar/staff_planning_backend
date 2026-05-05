const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
this.transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

    this.transporter.verify((error) => {
      if (error) {
        console.error("❌ Email transporter error:", error);
      } else {
        console.log("✅ Email server is ready");
      }
    });
  }

  async sendEmail(to, subject, text) {
    try {
      const info = await this.transporter.sendMail({
        from: `Staff Planning System <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
      });

      console.log("✅ Email sent:", info.response);
    } catch (error) {
      console.error("❌ Email FAILED:", error);
    }
  }
}

module.exports = new EmailService();