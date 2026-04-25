function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
    },
    body: JSON.stringify(payload),
  };
}

function parseJsonBody(event = {}) {
  if (!Object.prototype.hasOwnProperty.call(event, "body")) {
    return event || {};
  }

  let { body } = event;
  if (!body) {
    return {};
  }

  if (event.isBase64Encoded) {
    body = Buffer.from(body, "base64").toString("utf-8");
  }

  if (typeof body === "string") {
    return JSON.parse(body);
  }
  if (typeof body === "object") {
    return body;
  }

  throw new Error("Unsupported event body.");
}

module.exports = {
  jsonResponse,
  parseJsonBody,
};
