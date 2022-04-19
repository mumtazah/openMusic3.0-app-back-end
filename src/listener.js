class Listener {
  constructor(songsOnPLService, mailSender) {
    this._songsOnPLService = songsOnPLService;
    this._mailSender = mailSender;

    this.listen = this.listen.bind(this);
  }

  async listen(message) {
    try {
      const { playlistId, targetEmail } = JSON.parse(message.content.toString());

      const songsOnPL = await this._songsOnPLService.getSongsOnPL(playlistId);
      const result = await this._mailSender.sendEmail(targetEmail, JSON.stringify(songsOnPL));
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = Listener;
