class Listener {
  constructor(songsOnPLService, mailSender) {
    this._songsOnPLService = songsOnPLService;
    this._mailSender = mailSender;

    this.listen = this.listen.bind(this);
  }

  async listen(message) {
    try {
      const { playlistId, targetEmail } = JSON.parse(message.content.toString());

      const playlistdet = await this._songsOnPLService.getPL(playlistId);
      const songsOnPL = await this._songsOnPLService.getSongsOnPL(playlistId);
      const data = {
        playlist: {
          id: playlistdet.id,
          name: playlistdet.name,
          songs: songsOnPL,
        },
      };
      const result = await this._mailSender.sendEmail(targetEmail, JSON.stringify(data));
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = Listener;
