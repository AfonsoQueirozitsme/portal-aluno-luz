// file: src/components/Timetable.tsx
import React, { useMemo } from "react";

export type Lesson = {
  id?: string;
  day: "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sáb" | "Dom";
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  subject?: string;
  teacher?: string;
  room?: string;
  meta?: any;    // qualquer payload (ex.: id real da scheduled_lesson)
};

type Props = {
  lessons: Lesson[];
  startHour?: number;    // default 8
  endHour?: number;      // default 21
  slotMinutes?: number;  // default 30
  showWeekend?: boolean; // default true
  className?: string;
  onLessonClick?: (lesson: Lesson) => void;
  onEmptySlotClick?: (day: Lesson["day"], timeHHMM: string) => void;
};

const DAYS: Lesson["day"][] = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function Timetable({
  lessons,
  startHour = 8,
  endHour = 21,
  slotMinutes = 30,
  showWeekend = true,
  className,
  onLessonClick,
  onEmptySlotClick,
}: Props) {
  const dayCols = useMemo(
    () => (showWeekend ? DAYS : DAYS.slice(0, 5)),
    [showWeekend]
  );

  const slots = useMemo(() => {
    const out: string[] = [];
    for (let t = startHour * 60; t < endHour * 60; t += slotMinutes) {
      out.push(minutesToHHMM(t));
    }
    return out;
  }, [startHour, endHour, slotMinutes]);

  const byDay = useMemo(() => {
    const map = new Map<Lesson["day"], Lesson[]>();
    dayCols.forEach((d) => map.set(d, []));
    lessons.forEach((l) => {
      if (!map.has(l.day)) map.set(l.day, []);
      map.get(l.day)!.push(l);
    });
    // ordenar por start
    for (const d of dayCols) {
      const arr = map.get(d)!;
      arr.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    }
    return map;
  }, [lessons, dayCols]);

  return (
    <div className={`w-full overflow-x-auto ${className || ""}`}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `80px repeat(${dayCols.length}, minmax(140px, 1fr))`,
        }}
      >
        {/* Header */}
        <div />
        {dayCols.map((d) => (
          <div key={d} className="px-2 py-2 text-sm font-semibold text-center">{d}</div>
        ))}

        {/* Rows */}
        {slots.map((time, rowIdx) => (
          <React.Fragment key={time}>
            {/* time column */}
            <div className="px-2 py-3 text-xs text-muted-foreground sticky left-0 bg-white border-y">
              {time}
            </div>

            {/* day columns */}
            {dayCols.map((day) => {
              const dayLessons = byDay.get(day)!;

              // render bloco das aulas (absoluto dentro da célula do dia com full-height da linha)
              // Nota: vamos renderizar overlay absoluto para permitir blocos com altura proporcional
              return (
                <div
                  key={`${day}-${time}`}
                  className="relative h-14 border-y border-l last:border-r"
                >
                  {/* empty-slot button */}
                  {onEmptySlotClick && (
                    <button
                      type="button"
                      className="absolute inset-0 w-full h-full group"
                      onClick={() => onEmptySlotClick(day, time)}
                      aria-label={`Criar sessão em ${day} às ${time}`}
                    >
                      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-primary/5" />
                    </button>
                  )}

                  {/* aulas que intersectam este slot (posicionadas apenas uma vez, no slot onde começam) */}
                  {dayLessons
                    .filter((l) => l.start === time) // desenhar no slot inicial
                    .map((l, idx) => {
                      const top = 2;
                      const height =
                        Math.max(
                          26,
                          (toMinutes(l.end) - toMinutes(l.start)) *
                            (56 / slotMinutes) // 56px ~ h-14
                        ) - 4;

                      return (
                        <div
                          key={`${l.start}-${idx}-${l.subject}`}
                          className="absolute left-1 right-1 z-10 rounded-lg border bg-white shadow-sm hover:shadow-md transition"
                          style={{ top, height }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onLessonClick?.(l);
                          }}
                        >
                          <div className="px-2 py-1 text-[11px] text-muted-foreground">
                            {l.start}–{l.end}
                          </div>
                          <div className="px-2 pb-2">
                            <div className="text-sm font-semibold truncate">{l.subject || "—"}</div>
                            <div className="text-xs truncate">
                              {l.teacher ? `${l.teacher}` : ""}
                              {l.teacher && l.room ? " • " : ""}
                              {l.room ? `Sala ${l.room}` : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
