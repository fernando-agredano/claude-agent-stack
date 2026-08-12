export type Summary = {
  agentsWorking: number;
  agentsIdle: number;
  agentsError: number;
  memoriesTotal: number;
  notesTotal: number;
  eventsToday: number;
};

export type MemoryItem = {
  id: number;
  text: string;
  tags: string[];
  importance: number;
  updated_at: string;
};

export type AgentEvent = {
  id: number;
  agent: string;
  event_type: "started" | "finished" | "error" | "task_assigned";
  detail: string;
  created_at: string;
};

export type VaultGraphNode = {
  id: string;
  folder: string;
  tags: string[];
};

export type VaultGraphLink = {
  source: string;
  target: string;
};

export type VaultGraph = {
  nodes: VaultGraphNode[];
  links: VaultGraphLink[];
};

export type TimeseriesPoint = { bucket: string; count: number };

export type AgentCount = { agent: string; count: number };

export type TypeCount = { event_type: AgentEvent["event_type"]; count: number };

export type DurationStat = { agent: string; avgMs: number; count: number };

export type Analytics = {
  timeseries: TimeseriesPoint[];
  byAgent: AgentCount[];
  byType: TypeCount[];
  durations: DurationStat[];
};
