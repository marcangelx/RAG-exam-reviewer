const { certificationProfiles } = require("../../services/certification_profiles");
const { jsonResponse } = require("../../services/responses");

exports.handler = async () => {
  return jsonResponse(200, { profiles: certificationProfiles });
};
