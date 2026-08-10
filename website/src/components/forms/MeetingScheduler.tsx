"use client";

import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  User,
  Mail,
  CheckCircle2,
  Sparkles,
  Video,
  Building2,
  CalendarCheck,
} from "lucide-react";
import { submitContact } from "@/lib/contact";
import { PremiumButton } from "@/components/ui/PremiumButton";

const TIMEZONES = [
  "IST (UTC+5:30) — India Standard",
  "EST (UTC-5:00) — US Eastern",
  "PST (UTC-8:00) — US Pacific",
  "GMT/BST (UTC+0:00) — UK London",
  "SGT (UTC+8:00) — Singapore",
  "AEST (UTC+10:00) — Sydney",
];

const TOPICS = [
  "AI & Agentic Systems Advisory",
  "Cloud Architecture & DevOps Review",
  "New Product Engineering Brief",
  "Codebase Rescue & Performance Audit",
  "General Partnership Inquiry",
];

const TIME_SLOTS = [
  "09:30 AM",
  "11:00 AM",
  "01:30 PM",
  "03:00 PM",
  "04:30 PM",
  "06:00 PM",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthDay {
  date: Date;
  dayNumber: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isDisabled: boolean;
  isWeekend: boolean;
}

export function MeetingScheduler() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Calendar month/year navigation state
  const [currentViewDate, setCurrentViewDate] = useState(() => new Date());

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  // Find first available future weekday as default selection
  const initialSelectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]);
  const [selectedTimezone, setSelectedTimezone] = useState(TIMEZONES[0]);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentViewDate(new Date(year, month + 1, 1));
  };

  // Generate calendar day grid for current view month
  const monthDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Mon=0, Sun=6

    const daysInMonth = lastDay.getDate();

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevPadding: MonthDay[] = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      prevPadding.push({
        date,
        dayNumber: date.getDate(),
        dateStr: date.toISOString().split("T")[0],
        isCurrentMonth: false,
        isToday: false,
        isDisabled: true,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    // Current month days
    const currentDays: MonthDay[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);
      const dayOfWeek = dateObj.getDay();
      const isPast = dateObj < today;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      currentDays.push({
        date: dateObj,
        dayNumber: d,
        dateStr: dateObj.toISOString().split("T")[0],
        isCurrentMonth: true,
        isToday: dateObj.getTime() === today.getTime(),
        isDisabled: isPast || isWeekend,
        isWeekend,
      });
    }

    // Next month padding to complete 5 or 6 rows
    const totalSoFar = prevPadding.length + currentDays.length;
    const remainder = totalSoFar % 7;
    const nextCount = remainder === 0 ? 0 : 7 - remainder;
    const nextPadding: MonthDay[] = [];
    for (let d = 1; d <= nextCount; d++) {
      const date = new Date(year, month + 1, d);
      nextPadding.push({
        date,
        dayNumber: d,
        dateStr: date.toISOString().split("T")[0],
        isCurrentMonth: false,
        isToday: false,
        isDisabled: true,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    return [...prevPadding, ...currentDays, ...nextPadding];
  }, [year, month, today]);

  const monthLabel = useMemo(() => {
    return currentViewDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentViewDate]);

  const selectedDateFormatted = useMemo(() => {
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg("Please enter your name and work email.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const bookingDetails = [
      `Strategy Call Booking Request:`,
      `- Date & Time: ${selectedDateFormatted} at ${selectedTime} (${selectedTimezone})`,
      `- Topic: ${selectedTopic}`,
      `- Name: ${name}`,
      `- Email: ${email}`,
      company ? `- Company: ${company}` : null,
      notes ? `- Agenda Notes:\n${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await submitContact({
      name,
      email,
      message: bookingDetails,
      intent: "book-meeting",
      page: "/contact/book-meeting",
    });

    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || "Could not book meeting.");
      return;
    }

    setBooked(true);
  };

  if (booked) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold text-foreground md:text-3xl">
          Meeting Reserved!
        </h3>
        <p className="mx-auto mt-2 max-w-md text-small text-muted-foreground">
          We have reserved <strong className="text-foreground">{selectedDateFormatted} at {selectedTime}</strong> for your 1:1 strategy briefing. A video calendar invitation has been dispatched to <strong className="text-foreground">{email}</strong>.
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-xl border border-border/80 bg-surface/90 p-5 text-left text-small space-y-3">
          <div className="flex items-center gap-2.5 font-medium text-foreground">
            <Video className="h-4 w-4 text-brand-blue" />
            <span>Google Meet / Zoom Video Call</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <CalendarIcon className="h-4 w-4 text-brand-cyan" />
            <span>{selectedDateFormatted} @ {selectedTime} ({selectedTimezone.split(" ")[0]})</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Topic: {selectedTopic}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleBooking} className="space-y-8">
      {/* 2-Column Desktop Layout: Left Calendar Grid, Right Slot & Form */}
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        
        {/* LEFT COLUMN: Interactive Month Calendar (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Advisory Topic & Timezone Selectors */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-label font-semibold text-foreground">
                Advisory Focus
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted p-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t} className="bg-background text-foreground">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-label font-semibold text-foreground">
                Timezone
              </label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted p-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} className="bg-background text-foreground">
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CALENDAR HEADER */}
          <div className="rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-brand-cyan" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  {monthLabel}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:border-brand-blue hover:text-brand-blue"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:border-brand-blue hover:text-brand-blue"
                  aria-label="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* WEEKDAY HEADERS */}
            <div className="grid grid-cols-7 mb-2 text-center text-label font-semibold uppercase tracking-wider text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* MONTH DAYS GRID */}
            <div className="grid grid-cols-7 gap-1 md:gap-1.5">
              {monthDays.map((dayItem, idx) => {
                const isSelected =
                  dayItem.isCurrentMonth &&
                  selectedDate.getFullYear() === dayItem.date.getFullYear() &&
                  selectedDate.getMonth() === dayItem.date.getMonth() &&
                  selectedDate.getDate() === dayItem.date.getDate();

                if (!dayItem.isCurrentMonth) {
                  return (
                    <div
                      key={idx}
                      className="flex h-10 w-full items-center justify-center text-meta text-muted-foreground/30 select-none md:h-11"
                    >
                      {dayItem.dayNumber}
                    </div>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={dayItem.isDisabled}
                    onClick={() => setSelectedDate(dayItem.date)}
                    className={`relative flex h-10 w-full flex-col items-center justify-center rounded-xl text-small font-semibold transition-all md:h-11 ${
                      isSelected
                        ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30 ring-2 ring-brand-cyan"
                        : dayItem.isDisabled
                        ? "cursor-not-allowed text-muted-foreground/30 bg-muted/30"
                        : "bg-muted/70 text-foreground hover:bg-brand-blue/20 hover:border-brand-blue hover:text-brand-cyan"
                    }`}
                  >
                    <span>{dayItem.dayNumber}</span>
                    {dayItem.isToday && !isSelected ? (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-cyan" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-meta text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-cyan" />
                Selected Date: <strong className="text-foreground">{selectedDateFormatted}</strong>
              </span>
              <span className="hidden sm:inline">Mon–Fri Available</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Time Slots & Contact Form (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Time Slot Picker */}
          <div className="rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-small font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-cyan" />
                <span>Select Time Slot</span>
              </label>
              <span className="text-meta text-muted-foreground">30 min duration</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((slot) => {
                const active = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`rounded-xl px-3 py-2 text-small font-medium transition-all text-center ${
                      active
                        ? "border-2 border-brand-cyan bg-brand-cyan/15 text-foreground font-bold"
                        : "border border-border bg-muted/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attendee Confirmation Form */}
          <div className="rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-sm space-y-4">
            <h3 className="font-display text-small font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-brand-blue" />
              <span>Confirm Attendee Info</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-label text-secondary-foreground">Your Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-border bg-muted p-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="mb-1 block text-label text-secondary-foreground">Work Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full rounded-xl border border-border bg-muted p-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="mb-1 block text-label text-secondary-foreground">Company Name (Optional)</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Tech Solutions"
                  className="w-full rounded-xl border border-border bg-muted p-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="mb-1 block text-label text-secondary-foreground">Agenda Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Briefly describe what you'd like to discuss..."
                  className="w-full rounded-xl border border-border bg-muted p-2.5 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
                />
              </div>
            </div>

            {errorMsg && <p className="text-small text-red-400">{errorMsg}</p>}

            <PremiumButton type="submit" disabled={submitting} className="w-full justify-center mt-2">
              {submitting ? "Reserving Slot..." : `Confirm Strategy Call for ${selectedDate.getDate()} ${selectedDate.toLocaleDateString("en-US", { month: "short" })}`}
            </PremiumButton>
          </div>

        </div>
      </div>
    </form>
  );
}
