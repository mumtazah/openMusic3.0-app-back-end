const ClientError = require('../../exceptions/ClientError');

class ExportsHandler {
  constructor(service, playlistsService, validator) {
    this._service = service;
    this._playlistsService = playlistsService;
    this._validator = validator;

    this.postExportSongsOnPLHandler = this.postExportSongsOnPLHandler.bind(this);
  }

  async postExportSongsOnPLHandler(request, h) {
    try {
      this._validator.validateExportSongsOnPLPayload(request.payload);

      const userId = request.auth.credentials.id;
      const { playlistId } = request.params;

      await this._playlistsService.getPlaylistDetails(playlistId);
      await this._playlistsService.verifyPlaylistOwner(playlistId, userId);

      const message = {
        playlistId,
        targetEmail: request.payload.targetEmail,
      };

      await this._service.sendMessage('export:playlists', JSON.stringify(message));

      const response = h.response({
        status: 'success',
        message: 'Permintaan Anda dalam antrean',
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
}

module.exports = ExportsHandler;
