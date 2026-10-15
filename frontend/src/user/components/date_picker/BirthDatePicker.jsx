import React, { useState, useEffect, useRef, useMemo } from "react";
import { Calendar } from "lucide-react";
import "./BirthDatePicker.css";

const VI_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const VI_MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function BirthDatePicker({
  value = "",
  onChange,
  placeholder = "dd/mm/yyyy",
  required = false,
  disabled = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const today = new Date();
  const maxYear = today.getFullYear() - 6;
  const minYear = 1940;
  const defaultYear = today.getFullYear() - 22; // ~2004

  // Parse value (YYYY-MM-DD)
  const parsed = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return { year: y, month: m, day: d };
    }
    return null;
  }, [value]);

  const [currentYear, setCurrentYear] = useState(parsed ? parsed.year : defaultYear);
  const [currentMonth, setCurrentMonth] = useState(parsed ? parsed.month : 1);

  // Sync viewed month/year when opening or value changes
  useEffect(() => {
    if (parsed) {
      setCurrentYear(parsed.year);
      setCurrentMonth(parsed.month);
    }
  }, [parsed, isOpen]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Scroll into view if opened near bottom of scroll container
    const timer = setTimeout(() => {
      const dd = wrapperRef.current?.querySelector(".bdp-dropdown");
      if (dd) {
        dd.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, 60);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Display label: dd/mm/yyyy
  const displayLabel = useMemo(() => {
    if (!parsed) return "";
    return `${pad(parsed.day)}/${pad(parsed.month)}/${parsed.year}`;
  }, [parsed]);

  // Years list descending
  const yearsList = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [maxYear, minYear]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return getDaysInMonth(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sun
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ type: "empty", key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = parsed && parsed.year === currentYear && parsed.month === currentMonth && parsed.day === d;
      cells.push({ type: "day", day: d, isSelected, key: `day-${d}` });
    }
    return cells;
  }, [currentYear, currentMonth, daysInMonth, parsed]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => Math.max(minYear, y - 1));
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => Math.min(maxYear, y + 1));
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    const isoDate = `${currentYear}-${pad(currentMonth)}-${pad(day)}`;
    onChange && onChange(isoDate);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange && onChange("");
  };

  return (
    <div className="bdp-wrapper" ref={wrapperRef}>
      {/* ── TRIGGER INPUT BOX ── */}
      <div
        id={id}
        className={`bdp-input-trigger${isOpen ? " active" : ""}${value ? " has-value" : ""}${disabled ? " disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <Calendar size={16} className="bdp-trigger-icon" />
        <span className="bdp-trigger-text">{displayLabel || placeholder}</span>

        {value && !disabled && (
          <button
            type="button"
            className="bdp-clear-btn"
            onClick={handleClear}
            title="Xóa ngày sinh"
            aria-label="Xóa ngày sinh"
          >
            ✕
          </button>
        )}
      </div>

      {/* Hidden input for HTML5 form validation */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          onChange={() => {}}
          required={required}
          style={{
            position: "absolute",
            opacity: 0,
            width: "1px",
            height: "1px",
            top: "50%",
            left: "50%",
            border: "none",
            padding: 0,
            margin: 0,
            zIndex: -1,
          }}
          onInvalid={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
        />
      )}

      {/* ── CALENDAR DROPDOWN (Directly below input) ── */}
      {isOpen && (
        <div className="bdp-dropdown" role="dialog" aria-label="Lịch chọn ngày sinh">
          {/* Month & Year header */}
          <div className="bdp-dropdown-header">
            <button
              type="button"
              className="bdp-nav-btn"
              onClick={handlePrevMonth}
              title="Tháng trước"
              aria-label="Tháng trước"
            >
              ‹
            </button>

            <div className="bdp-header-selects">
              <select
                className="bdp-header-select"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
              >
                {VI_MONTHS.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                className="bdp-header-select"
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="bdp-nav-btn"
              onClick={handleNextMonth}
              title="Tháng sau"
              aria-label="Tháng sau"
            >
              ›
            </button>
          </div>

          {/* Weekday headers */}
          <div className="bdp-weekdays-row">
            {VI_DAYS.map((wd) => (
              <span key={wd} className="bdp-weekday-cell">
                {wd}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="bdp-days-grid">
            {calendarGrid.map((c) =>
              c.type === "empty" ? (
                <span key={c.key} className="bdp-day-cell empty" />
              ) : (
                <button
                  key={c.key}
                  type="button"
                  className={`bdp-day-cell day${c.isSelected ? " selected" : ""}`}
                  onClick={() => handleSelectDay(c.day)}
                >
                  {c.day}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
