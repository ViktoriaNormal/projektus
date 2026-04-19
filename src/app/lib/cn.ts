import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const touchAlways = "[@media(hover:none)]:opacity-100 [@media(hover:none)]:visible";
