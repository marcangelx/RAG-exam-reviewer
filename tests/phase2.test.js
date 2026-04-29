const test = require("node:test");
const assert = require("node:assert/strict");

const { certificationProfiles } = require("../services/certification_profiles");
const { getUserSub, userPartitionKey, userScopedPrefix } = require("../services/auth");
const { MetadataRepository } = require("../services/repository");

test("auth helpers derive user scoped keys from Cognito claims", () => {
  const event = {
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: "user-123",
          },
        },
      },
    },
  };

  assert.equal(getUserSub(event), "user-123");
  assert.equal(userPartitionKey("user-123"), "USER#user-123");
  assert.equal(userScopedPrefix("user-123"), "users/user-123");
});

test("auth helper rejects unauthenticated events", () => {
  assert.throws(() => getUserSub({}), /Authenticated user ID is required/);
});

test("repository uses the provided partition key", () => {
  const repository = new MetadataRepository("table-name", "USER#abc");
  assert.deepEqual(repository.key("DOC#doc_123"), {
    PK: "USER#abc",
    SK: "DOC#doc_123",
  });
});

test("certification profiles expose MVP defaults", () => {
  assert.ok(certificationProfiles.length >= 3);
  assert.ok(certificationProfiles.some((profile) => profile.id === "aws-saa"));
  assert.ok(certificationProfiles.every((profile) => profile.questionCount > 0));
});
