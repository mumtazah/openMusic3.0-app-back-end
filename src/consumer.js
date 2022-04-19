require('dotenv').config();
const amqp = require('amqplib');
const SongsOnPLService = require('./SongsOnPLService');
const MailSender = require('./MailSender');
const Listener = require('./listener');

const init = async () => {
  const songsOnPLService = new SongsOnPLService();
  const mailSender = new MailSender();
  const listener = new Listener(songsOnPLService, mailSender);

  const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
  const channel = await connection.createChannel();

  await channel.assertQueue('export:playlists', {
    durable: true,
  });

  channel.consume('export:playlists', listener.listen, { noAck: true });
};

init();
