export type RangeKey = "day" | "week" | "month";

export const RANGES: { key: RangeKey; label: string; note: string }[] = [
  { key: "day", label: "Today", note: "06:12 — updated 4 min ago" },
  { key: "week", label: "7 days", note: "Feb 28 — Mar 6" },
  { key: "month", label: "30 days", note: "Feb 5 — Mar 6" },
];

export type Board = {
  labels: string[];
  hrv: number[];
  rhr: number[];
  sleep: { deep: number[]; rem: number[]; core: number[]; awake: number[] };
  rings: { move: number; sleep: number; heart: number };
  scores: {
    readiness: number;
    sleepScore: number;
    recovery: number;
    battery: number;
    steps: number;
    hrv: number;
    rhr: number;
    breathe: number;
  };
  deltas: { readiness: number; hrv: number; rhr: number; sleepScore: number };
  journal: {
    time: string;
    title: string;
    body: string;
    tone: "recovery" | "metric" | "lilac" | "coral";
    tag: string;
  }[];
};

export const BOARD: Record<RangeKey, Board> = {
  day: {
    labels: ["00", "01", "02", "03", "04", "05", "06", "07"],
    hrv: [46, 52, 61, 66, 63, 58, 54, 62],
    rhr: [52, 50, 49, 48, 48, 49, 51, 55],
    sleep: {
      deep: [0, 1.4, 0.9, 0, 0, 0, 0, 0],
      rem: [0.3, 0.4, 1.2, 0.6, 0, 0, 0, 0],
      core: [1.1, 2.6, 1.4, 0.4, 0, 0, 0, 0],
      awake: [0.1, 0, 0.2, 0.1, 0.3, 0.4, 0.5, 0],
    },
    rings: { move: 0.18, sleep: 0.94, heart: 0.42 },
    scores: {
      readiness: 87,
      sleepScore: 91,
      recovery: 82,
      battery: 74,
      steps: 1284,
      hrv: 61,
      rhr: 49,
      breathe: 13.4,
    },
    deltas: { readiness: 6, hrv: 9, rhr: -2, sleepScore: 3 },
    journal: [
      {
        time: "22:41",
        title: "Lights out 31 min earlier",
        body: "Bevel pulled bedtime from the watch. Consistency up two nights in a row.",
        tone: "lilac",
        tag: "Sleep",
      },
      {
        time: "03:20",
        title: "Deep-sleep peak",
        body: "1.4 h of slow-wave sleep. HRV held above 60 ms for 47 minutes.",
        tone: "metric",
        tag: "Recovery",
      },
      {
        time: "06:04",
        title: "Morning rhythm steady",
        body: "Respiratory rate 13.4 /min — inside your 30-day band.",
        tone: "recovery",
        tag: "Vitals",
      },
      {
        time: "06:12",
        title: "Easy day suggested",
        body: "Readiness 87 but leg load is high. Zone 2 for 40 min, then stop.",
        tone: "coral",
        tag: "Coaching",
      },
    ],
  },
  week: {
    labels: ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"],
    hrv: [48, 57, 63, 44, 59, 66, 61],
    rhr: [53, 50, 49, 55, 51, 48, 49],
    sleep: {
      deep: [0.9, 1.3, 1.5, 0.7, 1.2, 1.6, 1.4],
      rem: [1.0, 0.8, 1.3, 0.6, 1.1, 1.4, 1.2],
      core: [3.4, 3.9, 4.1, 2.8, 3.6, 4.4, 4.1],
      awake: [0.4, 0.2, 0.3, 0.9, 0.3, 0.2, 0.2],
    },
    rings: { move: 0.86, sleep: 0.91, heart: 0.74 },
    scores: {
      readiness: 84,
      sleepScore: 88,
      recovery: 79,
      battery: 68,
      steps: 68420,
      hrv: 57,
      rhr: 51,
      breathe: 13.9,
    },
    deltas: { readiness: 4, hrv: 6, rhr: -1, sleepScore: 5 },
    journal: [
      {
        time: "Mon",
        title: "Load spike flagged",
        body: "620 TSB from a threshold session. HRV dropped 19 ms overnight, then rebounded.",
        tone: "coral",
        tag: "Strain",
      },
      {
        time: "Wed",
        title: "Best night this month",
        body: "7 h 54 m with 1.6 h deep. Sleep debt cleared to zero by Thursday.",
        tone: "lilac",
        tag: "Sleep",
      },
      {
        time: "Thu",
        title: "Resting HR down 3 bpm",
        body: "Five-week low. Aerobic base is trending up alongside VO₂ estimate.",
        tone: "metric",
        tag: "Vitals",
      },
      {
        time: "Fri",
        title: "Race-week plan opened",
        body: "Four tapers sessions queued, peak readiness projected for Sunday.",
        tone: "recovery",
        tag: "Coaching",
      },
    ],
  },
  month: {
    labels: ["W1", "W2", "W3", "W4", "W5"],
    hrv: [47, 51, 55, 58, 61],
    rhr: [54, 53, 51, 50, 49],
    sleep: {
      deep: [1.0, 1.1, 1.3, 1.4, 1.5],
      rem: [1.0, 1.1, 1.2, 1.2, 1.3],
      core: [3.5, 3.7, 3.9, 4.0, 4.1],
      awake: [0.6, 0.5, 0.4, 0.3, 0.2],
    },
    rings: { move: 0.93, sleep: 0.88, heart: 0.81 },
    scores: {
      readiness: 86,
      sleepScore: 86,
      recovery: 81,
      battery: 71,
      steps: 284910,
      hrv: 54,
      rhr: 51,
      breathe: 14.1,
    },
    deltas: { readiness: 9, hrv: 14, rhr: -5, sleepScore: 7 },
    journal: [
      {
        time: "W1",
        title: "Baseline established",
        body: "Fourteen consistent nights gave Bevel a personal HRV band of 44–52 ms.",
        tone: "metric",
        tag: "Baseline",
      },
      {
        time: "W2",
        title: "Evening walks added",
        body: "Twelve 20-minute walks. Late-night glucose swings narrowed by 22%.",
        tone: "recovery",
        tag: "Habit",
      },
      {
        time: "W4",
        title: "Sleep debt cleared",
        body: "First full week without a recovery-day dip since you started tracking.",
        tone: "lilac",
        tag: "Sleep",
      },
      {
        time: "W5",
        title: "Readiness plateau",
        body: "Curve flattened at 86. Suggested next block: two longer Zone 2 sessions.",
        tone: "coral",
        tag: "Coaching",
      },
    ],
  },
};

