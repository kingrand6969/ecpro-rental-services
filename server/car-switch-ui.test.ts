import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRentalPrice,
  isAvailabilityConflict,
  matchesApiFamily,
} from "../client/src/components/SwitchCarDialog";

test("switch price formatter applies pesos only to rental money", () => {
  assert.equal(formatRentalPrice("12500"), "₱12,500.00");
});

test("only an HTTP 409 keeps the switch workflow in conflict recovery", () => {
  assert.equal(isAvailabilityConflict(new Error('409: {"message":"Car is no longer available"}')), true);
  assert.equal(isAvailabilityConflict(new Error('500: {"message":"Unexpected error"}')), false);
});

test("switch invalidation matches path, query-string, and nested API cache keys", () => {
  assert.equal(matchesApiFamily(["/api/availability?startDate=2026-08-01"], "/api/availability"), true);
  assert.equal(matchesApiFamily(["/api/rentals/42/car-switches"], "/api/rentals"), true);
  assert.equal(matchesApiFamily(["/api/dashboard", "stats"], "/api/dashboard"), true);
  assert.equal(matchesApiFamily(["/api/rental-logs"], "/api/rentals"), false);
});
