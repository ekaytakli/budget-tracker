import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRegistration } from "./registration.js";

const valid = { username: "new.member", email: "new@example.test", password: "test-password-123", confirmation: "test-password-123" };

test("accepts valid registration and trimmed identity fields", () => {
  assert.equal(validateRegistration(valid), "");
  assert.equal(validateRegistration({ ...valid, username: " new.member ", email: " new@example.test " }), "");
});

test("rejects missing or invalid usernames", () => {
  for (const username of ["", "ab", "a".repeat(81), "bad name", "<admin>"]) {
    assert.match(validateRegistration({ ...valid, username }), /Kullanıcı adı/);
  }
});

test("rejects missing and invalid emails", () => {
  for (const email of ["", "invalid", "a@@example.test", "a b@example.test", "a".repeat(200) + "@x.test"]) {
    assert.match(validateRegistration({ ...valid, email }), /e-posta/);
  }
});

test("rejects short and blank passwords", () => {
  for (const password of ["", "short", " ".repeat(12)]) {
    assert.match(validateRegistration({ ...valid, password }), /Parola en az/);
  }
});

test("enforces BCrypt UTF-8 byte limit including multibyte characters", () => {
  assert.match(validateRegistration({ ...valid, password: "ş".repeat(37) }), /72 bayt/);
  assert.equal(validateRegistration({ ...valid, password: "ş".repeat(36), confirmation: "ş".repeat(36) }), "");
});

test("rejects missing and mismatched confirmation", () => {
  assert.match(validateRegistration({ ...valid, confirmation: "" }), /eşleşmiyor/);
  assert.match(validateRegistration({ ...valid, confirmation: "different-password" }), /eşleşmiyor/);
});
