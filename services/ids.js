const { randomUUID } = require("node:crypto");

function newId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function utcNow() {
  return new Date().toISOString();
}

module.exports = {
  newId,
  utcNow,
};
