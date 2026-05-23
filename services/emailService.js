const { google } = require("googleapis");
const crypto = require("crypto");
const db = require("../db/database");

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

  async ensureEmailLogTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_delivery_log (
        id SERIAL PRIMARY KEY,
        dedupe_key TEXT UNIQUE NOT NULL,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async sendEmail(to, subject, text) {
    try {
      await this.ensureEmailLogTable();

      const normalizedTo = String(to || "").trim().toLowerCase();
      const dedupeKey = crypto
        .createHash("sha256")
        .update(`${normalizedTo}|${subject}|${text}`)
        .digest("hex");

      const logResult = await db.query(
        `
        INSERT INTO email_delivery_log (dedupe_key, recipient_email, subject)
        VALUES ($1, $2, $3)
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING id
        `,
        [dedupeKey, normalizedTo, subject]
      );

      if (logResult.rows.length === 0) {
        console.log("Email already sent, skipping duplicate:", to, subject);
        return { skipped: true };
      }

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

      console.log("Email sent to:", to);
      return { sent: true };
    } catch (err) {
      console.error("Email failed:", err?.response?.data || err.message);
      return { failed: true, error: err.message };
    }
  }
}

module.exports = new EmailService();
