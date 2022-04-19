const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
// const { mapDBToModel } = require('../../utils');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year, coverUrl }) {
    const id = `album-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = new Date().toISOString();

    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, name, year, coverUrl, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    await this._cacheService.delete('albums');
    return result.rows[0].id;
  }

  async getAlbums() {
    try {
      const result = await this._cacheService.get('albums');
      return { albums: JSON.parse(result), isCache: 1 };
    } catch (error) {
      const query = {
        text: 'SELECT id, name, year, coverUrl FROM albums',
      };
      const result = await this._pool.query(query);

      if (!result.rowCount) {
        throw new NotFoundError('Gagal mendapatkan Album. Id tidak ditemukan');
      }
      await this._cacheService.set('albums', JSON.stringify(result.rows));
      return { albums: result.rows };
    }
  }

  async getAlbumById(id) {
    try {
      const result = await this._cacheService.get(`album:${id}`);
      return { album: JSON.parse(result), isCache: 1 };
    } catch (error) {
      const query = {
        text: 'SELECT id, name, year, "coverUrl" FROM albums WHERE id = $1',
        values: [id],
      };
      const result = await this._pool.query(query);

      if (!result.rowCount) {
        throw new NotFoundError('Album tidak ditemukan');
      }

      await this._cacheService.set(`album:${id}`, JSON.stringify(result.rows[0]));
      return { album: result.rows[0] };
    }
  }

  async editAlbumById(id, { name, year, coverUrl }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2, "coverUrl" = $3, updated_at = $4 WHERE id = $5 RETURNING id',
      values: [name, year, coverUrl, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan');
    }

    await this._cacheService.delete(`album:${id}`);
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
    }

    await this._cacheService.delete(`album:${id}`);
  }

  async getSongsByAlbumId(id) {
    try {
      const result = await this._cacheService.get(`album-songs:${id}`);
      return { songs: JSON.parse(result), isCache: 1 };
    } catch (error) {
      const query = {
        text: 'SELECT id, title, performer FROM songs WHERE album_id = $1',
        values: [id],
      };
      const result = await this._pool.query(query);

      await this._cacheService.set(`album-songs:${id}`, JSON.stringify(result.rows));
      return { songs: result.rows };
    }
  }

  async insertAlbumCover(albumId, coverUrl) {
    const query = {
      text: 'UPDATE albums SET "coverUrl" = $2 WHERE id = $1',
      values: [albumId, coverUrl],
    };
    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Cover gagal ditambahkan');
    }

    await this._cacheService.delete(`album:${albumId}`);
  }

  async setLikeAlbum(albumId, userId) {
    const getLikeQuery = {
      text: 'SELECT * FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
      values: [albumId, userId],
    };
    const getLikeResult = await this._pool.query(getLikeQuery);

    if (!getLikeResult.rowCount) {
      const id = `likes-${nanoid(16)}`;
      const insertLikeQuery = {
        text: 'INSERT INTO user_album_likes (id, album_id, user_id) VALUES ($1, $2, $3)',
        values: [id, albumId, userId],
      };
      const insertLikeResult = await this._pool.query(insertLikeQuery);

      if (!insertLikeResult.rowCount) {
        throw new InvariantError('Like gagal ditambahkan');
      }
    } else {
      const deleteLikeQuery = {
        text: 'DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
        values: [albumId, userId],
      };
      const deleteLikeResult = await this._pool.query(deleteLikeQuery);

      if (!deleteLikeResult.rowCount) {
        throw new InvariantError('Like gagal dihapus');
      }
    }
    await this._cacheService.delete(`likes:${albumId}`);
  }

  async getLikeAlbum(albumId) {
    try {
      const result = await this._cacheService.get(`likes:${albumId}`);
      return { likes: JSON.parse(result), isCache: 1 };
    } catch (error) {
      const query = {
        text: 'SELECT user_id FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };
      const result = await this._pool.query(query);

      await this._cacheService.set(`likes:${albumId}`, JSON.stringify(result.rows));
      return { likes: result.rows };
    }
  }
}

module.exports = AlbumsService;
