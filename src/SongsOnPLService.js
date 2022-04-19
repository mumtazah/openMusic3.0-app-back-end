const { Pool } = require('pg');

class SongsOnPLService {
  constructor() {
    this._pool = new Pool();
  }

  async getSongsOnPL(playlistId) {
    const query = {
      text: `SELECT * FROM songs
      LEFT JOIN playlistsongs ON playlistsongs.song_id = songs.id
      WHERE playlistsongs.playlist_id = $1`,
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }
}

module.exports = SongsOnPLService;
