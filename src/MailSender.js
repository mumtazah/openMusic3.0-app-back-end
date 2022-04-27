const nodemailer = require('nodemailer');

class MailSender {
  constructor() {
    this._transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: true,
      auth: {
        user: process.env.MAIL_ADDRESS,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    this.sendEmail = this.sendEmail.bind(this);
  }

  sendEmail(targetEmail, content) {
    const message = {
      from: 'Musics Apps',
      to: targetEmail,
      subject: 'Ekspor Lagu pada Playlist',
      text: 'Terlampir hasil dari ekspor lagu',
      attachments: [
        {
          filename: 'songsOnPL.json',
          content,
        },
      ],
    };

    return this._transporter.sendMail(message);
  }
}

module.exports = MailSender;
