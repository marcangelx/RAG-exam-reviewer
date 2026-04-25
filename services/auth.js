class AuthError extends Error {}

function getClaims(event = {}) {
  return event?.requestContext?.authorizer?.jwt?.claims || {};
}

function getUserSub(event = {}) {
  const claims = getClaims(event);
  const userSub = String(claims.sub || "").trim();
  if (!userSub) {
    throw new AuthError("Authenticated user ID is required.");
  }
  return userSub;
}

function userPartitionKey(userSub) {
  return `USER#${userSub}`;
}

function userScopedPrefix(userSub) {
  return `users/${encodeURIComponent(userSub)}`;
}

module.exports = {
  AuthError,
  getClaims,
  getUserSub,
  userPartitionKey,
  userScopedPrefix,
};
