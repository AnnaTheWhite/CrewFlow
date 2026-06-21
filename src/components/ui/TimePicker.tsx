import { useEffect, useRef, useState } from "react";

type TimePickerProps = {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export default function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  required,
}: TimePickerProps) {
  const [hour, minute] = value ? value.split(":") : ["", ""];

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  function handleHourChange(h: string) {
    onChange(`${h}:${minute || "00"}`);
  }

  function handleMinuteChange(m: string) {
    onChange(`${hour || "00"}:${m}`);
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20 focus:border-orange-500 focus:outline-none"
      >
        <span className={value ? "text-white" : "text-slate-500"}>
          {value || placeholder}
        </span>
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {required && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      )}

      {open && (
        <div className="absolute z-50 mt-2 rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl" style={{ minWidth: "220px" }}>
          <div className="flex items-center gap-2">
            <select
              value={hour}
              onChange={(e) => handleHourChange(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-orange-500"
            >
              <option value="" disabled>--</option>
              {hours.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <span className="text-slate-400 font-bold">:</span>

            <select
              value={minute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-orange-500"
            >
              <option value="" disabled>--</option>
              {minutes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
