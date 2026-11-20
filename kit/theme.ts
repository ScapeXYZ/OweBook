import { defineTheme } from "@hyper-elements/react";
export const ink = "#162842";
export const paper = "#ffffff";
export const rule = "#c4d9ec";
export const margin = "#ad3445";
export const fills = ["#edf5fc", "#fff3d8", "#fce9df", "#f5dfe7"] as const;
export const theme = defineTheme({
  colors: { background: paper, foreground: ink, primary: ink, border: rule },
  fonts: { body: "Lato, Arial, sans-serif", heading: "Lato, Arial, sans-serif" }
});
export const label = { fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" } as const;
export const ruled = { width: 1, style: "solid", color: rule } as const;
export const redLine = { width: 2, style: "solid", color: margin } as const;
export const tierLabels = { none: "Current", friendly: "1–7 days", overdue_notice: "8–30 days", contact_us: "31+ days" };
