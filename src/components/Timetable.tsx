// file: src/components/Timetable.tsx
import React, { useMemo } from "react";

export type Lesson = {
  id?: string;
  day: "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sáb" | "Dom"; // mantém tipos antigos por compatibilidade
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  subject?: string;
  teacher?: string;
  room?: string;
  meta?: any;
};

type Props = {
  lessons: Lesson[];
  startHour?: number;    // default 8
  endHour?: number;      // default 21
  slotMinutes?: number;  // default 30
  showWeekend?: boolean; // DEPRECATED (ignorado): fim-de-semana removido
  className?: string;
  onLessonClick?: (lesson: Lesson) => void;
  onEmptySlotClick?: (day: Lesson["day"], timeHHMM: string) => void;
};

// Apenas dias úteis (2ª–6ª)
const DAYS: Lesson["day"][] = ["Seg", "Ter", "Qua", "Qui", "Sex"];

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
  showWeekend = false, // ignorado (mantido só para não quebrar chamadas antigas)
  className,
  onLessonClick,
  onEmptySlotClick,
}: Props) {
  // Fica sempre 2ª–6ª
  const dayCols = DAYS;

  const slots = useMemo(() => {
    const out: string[] = [];
    for (let t = startHour * 60; t < endHour * 60; t += slotMinutes) {
      out.push(minutesToHHMM(t));
    }
    return out;
  }, [startHour, endHour, slotMinutes]);

  const byDay = useMemo(() => {
    const map = new Map<Lesson["day"], Lesson[]>();
    // pré-cria apenas dias úteis
    dayCols.forEach((d) => map.set(d, []));
    // ignora entradas de fim-de-semana, mesmo que venham nas props
    lessons.forEach((l) => {
      if (!dayCols.includes(l.day)) return;
      map.get(l.day)!.push(l);
    });
    // ordenar por hora de início
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
        {slots.map((time) => (
          <React.Fragment key={time}>
            {/* time column */}
            <div className="px-2 py-3 text-xs text-muted-foreground sticky left-0 bg-background border-y">
              {time}
            </div>

            {/* day columns */}
            {dayCols.map((day) => {
              const dayLessons = byDay.get(day)!;

              return (
                <div
                  key={`${day}-${time}`}
                  className="relative h-14 border-y border-l last:border-r"
                >
                  {/* clique no slot vazio */}
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

                  {/* blocos que começam neste slot */}
                  {dayLessons
                    .filter((l) => l.start === time)
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
                          className="absolute left-1 right-1 z-10 rounded-lg border bg-background shadow-sm hover:shadow-md transition"
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
