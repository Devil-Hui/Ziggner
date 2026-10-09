import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Teach tailwind-merge about the custom design tokens declared in @theme,
 * otherwise `text-body` is mistaken for a text *color* and gets dropped
 * when merged with `text-ink` / `text-white`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "caption", "body-sm", "body", "body-lg", "title"],
      radius: ["card", "img", "chip"],
      shadow: ["pill", "card", "float", "violet"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
