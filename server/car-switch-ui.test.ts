import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySwitchError,
  formatRentalPrice,
  getSwitchErrorCode,
  matchesApiFamily,
} from "../client/src/components/SwitchCarDialog";
import { getSwitchHistoryViewState } from "../client/src/components/RentalDetailsDialog";

test("switch price formatter applies pesos only to rental money", () => {
  assert.equal(formatRentalPrice("12500"), "₱12,500.00");
});

test("switch conflicts use stable response codes instead of status alone", () => {
  assert.equal(
    classifySwitchError(new Error('409: {"code":"CAR_DATE_CONFLICT"}')),
    "refresh-availability",
  );
  assert.equal(
    classifySwitchError(new Error('409: {"code":"CAR_IN_MAINTENANCE"}')),
    "refresh-availability",
  );
  assert.equal(
    classifySwitchError(new Error('409: {"code":"RENTAL_FINALIZED"}')),
    "rental-finalized",
  );
  assert.equal(
    classifySwitchError(new Error('409: {"code":"SAME_CAR"}')),
    "same-car",
  );
  assert.equal(classifySwitchError(new Error("409: not-json")), "fallback");
  assert.equal(classifySwitchError(new Error('500: {"code":"CAR_DATE_CONFLICT"}')), "fallback");
  assert.equal(getSwitchErrorCode(new Error("Network error")), undefined);
});

test("history errors remain distinct from empty history", () => {
  assert.equal(getSwitchHistoryViewState(true, false, 0), "loading");
  assert.equal(getSwitchHistoryViewState(false, true, 0), "error");
  assert.equal(getSwitchHistoryViewState(false, false, 0), "empty");
  assert.equal(getSwitchHistoryViewState(false, false, 1), "ready");
});

test("switch invalidation matches path, query-string, and nested API cache keys", () => {
  assert.equal(matchesApiFamily(["/api/availability?startDate=2026-08-01"], "/api/availability"), true);
  assert.equal(matchesApiFamily(["/api/rentals/42/car-switches"], "/api/rentals"), true);
  assert.equal(matchesApiFamily(["/api/dashboard", "stats"], "/api/dashboard"), true);
  assert.equal(matchesApiFamily(["/api/rental-logs"], "/api/rentals"), false);
});
