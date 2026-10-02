import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine et fusionne proprement les classes Tailwind CSS
 * sans doublons ni conflits de spécificité.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
