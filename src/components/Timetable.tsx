import { cn } from "@/lib/utils";

type Slot = {
  start: string; // e.g. "08:00"
  end: string;   // e.g. "08:30"
};

const DEFAULT_SLOTS: Slot[] = [
  { start: "08:00", end: "08:30" },
  { start: "08:30", end: "09:00" },
  { start: "09:00", end: "09:30" },
  { start: "09:30", end: "10:00" },
  { start: "10:00", end: "10:30" },
  { start: "10:30", end: "11:00" },
  { start: "11:00", end: "11:30" },
  { start: "11:30", end: "12:00" },
  { start: "14:00", end: "14:30" },
  { start: "14:30", end: "15:00" },
  { start: "15:00", end: "15:30" },
  { start: "15:30", end: "16:00" },
  { start: "16:00", end: "16:30" },
  { start: "16:30", end: "17:00" },
  { start: "17:00", end: "17:30" },
  { start: "17:30", end: "18:00" },
];

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export type Lesson = {
  day: typeof DAYS[number];
  start: string; // HH:mm
  end: string;   // HH:mm
  subject: string;
  room?: string;
  teacher?: string;
};

export interface TimetableProps {
  lessons: Lesson[];
  slots?: Slot[];
  className?: string;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function Timetable({ lessons, slots = DEFAULT_SLOTS, className }: TimetableProps) {
  return (
    <div className={cn("w-full overflow-auto rounded-lg border bg-card", className)}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-background z-10">
          <tr>
            <th className="w-20 p-2 text-left font-medium text-muted-foreground">Hora</th>
            {DAYS.map((d) => (
              <th key={d} className="p-2 text-left font-medium text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => (
            <tr key={i} className="border-t">
              <td className="align-top p-2 text-muted-foreground whitespace-nowrap">{slot.start}</td>
              {DAYS.map((d) => (
                <td key={d} className="p-2 align-top">
                  <div className="grid gap-1">
                    {lessons
                      .filter((l) => l.day === d && timeToMinutes(l.start) === timeToMinutes(slot.start))
                      .map((l, idx) => (
                        <div
                          key={idx}
                          className="rounded-md border bg-accent/10 text-foreground p-2 hover-scale shadow-sm"
                        >
                          <div className="text-xs font-medium text-muted-foreground">
                            {l.start} - {l.end}
                          </div>
                          <div className="text-sm font-medium">{l.subject}</div>
                          {l.teacher && (
                            <div className="text-xs text-muted-foreground">{l.teacher}</div>
                          )}
                          {l.room && (
                            <div className="text-xs text-muted-foreground">Sala {l.room}</div>
                          )}
                        </div>
                      ))}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
