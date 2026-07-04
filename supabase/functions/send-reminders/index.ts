import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type SupplementRow = {
  id: string;
  client_id: string;
  name: string;
  schedule_days: number[];
  schedule_times: string[];
  dosage_amount: number | null;
  dosage_unit: string | null;
  dosage: string | null;
};

type PushRow = {
  client_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function formatDosage(row: SupplementRow): string {
  if (row.dosage_amount != null && row.dosage_unit) {
    return `${row.dosage_amount} ${row.dosage_unit}`;
  }
  return row.dosage ?? "";
}

function normalizeTimes(times: string[] | null): string[] {
  if (!times || times.length === 0) return ["08:00:00"];
  return times;
}

function timeMatchesNow(time: string, now: Date, windowMinutes = 5): boolean {
  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  const slot = hour * 60 + minute;
  const current = now.getUTCHours() * 60 + now.getUTCMinutes();
  return Math.abs(slot - current) <= windowMinutes;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:reminders@gentle-way.app";

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const day = now.getUTCDay();

  const { data: supplements, error: suppError } = await supabase
    .from("supplements")
    .select("id, client_id, name, schedule_days, schedule_times, dosage_amount, dosage_unit, dosage")
    .eq("is_active", true);

  if (suppError) {
    return new Response(JSON.stringify({ error: suppError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const due = (supplements as SupplementRow[]).filter((s) => {
    if (!s.schedule_days.includes(day)) return false;
    return normalizeTimes(s.schedule_times).some((t) => timeMatchesNow(t, now));
  });

  if (due.length === 0) {
    return new Response(JSON.stringify({ sent: 0, due: 0, mode: "noop" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const clientIds = [...new Set(due.map((s) => s.client_id))];
  const { data: subscriptions, error: subError } = await supabase
    .from("push_subscriptions")
    .select("client_id, endpoint, p256dh, auth")
    .in("client_id", clientIds);

  if (subError) {
    return new Response(JSON.stringify({ error: subError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subsByClient = new Map<string, PushRow[]>();
  for (const row of (subscriptions ?? []) as PushRow[]) {
    const list = subsByClient.get(row.client_id) ?? [];
    list.push(row);
    subsByClient.set(row.client_id, list);
  }

  if (!vapidPublic || !vapidPrivate) {
    console.log("[send-reminders] VAPID keys not configured", {
      due: due.map((s) => ({ id: s.id, name: s.name, client_id: s.client_id })),
      subscriptions: (subscriptions ?? []).length,
    });
    return new Response(
      JSON.stringify({
        sent: 0,
        due: due.length,
        mode: "stub",
        message: "VAPID keys not configured — logged due reminders only",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  let sent = 0;
  for (const supplement of due) {
    const subs = subsByClient.get(supplement.client_id) ?? [];
    const dosage = formatDosage(supplement);
    const body = dosage
      ? `Time to take ${supplement.name} (${dosage})`
      : `Time to take ${supplement.name}`;
    const payload = JSON.stringify({
      title: "Supplement reminder",
      body,
      url: "/supplements",
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent += 1;
      } catch (error) {
        console.error("[send-reminders] push failed", sub.endpoint, error);
      }
    }
  }

  return new Response(JSON.stringify({ sent, due: due.length, mode: "push" }), {
    headers: { "Content-Type": "application/json" },
  });
});
