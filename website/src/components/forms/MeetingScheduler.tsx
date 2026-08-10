"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Globe,
  User,
  Mail,
  CheckCircle2,
  Sparkles,
  Video,
  ArrowRight,
} from "lucide-react";
import { submitContact } from "@/lib/contact";
import { PremiumButton } from "@/components/ui/PremiumButton";

const TIMEZONES = [
  "IST (UTC+5:30) — India Standard",
  "EST (UTC-5:00) — US Eastern",
  "PST (UTC-8:00) — US Pacific",
  "GMT/BST (UTC+0:00) — UK London",
  "SGT (UTC+8:00) — Singapore",
];

const TOPICS = [
  "AI & Agentic Systems Advisory",
  "Cloud Architecture & DevOps Review",
  "New Product Engineering Brief",
  "Codebase Rescue & Performance Audit",
  "General Partnership Inquiry",
];

const TIME_SLOTS = [
  "10:00 AM",
  "11:30 AM",
  "02:00 PM",
  "04:00 PM",
  "06:30 PM",
];

// Helper to generate next 7 weekdays
function getUpcomingDays() {
  const days = [];
  const current = new Date();
  let count = 0;
  while (days.length < 6 && count < 14) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Skip Saturday & Sunday
      days.push({
        dateStr: current.toISOString().split("T")[0],
        dayName: current.toLocaleDateString("en-US", { weekday: "short" }),
        formatted: current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    count++;
  }
  return days;
}

export function MeetingScheduler() {
  const upcomingDays = getUpcomingDays();
  const [selectedDay, setSelectedDay] = useState(upcomingDays[0]);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]);
  const [selectedTimezone, setSelectedTimezone] = useState(TIMEZONES[0]);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      `- Date & Time: ${selectedDay.dayName}, ${selectedDay.formatted} at ${selectedTime} (${selectedTimezone})`,
      `- Topic: ${selectedTopic}`,
      `- Name: ${name}`,
      `- Email: ${email}`,
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
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 md:p-12 text-center space-y-4">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
        <h3 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Meeting Reserved!
        </h3>
        <p className="mx-auto max-w-md text-small text-muted-foreground">
          We have reserved <strong className="text-foreground">{selectedDay.dayName}, {selectedDay.formatted} at {selectedTime}</strong> for your strategy call. A calendar invitation with video call link has been dispatched to <strong className="text-foreground">{email}</strong>.
        </p>

        <div className="mx-auto max-w-sm rounded-xl border border-border bg-surface p-4 text-left text-small space-y-2">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Video className="h-4 w-4 text-brand-blue" />
            <span>Google Meet / Zoom Call</span>
          </div>
          <p className="text-meta text-muted-foreground">
            Topic: {selectedTopic}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleBooking} className="space-y-8">
      {/* 1. Topic & Timezone */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-small font-medium text-foreground">
            1. Select Advisory Focus Topic
          </label>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
          >
            {TOPICS.map((t) => (
              <option key={t} value={t} className="bg-background text-foreground">
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-small font-medium text-foreground">
            2. Timezone Region
          </label>
          <select
            value={selectedTimezone}
            onChange={(e) => setSelectedTimezone(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz} className="bg-background text-foreground">
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Date Selection */}
      <div>
        <label className="mb-3 block text-small font-medium text-foreground">
          3. Select Strategy Call Date
        </label>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {upcomingDays.map((day) => {
            const active = selectedDay.dateStr === day.dateStr;
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                  active
                    ? "border-brand-blue bg-brand-blue/10 text-foreground font-bold"
                    : "border-border bg-surface text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <span className="text-meta uppercase">{day.dayName}</span>
                <span className="text-small font-semibold text-foreground mt-0.5">{day.formatted}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Time Slot Selection */}
      <div>
        <label className="mb-3 block text-small font-medium text-foreground">
          4. Select Time Slot
        </label>
        <div className="flex flex-wrap gap-2.5">
          {TIME_SLOTS.map((slot) => {
            const active = selectedTime === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedTime(slot)}
                className={`rounded-full px-5 py-2 text-small font-medium transition-all ${
                  active
                    ? "bg-foreground text-background"
                    : "border border-border bg-surface text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Contact Details */}
      <div className="space-y-4 border-t border-border/60 pt-6">
        <label className="block text-small font-medium text-foreground">
          5. Confirm Attendee Details
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-label text-secondary-foreground">Your Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-label text-secondary-foreground">Work Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@company.com"
              className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-label text-secondary-foreground">Call Agenda / Project Summary</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Briefly describe what you'd like to cover on the call..."
            className="w-full rounded-xl border border-border bg-muted p-3 text-small text-foreground outline-none focus:border-brand-blue"
          />
        </div>
      </div>

      {errorMsg && <p className="text-small text-red-400">{errorMsg}</p>}

      <PremiumButton type="submit" disabled={submitting} className="w-full justify-center">
        {submitting ? "Reserving Slot..." : `Confirm Strategy Call for ${selectedDay.formatted} at ${selectedTime}`}
      </PremiumButton>
    </form>
  );
}
