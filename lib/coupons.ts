// Coupon store — in-process repository, same pattern as lib/reservations.ts
// (globalThis Symbol store; no JSON DB / filesystem writes).

export type CouponStatus = "active" | "disabled";

export type Coupon = {
  id: string;
  code: string;
  percentOff: number;
  status: CouponStatus;
  createdAt: string;
};

export type CouponResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

type CouponStore = {
  coupons: Coupon[];
};

const COUPON_STORE_KEY = Symbol.for("devair.couponStore");
const COUPON_CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{1,31}$/;
const DEMO_COUPONS: Array<Pick<Coupon, "code" | "percentOff">> = [{ code: "SAVE10", percentOff: 10 }];

type GlobalCouponStore = typeof globalThis & {
  [COUPON_STORE_KEY]?: CouponStore;
};

function couponStore(): CouponStore {
  const globalStore = globalThis as GlobalCouponStore;
  if (!globalStore[COUPON_STORE_KEY]) {
    const seeded = DEMO_COUPONS.map((demo) => couponFrom(demo.code, demo.percentOff, new Date()));
    globalStore[COUPON_STORE_KEY] = { coupons: seeded };
  }
  return globalStore[COUPON_STORE_KEY];
}

function couponFrom(code: string, percentOff: number, createdAt: Date): Coupon {
  return {
    id: `coup_${code.toLowerCase()}`,
    code,
    percentOff,
    status: "active",
    createdAt: createdAt.toISOString(),
  };
}

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return COUPON_CODE_REGEX.test(code) ? code : null;
}

function validatePercentOff(raw: unknown): number | null {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > 100) {
    return null;
  }
  return value;
}

export function listCoupons(): Coupon[] {
  return couponStore().coupons
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export function createCoupon(raw: { code?: unknown; percentOff?: unknown }): CouponResult<Coupon> {
  const code = normalizeCode(raw.code);
  if (!code) {
    return {
      ok: false,
      error: "Coupon code must be 2-32 characters (letters, digits, hyphens).",
      status: 400,
    };
  }

  const percentOff = validatePercentOff(raw.percentOff);
  if (percentOff === null) {
    return { ok: false, error: "Percent off must be a whole number from 1 to 100.", status: 400 };
  }

  const store = couponStore();
  const existing = store.coupons.find((candidate) => candidate.code === code);
  if (existing) {
    return {
      ok: false,
      error: `Coupon code ${code} already exists (${existing.status}).`,
      status: 409,
    };
  }

  const coupon = couponFrom(code, percentOff, new Date());
  store.coupons.unshift(coupon);
  return { ok: true, value: coupon };
}

export function setCouponEnabled(code: string, enabled: boolean): CouponResult<Coupon> {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { ok: false, error: "Invalid coupon code.", status: 400 };
  }

  const store = couponStore();
  const index = store.coupons.findIndex((candidate) => candidate.code === normalized);
  if (index < 0) {
    return { ok: false, error: "Coupon not found.", status: 404 };
  }

  const nextStatus: CouponStatus = enabled ? "active" : "disabled";
  if (store.coupons[index].status === nextStatus) {
    return { ok: true, value: store.coupons[index] };
  }

  store.coupons[index] = { ...store.coupons[index], status: nextStatus };
  return { ok: true, value: store.coupons[index] };
}

export type CouponValidation =
  | {
      ok: true;
      coupon: Pick<Coupon, "code" | "percentOff">;
      subtotal: number;
      tax: number;
      discountAmount: number;
      total: number;
    }
  | { ok: false; error: string; status: number };

export function validateCouponCode(code: string, subtotal: unknown): CouponValidation {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { ok: false, error: "Enter a valid coupon code.", status: 400 };
  }
  if (typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0) {
    return { ok: false, error: "Invalid order subtotal.", status: 400 };
  }

  const coupon = couponStore().coupons.find((candidate) => candidate.code === normalized);
  if (!coupon) {
    return { ok: false, error: `Coupon ${normalized} is not a valid code.`, status: 404 };
  }
  if (coupon.status === "disabled") {
    return { ok: false, error: `Coupon ${normalized} is disabled.`, status: 409 };
  }

  const cents = (amount: number): number => Math.round(amount * 100) / 100;
  const discountAmount = cents((subtotal * coupon.percentOff) / 100);
  const tax = cents(subtotal * 0.08);
  const total = cents(subtotal + tax - discountAmount);

  return {
    ok: true,
    coupon: { code: coupon.code, percentOff: coupon.percentOff },
    subtotal,
    tax,
    discountAmount,
    total,
  };
}
