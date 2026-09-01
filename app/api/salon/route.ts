import {
  createAppointment,
  createClient,
  createStaff,
  listAppointments,
  listClients,
  listStaff,
  updateAppointmentStatus,
} from "@/db/pos";

export const runtime = "edge";

export async function GET() {
  try {
    const [clients, staff, appointments] = await Promise.all([listClients(), listStaff(), listAppointments()]);
    return Response.json({ clients, staff, appointments });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo cargar la agenda." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "client") return Response.json({ client: await createClient(body) }, { status: 201 });
    if (body.action === "staff") return Response.json({ staff: await createStaff(body) }, { status: 201 });
    if (body.action === "appointment") return Response.json({ appointments: await createAppointment(body) }, { status: 201 });
    if (body.action === "appointmentStatus") return Response.json({ appointments: await updateAppointmentStatus(body) });
    return Response.json({ error: "Accion no valida." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo guardar la informacion." }, { status: 400 });
  }
}
