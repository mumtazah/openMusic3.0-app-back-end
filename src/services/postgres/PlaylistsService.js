const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const { mapDBToModel } = require('../../utils');

class PlaylistsService {
  constructor(collaborationsService, songsService, cacheService) {
    this._pool = new Pool();
    this._collaborationsService = collaborationsService;
    this._songsService = songsService;
    this._cacheService = cacheService;
  }

  async addPlaylist({
    name, owner,
  }) {
    const id = `playlist-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = new Date().toISOString();

    const query = {
      text: 'INSERT INTO playlists (id, name, owner, created_at, updated_at) VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, name, owner, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    await this._cacheService.delete(`playlist:${id}`);
    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
      LEFT JOIN collaborations ON playlists.id = collaborations.playlist_id
      LEFT JOIN users ON users.id = playlists.owner 
      WHERE playlists.owner = $1 OR collaborations.user_id = $1`,
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows.map(mapDBToModel);
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
    await this._cacheService.delete(`playlist:${id}`);
  }

  async addSongToPlaylist(playlistId, songId) {
    const id = `play-song-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlistsongs (id, playlist_id, song_id) VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan ke playlist');
    }
    await this._cacheService.delete(`playlist:${playlistId}`);
  }

  async getPlaylistDetails(playlistId) {
    try {
      const result = await this._cacheService.get(`playlist:${playlistId}`);
      return JSON.parse(result);
    } catch (error) {
      const query = {
        text: `SELECT playlists.id, playlists.name, users.username FROM playlists
        LEFT JOIN users ON playlists.owner = users.id
        WHERE playlists.id = $1`,
        values: [playlistId],
      };
      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError('Playlist tidak ditemukan');
      }

      await this._cacheService.set(`playlist:${playlistId}`, JSON.stringify(result.rows[0]));

      return result.rows[0];
    }
  }

  async getSongsFromPlaylist(playlistId, owner) {
    try {
      const result = await this._cacheService.get(`playlist:${playlistId}`);
      return JSON.parse(result);
    } catch (error) {
      const query1 = {
        text: `SELECT playlists.id, playlists.name, users.username FROM playlists
        INNER JOIN users ON users.id = playlists.owner
        WHERE owner = $1 and playlists.id = $2`,
        values: [owner, playlistId],
      };
      const query2 = {
        text: `SELECT songs.id, songs.title, songs.performer FROM songs 
        LEFT JOIN playlistsongs ON playlistsongs.song_id = songs.id 
        WHERE playlistsongs.playlist_id = $1`,
        values: [playlistId],
      };

      const result = await this._pool.query(query1);
      const songs = await this._pool.query(query2);

      const results = {
        ...result.rows[0],
        songs: [
          ...songs.rows],
      };

      await this._cacheService.set(`playlist:${playlistId}`, JSON.stringify(result.rows[0]));
      return results;
    }
  }

  async deleteSongFromPlaylist(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlistsongs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Lagu gagal dihapus. Id tidak ditemukan');
    }
    await this._cacheService.delete(`playlist:${playlistId}`);
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];

    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      } try {
        await this._collaborationsService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }
}

module.exports = PlaylistsService;
