import { useEffect, useRef, useState } from "react";

export type AgentStatus = {
  agent: string;
  status: "working" | "idle" | "error";
  detail: string;
  last_event_at: string;
  elapsed_ms: number;
};

type ConnectionState = "connecting" | "connected" | "disconnected";

export function useAgentStatuses() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    async function fetchStatusOnce() {
      try {
        const res = await fetch("/api/status");
        const data = (await res.json()) as AgentStatus[];
        if (!cancelled) {
          setAgents(data);
          setLastUpdate(Date.now());
        }
      } catch {
        // sin datos disponibles todavia
      }
    }

    function startFallbackPolling() {
      if (fallbackInterval) return;
      fetchStatusOnce();
      fallbackInterval = setInterval(fetchStatusOnce, 3000);
    }

    function stopFallbackPolling() {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    }

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;
      setConnectionState("connecting");

      ws.onopen = () => {
        if (cancelled) return;
        setConnectionState("connected");
        stopFallbackPolling();
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "status" && Array.isArray(payload.agents)) {
            setAgents(payload.agents);
            setLastUpdate(Date.now());
          }
        } catch {
          // mensaje no parseable, se ignora
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnectionState("disconnected");
        startFallbackPolling();
        retryTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      stopFallbackPolling();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  return { agents, connectionState, lastUpdate };
}
