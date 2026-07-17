import { getReservationByPnr, buildReservationPdf } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pnr: string }> },
) {
  const { pnr } = await params;
  let reservation: Awaited<ReturnType<typeof getReservationByPnr>>;
  try {
    reservation = await getReservationByPnr(pnr);
  } catch {
    return Response.json({ error: "Could not load reservation PDF." }, { status: 500 });
  }

  if (!reservation) {
    return Response.json({ error: "Reservation not found." }, { status: 404 });
  }

  const pdf = buildReservationPdf(reservation);
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="DevAir-${reservation.pnr}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
