const { google } = require("googleapis");

class EmailService {
  constructor() {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oAuth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    this.gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  }

  async sendEmail(to, subject, text) {
    try {
      const raw = [
        `From: Staff Planning System <${process.env.EMAIL_USER}>`,
        `To: ${to}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${subject}`,
        "",
        text,
      ].join("\n");

      const encoded = Buffer.from(raw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await this.gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encoded },
      });

      console.log("✅ Email sent to:", to);
    } catch (err) {
      console.error("❌ Email failed:", err?.response?.data || err.message);
    }
  }
}

module.exports = new EmailService();