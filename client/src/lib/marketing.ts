// Public-facing contact configuration for the landing page.
//
// FACEBOOK_PAGE is the page's username as it appears in facebook.com/<name>
// and m.me/<name>. Per-car enquiries append ?ref=<car> so the Messenger
// conversation opens tagged with which vehicle the customer wants.
export const FACEBOOK_PAGE = "ECProRentalServices"; // TODO: confirm exact page handle

export const messengerLink = (ref?: string) =>
  `https://m.me/${FACEBOOK_PAGE}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;

export const facebookPageLink = () => `https://www.facebook.com/${FACEBOOK_PAGE}`;

export const carSlug = (name: string) =>
  name.toLowerCase().trim().replace(/\s+/g, "-");
