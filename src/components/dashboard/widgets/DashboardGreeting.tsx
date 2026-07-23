"use client";

import React from "react";

import { useRouter } from "next/navigation";

import { CalendarDays, Search } from "lucide-react";

interface DashboardGreetingProps {
  name: string;
}

export const DashboardGreeting = React.memo(function DashboardGreeting({ name }: DashboardGreetingProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  // Rendered on the client only: formatting a date during SSR and again on the
  // client produces a hydration mismatch whenever the two disagree on timezone.
  const [today, setToday] = React.useState<string | null>(null);
  React.useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }));
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/services?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Welcome back, {name} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSubmit} className="relative" role="search">
          <label htmlFor="dashboard-search" className="sr-only">
            Search services
          </label>
          <input
            id="dashboard-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by service ID, customer, or mobile…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm shadow-sm transition-all duration-200 placeholder:text-gray-400 hover:bg-gray-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-80"
          />
          <button type="submit" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
        </form>

        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 shadow-sm">
          <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
          <span className="whitespace-nowrap">{today ?? " "}</span>
        </div>
      </div>
    </div>
  );
});
