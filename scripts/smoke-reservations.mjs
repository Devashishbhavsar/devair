const baseUrl = process.env.DEVAIR_SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const origin = baseUrl.replace(/\/$/, "");

const airlines = [
  { code: "DA", name: "DevAir Airways" },
  { code: "UA", name: "United Airlines" },
  { code: "AA", name: "American Airlines" },
  { code: "DL", name: "Delta Air Lines" },
  { code: "BA", name: "British Airways" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" },
];

function hashSeed(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function firstOfferId(search) {
  const seed = hashSeed(`${search.from}-${search.to}-${search.date}-${search.passengers}`);
  const offers = [];
  for (let i = 0; i < 3 + (seed % 3); i += 1) {
    const airline = airlines[(seed + i * 3) % airlines.length];
    const pricePerPassenger = 120 + ((seed + i * 41) % 680);
    const flightNum = 100 + ((seed + i * 13) % 800);
    offers.push({
      id: `${airline.code}${flightNum}-${search.from}${search.to}-${search.date}-${i}`,
      totalPrice: pricePerPassenger * search.passengers,
    });
  }
  return offers.sort((a, b) => a.totalPrice - b.totalPrice)[0].id;
}

function futureDate(daysFromNow) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

async function expectOk(response, label, expectedStatus) {
  if (response.status !== expectedStatus) {
    const text = await response.text();
    throw new Error(`${label} returned ${response.status}; expected ${expectedStatus}: ${text}`);
  }
}

async function smokeValidity(validity, index) {
  const search = {
    from: index === 0 ? "JFK" : "SFO",
    to: index === 0 ? "LHR" : "NRT",
    date: futureDate(30 + index),
    passengers: index + 1,
    tripType: "one-way",
  };
  const payload = {
    ...search,
    validity,
    offerId: firstOfferId(search),
    travelerName: `Smoke Traveler ${validity}`,
    travelerEmail: `smoke-${validity}@example.com`,
  };

  const createResponse = await fetch(`${origin}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await expectOk(createResponse, `create ${validity}`, 201);
  const created = await createResponse.json();
  const pnr = created?.reservation?.pnr;
  if (!created?.ok || typeof pnr !== "string") {
    throw new Error(`create ${validity} did not return a reservation PNR`);
  }
  if (created.reservation.validity !== validity) {
    throw new Error(`create ${validity} returned validity ${created.reservation.validity}`);
  }

  const retrieveResponse = await fetch(`${origin}/api/reservations/${pnr}`);
  await expectOk(retrieveResponse, `retrieve ${validity}`, 200);
  const retrieved = await retrieveResponse.json();
  if (!retrieved?.ok || retrieved.reservation?.pnr !== pnr || retrieved.reservation?.validity !== validity) {
    throw new Error(`retrieve ${validity} returned the wrong reservation`);
  }

  const pdfResponse = await fetch(`${origin}/api/reservations/${pnr}/pdf`);
  await expectOk(pdfResponse, `pdf ${validity}`, 200);
  const contentType = pdfResponse.headers.get("content-type") ?? "";
  const pdf = new Uint8Array(await pdfResponse.arrayBuffer());
  const header = new TextDecoder().decode(pdf.slice(0, 8));
  if (!contentType.includes("application/pdf") || !header.startsWith("%PDF-")) {
    throw new Error(`pdf ${validity} did not return a PDF`);
  }

  console.log(`reservation smoke ${validity}: pnr=${pnr} pdfBytes=${pdf.byteLength}`);
}

for (const [index, validity] of ["48h", "14d"].entries()) {
  await smokeValidity(validity, index);
}
