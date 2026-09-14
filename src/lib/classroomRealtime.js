import { createClient } from "@supabase/supabase-js";

let client;

export function classroomRealtimeConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function classroomRealtimeClient() {
  if (!classroomRealtimeConfigured()) return null;
  client ||= createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    },
  );
  return client;
}

export function joinClassroomChannel({
  roomCode,
  participant,
  onEvent,
  onPresence,
}) {
  const supabase = classroomRealtimeClient();
  if (!supabase || !roomCode) return null;

  const channel = supabase.channel(`nyx-quiz:${roomCode}`, {
    config: { presence: { key: participant?.id || crypto.randomUUID() } },
  });

  channel
    .on("broadcast", { event: "*" }, message => onEvent?.(message))
    .on("presence", { event: "sync" }, () => onPresence?.(channel.presenceState()))
    .subscribe(async status => {
      if (status === "SUBSCRIBED" && participant) {
        await channel.track({
          id: participant.id,
          displayName: participant.displayName,
          joinedAt: new Date().toISOString(),
        });
      }
    });

  return {
    send(event, payload) {
      return channel.send({ type: "broadcast", event, payload });
    },
    leave() {
      return supabase.removeChannel(channel);
    },
  };
}
