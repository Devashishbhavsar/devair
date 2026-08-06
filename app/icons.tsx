import type { SVGProps } from "react";

/**
 * Decorative inline icons (Design-System: "icons or field affordances").
 * Stroke-based, inherit currentColor so they pick up text-muted / text-brand
 * tokens from the calling component. No icon dependency required.
 */

function baseSvg(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

/** Departing plane (mirrored paper plane). */
export function PlaneDepartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseSvg(props)}>
      <path d="M2 2l11 11" />
      <path d="M2 2l7 20 4-9 9-4Z" />
    </svg>
  );
}

/** Arriving plane. */
export function PlaneArriveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseSvg(props)}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </svg>
  );
}

/** Calendar. */
export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseSvg(props)}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Travelers. */
export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseSvg(props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Filter (airline). */
export function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseSvg(props)}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

/** Magnifier (search / lookup). */
export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseSvg(props)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Alert triangle. */
export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseSvg(props)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/** Check mark. */
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseSvg(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
