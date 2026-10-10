import { useQuery } from "@tanstack/react-query";
import useAxiosInstance from "@/api";

export type StudentLesson = {
  _id?: string;
  id?: string;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  status?: string;
  teacher?: { fullName?: string } | null;
  subject?: { name?: string } | null;
  class?: { name?: string } | null;
  room?: { name?: string } | null;
};

export const STUDENT_WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

export const useStudentTimetable = () => {
  const axios = useAxiosInstance();
  return useQuery({
    queryKey: ["student", "timetable"],
    queryFn: async () => {
      const response = await axios.get("/lessons", { params: { page: 1, limit: 100 } });
      return (Array.isArray(response.data?.data) ? response.data.data : response.data?.data?.data ?? []) as StudentLesson[];
    },
    staleTime: 60_000,
    retry: 1,
  });
};

export const minutesOf = (value: string): number | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Yangon", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
};

export const formatTime = (minutes: number): string => {
  const date = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60));
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(date);
};

export const dayInYangon = (date = new Date()): string =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Yangon" }).format(date).toUpperCase();
