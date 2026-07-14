import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mapCommentRow } from "../../src/mappers/comment-format.js";

function makeAuthorMap() {
  return new Map([
    [1, { id: 1, name: "Alice", avatarUrl: null, role: "developer" }],
    [2, { id: 2, name: "Bob", avatarUrl: "/a.png", role: "super_admin" }],
  ]);
}

describe("mapCommentRow", () => {
  test("returns full content for active messages", () => {
    const repliesByParent = new Map();
    const row = mapCommentRow(
      {
        id: 10,
        authorId: 1,
        threadType: "project",
        threadId: 5,
        content: "Hello team",
        attachmentUrl: "/uploads/doc.pdf",
        attachmentName: "doc.pdf",
        attachmentMimeType: "application/pdf",
        parentId: null,
        mentionedUserIds: [2],
        isEdited: false,
        isDeleted: false,
        createdAt: new Date("2026-07-01T10:00:00Z"),
        updatedAt: new Date("2026-07-01T10:00:00Z"),
      },
      makeAuthorMap(),
      repliesByParent,
    );

    assert.equal(row.content, "Hello team");
    assert.equal(row.attachmentUrl, "/uploads/doc.pdf");
    assert.equal(row.isDeleted, false);
    assert.equal(row.authorName, "Alice");
    assert.deepEqual(row.mentionedUserIds, [2]);
  });

  test("blanks body and attachments when isDeleted is true", () => {
    const repliesByParent = new Map();
    const row = mapCommentRow(
      {
        id: 11,
        authorId: 2,
        threadType: "company_team",
        threadId: 0,
        content: "Secret text that must not leak",
        attachmentUrl: "/uploads/secret.png",
        attachmentName: "secret.png",
        attachmentMimeType: "image/png",
        parentId: null,
        mentionedUserIds: [1],
        isEdited: true,
        isDeleted: true,
        createdAt: new Date("2026-07-02T12:00:00Z"),
        updatedAt: new Date("2026-07-02T12:30:00Z"),
      },
      makeAuthorMap(),
      repliesByParent,
    );

    assert.equal(row.content, "");
    assert.equal(row.attachmentUrl, null);
    assert.equal(row.attachmentName, null);
    assert.equal(row.attachmentMimeType, null);
    assert.equal(row.isDeleted, true);
    assert.equal(row.isEdited, true);
    assert.deepEqual(row.mentionedUserIds, [1]);
  });

  test("maps nested replies recursively", () => {
    const reply = {
      id: 12,
      authorId: 1,
      threadType: "project",
      threadId: 5,
      content: "Reply body",
      parentId: 10,
      mentionedUserIds: [],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date("2026-07-01T10:05:00Z"),
      updatedAt: new Date("2026-07-01T10:05:00Z"),
    };
    const repliesByParent = new Map([[10, [reply]]]);
    const row = mapCommentRow(
      {
        id: 10,
        authorId: 2,
        threadType: "project",
        threadId: 5,
        content: "Parent",
        parentId: null,
        mentionedUserIds: [],
        isEdited: false,
        isDeleted: false,
        createdAt: new Date("2026-07-01T10:00:00Z"),
        updatedAt: new Date("2026-07-01T10:00:00Z"),
      },
      makeAuthorMap(),
      repliesByParent,
    );

    assert.equal(row.replies.length, 1);
    assert.equal(row.replies[0].content, "Reply body");
    assert.equal(row.replies[0].parentId, 10);
  });
});
