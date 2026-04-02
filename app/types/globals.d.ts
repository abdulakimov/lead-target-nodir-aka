export {};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    __trackMetaLead?: (eventId: string) => void;
  }
}