export const FEATURES = [
  {
    title: "Readiness",
    copy:
      "One number every morning, built from HRV, resting pulse, skin temp and the load you carried yesterday.",
    stat: "87",
    unit: "/100",
    tone: "recovery" as const,
  },
  {
    title: "Sleep architecture",
    copy:
      "Deep, REM, core and awake windows scored against your own 30-day band — not a population average.",
    stat: "7:54",
    unit: "hrs",
    tone: "lilac" as const,
  },
  {
    title: "Strain & recovery",
    copy:
      "Every session lands on the same scale, so a hard track day and a long swim finally mean the same thing.",
    stat: "14.2",
    unit: "TSB",
    tone: "coral" as const,
  },
];

export const PARTNERS = [
  "Apple Watch",
  "Oura Ring",
  "WHOOP",
  "Garmin",
  "Withings",
  "Polar",
  "Fitbit",
  "Whoop MGM",
];

export type Story = {
  kind: "photo" | "capture";
  image?: string;
  name: string;
  handle: string;
  caption: string;
  metric: string;
  metricLabel: string;
  tone: "recovery" | "metric" | "lilac" | "coral";
};

const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800`;

export const STORIES: Story[] = [
  {
    kind: "photo",
    image: px(16961403),
    name: "Maya Ortiz",
    handle: "@runmayarun",
    caption: "Six weeks of 6am loops and my resting HR finally left the 60s.",
    metric: "-7",
    metricLabel: "bpm RHR",
    tone: "recovery",
  },
  {
    kind: "capture",
    name: "Priya Raman",
    handle: "@priya.restes",
    caption: "The 03:20 deep-sleep note is the only reason I fixed my bedtime.",
    metric: "1h 36m",
    metricLabel: "deep sleep",
    tone: "lilac",
  },
  {
    kind: "photo",
    image: px(35221008),
    name: "Noah Feld",
    handle: "@noahfuels",
    caption: "Logged breakfast, watched recovery climb. Data you can eat.",
    metric: "82",
    metricLabel: "recovery",
    tone: "coral",
  },
  {
    kind: "photo",
    image: px(12267777),
    name: "Elena Kaur",
    handle: "@elenaruns",
    caption: "Bevel told me to go easy on Tuesday. I ignored it. It was right.",
    metric: "+19",
    metricLabel: "HRV ms",
    tone: "metric",
  },
  {
    kind: "capture",
    name: "Tomas Lind",
    handle: "@tomaskb",
    caption: "Body battery from 12 to 74 before my first coffee. Mornings, measured.",
    metric: "74%",
    metricLabel: "battery",
    tone: "recovery",
  },
  {
    kind: "photo",
    image: px(8805111),
    name: "Ayo Bankole",
    handle: "@ayo.moves",
    caption: "Post-partum, tracking sleep in fragments and still seeing progress.",
    metric: "4h 12m",
    metricLabel: "core sleep",
    tone: "lilac",
  },
  {
    kind: "photo",
    image: px(19084945),
    name: "Greta Voss",
    handle: "@gretavoss",
    caption: "Sunrise sessions, and a readiness curve that finally goes up and to the right.",
    metric: "86",
    metricLabel: "readiness",
    tone: "metric",
  },
  {
    kind: "capture",
    name: "Dev Malhotra",
    handle: "@dev.taper",
    caption: "Race-week plan queued four tapers sessions. Sunday was the best 10k of my life.",
    metric: "PB",
    metricLabel: "10 km",
    tone: "coral",
  },
];

export const FOOTER_GROUPS = [
  {
    title: "Product",
    links: ["Readiness", "Sleep", "Strain & recovery", "Journal", "Morning brief", "What's new"],
  },
  {
    title: "Devices",
    links: ["Apple Watch", "iPhone widgets", "Oura Ring", "WHOOP", "Garmin sync", "Health app"],
  },
  {
    title: "Company",
    links: ["About Bevel", "Careers", "Press kit", "Science board", "Privacy promise"],
  },
  {
    title: "Support",
    links: ["Help centre", "Setup guide", "Data export", "Status", "Contact"],
  },
];
