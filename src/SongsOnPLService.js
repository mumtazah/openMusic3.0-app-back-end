const { Pool } = require('pg');

class SongsOnPLService {
  constructor() {
    this._pool = new Pool();
  }

  async getPL(playlistId) {
    const query = {
      text: `SELECT id, name FROM playlists 
      WHERE id = $1`,
      values: [playlistId],
    };

    const result = await this._pool.query(query);
    return result.rows[0];
  }

  async getSongsOnPL(playlistId) {
    const query = {
      text: `SELECT songs.id, songs.title, songs.performer FROM songs
      LEFT JOIN playlistsongs ON songs.id = playlistsongs.song_id 
      WHERE playlistsongs.playlist_id = $1`,
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }
}

module.exports = SongsOnPLService;
