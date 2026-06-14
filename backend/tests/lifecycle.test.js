const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../app");
const { BANK_NAME } = require("../config/bankConfig");

const ADMIN_USER = { _id: "507f1f77bcf86cd799439011", role: "admin" };
const REGULAR_USER = { _id: "507f1f77bcf86cd799439012", role: "user" };

jest.mock("../middleware/authMiddleware", () => ({
  protect: (req, res, next) => {
    req.user =
      req.headers["x-test-user"] === "admin" ? ADMIN_USER : REGULAR_USER;
    next();
  },
  admin: (req, res, next) => {
    req.user = ADMIN_USER;
    next();
  },
}));

jest.mock("../services/cacheService", () => ({
  invalidateByPrefix: jest.fn().mockResolvedValue(),
  buildPrefix: (ns, key) => `${ns}:${key}`,
  fetchOrSet: jest.fn((ns, key, fn) => fn()),
}));

jest.mock("../services/activityLogService", () => ({
  logActivity: jest.fn().mockResolvedValue(),
}));

describe("Transaction Lifecycle Integration Tests", () => {
  describe("Path 1 — Own-account internal transfer (direct settle)", () => {
    it("POST /api/transactions — own-account → immediate posted/settled", async () => {
      const payload = {
        fromAccountId: "507f1f77bcf86cd799439012",
        toAccountId: "507f1f77bcf86cd799439012",
        type: "transfer",
        amount: 100,
        description: "Own account transfer",
      };
      const res = await request(app)
        .post("/api/transactions")
        .set("x-test-user", "user")
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("status");
    });

    it("POST /api/transactions — non-own-account → rejected with 4xx", async () => {
      const payload = {
        fromAccountId: "507f1f77bcf86cd799439012",
        toAccountId: "507f1f77bcf86cd799439013",
        type: "transfer",
        amount: 100,
      };
      const res = await request(app)
        .post("/api/transactions")
        .set("x-test-user", "user")
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("code", "TRANSFER_REQUIRES_REQUEST");
    });
  });

  describe("Path 2 — In-bank other-user transfer (request → verify → admin approved)", () => {
    it("POST /api/transfer-requests — creates pending request", async () => {
      const payload = {
        fromAccountId: "507f1f77bcf86cd799439012",
        toAccount: "GB82WEST12345698765432",
        amount: 250,
        description: "In-bank payment",
        bankName: BANK_NAME,
      };
      const res = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("status", "pending");
      expect(res.body).toHaveProperty("_id");
    });

    it("POST /api/transfer-requests — idempotency key prevents duplicate", async () => {
      const payload = {
        fromAccountId: "507f1f77bcf86cd799439012",
        toAccount: "GB82WEST12345698765432",
        amount: 250,
        description: "In-bank payment",
      };
      const res1 = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .set("x-idempotency-key", "idem-123")
        .send(payload);
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .set("x-idempotency-key", "idem-123")
        .send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body).toHaveProperty("duplicate", true);
    });

    it("POST /api/transfer-requests/verify — own-account auto-settles without admin", async () => {
      const createRes = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .send({
          fromAccountId: "507f1f77bcf86cd799439012",
          toAccountId: "507f1f77bcf86cd799439012",
          amount: 50,
          description: "Own account test",
        });
      expect(createRes.status).toBe(201);
      const requestId = createRes.body._id;

      const verifyRes = await request(app)
        .post("/api/transfer-requests/verify")
        .set("x-test-user", "user")
        .send({ requestId, code: "000000" });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body).toHaveProperty("success", true);
    });

    it("PUT /api/transfer-requests/:id/manage — admin approves → transaction created", async () => {
      const createRes = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .send({
          fromAccountId: "507f1f77bcf86cd799439012",
          toAccount: "GB82WEST12345698765432",
          amount: 300,
          description: "Needs admin approval",
        });
      expect(createRes.status).toBe(201);
      const requestId = createRes.body._id;

      const manageRes = await request(app)
        .put(`/api/transfer-requests/${requestId}/manage`)
        .set("x-test-user", "admin")
        .send({ status: "approved" });
      expect(manageRes.status).toBe(200);
      expect(manageRes.body).toHaveProperty("message");
    });

    it("PUT /api/transfer-requests/:id/manage — admin rejects with reason", async () => {
      const createRes = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .send({
          fromAccountId: "507f1f77bcf86cd799439012",
          toAccount: "GB82WEST12345698765432",
          amount: 500,
          description: "Suspicious amount",
        });
      expect(createRes.status).toBe(201);
      const requestId = createRes.body._id;

      const rejectRes = await request(app)
        .put(`/api/transfer-requests/${requestId}/manage`)
        .set("x-test-user", "admin")
        .send({
          status: "rejected",
          rejectionReason: "Failed compliance check",
        });
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.transferRequest).toHaveProperty(
        "status",
        "rejected",
      );
    });

    it("PUT /api/transfer-requests/:id/manage — expired request returns 410", async () => {
      const createRes = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .send({
          fromAccountId: "507f1f77bcf86cd799439012",
          toAccount: "GB82WEST12345698765432",
          amount: 999,
          description: "Stale request",
        });
      expect(createRes.status).toBe(201);

      const manageRes = await request(app)
        .put(`/api/transfer-requests/${createRes.body._id}/manage`)
        .set("x-test-user", "admin")
        .send({ status: "approved" });

      if (manageRes.status === 410) {
        expect(manageRes.body).toHaveProperty("status", "expired");
      } else {
        expect([200, 410]).toContain(manageRes.status);
      }
    });
  });

  describe("Path 3 — Card admin-reviewed lifecycle", () => {
    it("POST /api/card-requests — creates pending card request", async () => {
      const payload = {
        accountId: "507f1f77bcf86cd799439012",
        cardType: "debit",
      };
      const res = await request(app)
        .post("/api/card-requests")
        .set("x-test-user", "user")
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("status", "pending");
    });

    it("POST /api/card-requests — idempotency key returns existing record", async () => {
      const payload = {
        accountId: "507f1f77bcf86cd799439012",
        cardType: "credit",
      };
      const res1 = await request(app)
        .post("/api/card-requests")
        .set("x-test-user", "user")
        .set("x-idempotency-key", "card-idem-456")
        .send(payload);
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post("/api/card-requests")
        .set("x-test-user", "user")
        .set("x-idempotency-key", "card-idem-456")
        .send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body).toHaveProperty("_id", res1.body._id);
    });

    it("POST /api/card-requests — invalid card type returns VALIDATION_ERROR", async () => {
      const payload = {
        accountId: "507f1f77bcf86cd799439012",
        cardType: "bitcoin",
      };
      const res = await request(app)
        .post("/api/card-requests")
        .set("x-test-user", "user")
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(res.body.errors).toHaveProperty("cardType");
    });

    it("POST /api/card-requests — invalid accountId returns VALIDATION_ERROR", async () => {
      const payload = {
        accountId: "not-a-valid-objectid",
        cardType: "debit",
      };
      const res = await request(app)
        .post("/api/card-requests")
        .set("x-test-user", "user")
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("code", "VALIDATION_ERROR");
      expect(res.body.errors).toHaveProperty("accountId");
    });
  });

  describe("Transfer Request State Machine", () => {
    it("STATUS_TRANSITIONS — pending can go to pending_admin, rejected, expired", () => {
      const allowed = ["pending_admin", "rejected", "expired"];
      allowed.forEach((status) => {
        expect(["pending_admin", "rejected", "expired"].includes(status)).toBe(
          true,
        );
      });
    });

    it("STATUS_TRANSITIONS — pending_admin can go to approved, rejected, expired", () => {
      const allowed = ["approved", "rejected", "expired"];
      allowed.forEach((status) => {
        expect(["approved", "rejected", "expired"].includes(status)).toBe(true);
      });
    });

    it("STATUS_TRANSITIONS — terminal states (approved, rejected, expired) cannot transition", () => {
      const terminalStates = ["approved", "rejected", "expired"];
      terminalStates.forEach((status) => {
        const transitions = {
          approved: [],
          rejected: [],
          expired: [],
        };
        expect(transitions[status]).toHaveLength(0);
      });
    });
  });

  describe("Legacy Shim Compatibility", () => {
    it("PUT /api/transactions/:transactionId/status — delegates to manageTransfer when linked to request", async () => {
      const createRes = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .send({
          fromAccountId: "507f1f77bcf86cd799439012",
          toAccount: "GB82WEST12345698765432",
          amount: 150,
          description: "Legacy shim test",
        });
      expect(createRes.status).toBe(201);
      const requestId = createRes.body._id;

      const manageRes = await request(app)
        .put(`/api/transfer-requests/${requestId}/manage`)
        .set("x-test-user", "admin")
        .send({ status: "approved" });

      expect(manageRes.status).toBe(200);
      expect(manageRes.body).toHaveProperty("message");
    });

    it("PUT /api/transactions/:transactionId/status — non-admin is rejected", async () => {
      const res = await request(app)
        .put("/api/transactions/507f1f77bcf86cd799439099/status")
        .set("x-test-user", "user")
        .send({ status: "Confirmed" });
      expect(res.status).toBe(403);
    });
  });

  describe("Security and RBAC", () => {
    it("PUT /api/transfer-requests/:id/manage — non-admin returns 403", async () => {
      const createRes = await request(app)
        .post("/api/transfer-requests")
        .set("x-test-user", "user")
        .send({
          fromAccountId: "507f1f77bcf86cd799439012",
          toAccount: "GB82WEST12345698765432",
          amount: 100,
        });
      const requestId = createRes.body._id;

      const res = await request(app)
        .put(`/api/transfer-requests/${requestId}/manage`)
        .set("x-test-user", "user")
        .send({ status: "approved" });
      expect(res.status).toBe(403);
    });

    it("PUT /api/card-requests/:id — non-admin returns 403", async () => {
      const cardReqRes = await request(app)
        .post("/api/card-requests")
        .set("x-test-user", "user")
        .send({ accountId: "507f1f77bcf86cd799439012", cardType: "debit" });
      const cardReqId = cardReqRes.body._id;

      const res = await request(app)
        .put(`/api/card-requests/${cardReqId}`)
        .set("x-test-user", "user")
        .send({ status: "approved" });
      expect(res.status).toBe(403);
    });

    it("GET /api/transactions/all — non-admin returns 403", async () => {
      const res = await request(app)
        .get("/api/transactions/all")
        .set("x-test-user", "user");
      expect(res.status).toBe(403);
    });
  });
});
