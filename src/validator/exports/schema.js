const Joi = require('joi');

const ExportSongsOnPLPayloadSchema = Joi.object({
  targetEmail: Joi.string().email({ tlds: true }).required(),
});

module.exports = ExportSongsOnPLPayloadSchema;
