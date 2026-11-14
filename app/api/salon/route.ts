import { readBody, withUser } from "@/db/auth";
import {
  createAppointment,
  createClient,
  createStaff,
  deactivateStaff,
  listAppointments,
  listClients,
  listStaff,
  updateAppointmentStatus,
  type AppointmentRecord,
} from "@/db/pos";

export const runtime = "edge";

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function GET(request: Request) {
  return withUser(request, async () => {
    const [clients, staff, appointments] = await Promise.all([listClients(), listStaff(), listAppointments()]);
    return Response.json({ clients, staff, appointments });
  });
}

export function POST(request: Request) {
  return withUser(request, async () => {
    const body = await readBody(request);
    switch (body.action) {
      case "client":
        return Response.json(
          { client: await createClient({ name: text(body.name), phone: text(body.phone), email: text(body.email), notes: text(body.notes) }) },
          { status: 201 },
        );
      case "staff":
        return Response.json(
          { staff: await createStaff({ name: text(body.name), specialty: text(body.specialty), commissionPercent: Number(body.commissionPercent) }) },
          { status: 201 },
        );
      case "staffRemove":
        return Response.json({ staff: await deactivateStaff(Number(body.id)) });
      case "appointment":
        return Response.json(
          {
            appointments: await createAppointment({
              clientId: Number(body.clientId),
              staffId: Number(body.staffId),
              productId: Number(body.productId),
              startsAt: text(body.startsAt),
              notes: text(body.notes),
            }),
          },
          { status: 201 },
        );
      case "appointmentStatus":
        return Response.json({
          appointments: await updateAppointmentStatus({ id: Number(body.id), status: text(body.status) as AppointmentRecord["status"] }),
        });
      default:
        return Response.json({ error: "Accion no valida." }, { status: 400 });
    }
  });
}
