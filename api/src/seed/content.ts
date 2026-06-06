import type { TicketPriority } from '../db/schema/index.js';

export interface Scenario {
  subject: string;
  priority: TicketPriority;
  tags: string[];
  opening: string;
  reply: string;
  followUp?: string;
  closing?: string;
  note?: string;
}

export const AGENTS = [
  { name: 'Alex Rivera', email: 'agent@example.com', password: 'agent-password' },
  { name: 'Priya Shah', email: 'priya@example.com', password: 'agent-password' },
  { name: 'Tom Becker', email: 'tom@example.com', password: 'agent-password' },
];

export const CUSTOMERS = [
  { name: 'Casey Morgan', email: 'customer@example.com', password: 'customer-password' },
  { name: 'Jordan Lee', email: 'jordan.lee@northwind.test' },
  { name: 'Maria Gonzalez', email: 'maria@lumen-bakery.test' },
  { name: 'Samuel Okafor', email: 'sam.okafor@okafor-legal.test' },
  { name: 'Hannah Fischer', email: 'h.fischer@alpenrad.test' },
  { name: 'Wei Chen', email: 'wei.chen@harbourlight.test' },
  { name: 'Olivia Brown', email: 'olivia@brownandco.test' },
  { name: 'Lucas Martin', email: 'lucas.martin@atelier-m.test' },
  { name: 'Aisha Rahman', email: 'aisha@greenleaf-dental.test' },
  { name: 'Noah Williams', email: 'noah@williams-plumbing.test' },
  { name: 'Emma Johansson', email: 'emma.j@fjordtravel.test' },
  { name: 'Diego Alvarez', email: 'diego@cafe-alvarez.test' },
];

export const CANNED_RESPONSES = [
  {
    title: 'Greeting',
    body: 'Hi {{customer.first_name}},\n\nThanks for getting in touch about "{{ticket.subject}}". ',
  },
  {
    title: 'Need more details',
    body:
      'Hi {{customer.first_name}},\n\nThanks for the report. Could you send us a screenshot of ' +
      'what you are seeing and the approximate time it happened? That will help us track it ' +
      'down quickly.\n\nBest,\n{{agent.first_name}}',
  },
  {
    title: 'Password reset steps',
    body:
      'Hi {{customer.first_name}},\n\nYou can reset your password from the sign-in page with ' +
      '"Forgot password". The link in the email is valid for 30 minutes. If it does not arrive, ' +
      'check your spam folder and let us know.\n\nBest,\n{{agent.first_name}}',
  },
  {
    title: 'Escalated to engineering',
    body:
      'Hi {{customer.first_name}},\n\nI have passed this on to our engineering team with all ' +
      'the details you sent. I will update ticket #{{ticket.id}} as soon as I hear back.\n\n' +
      'Best,\n{{agent.name}}',
  },
  {
    title: 'Refund issued',
    body:
      'Hi {{customer.first_name}},\n\nI have issued the refund. It usually shows up on your ' +
      'statement within 5-10 business days.\n\nBest,\n{{agent.first_name}}',
  },
  {
    title: 'Closing - no reply',
    body:
      'Hi {{customer.first_name}},\n\nWe have not heard back for a few days, so I will mark ' +
      'this as solved. Just reply to this ticket if you still need help and it will reopen.\n\n' +
      'Best,\n{{agent.first_name}}',
  },
];

export const SCENARIOS: Scenario[] = [
  {
    subject: 'Cannot log in after changing my email address',
    priority: 'high',
    tags: ['login', 'account'],
    opening:
      'I updated the email on my account yesterday and now I cannot sign in with either the old ' +
      'or the new address. The reset link never arrives.',
    reply:
      'Thanks for flagging this. I can see the email change went through but the confirmation ' +
      'step was not completed. I have confirmed it manually, so please try signing in with the ' +
      'new address and a password reset.',
    followUp: 'That worked, I am back in. Thank you!',
    closing: 'Great to hear. I will mark this as solved.',
  },
  {
    subject: 'Charged twice for the March invoice',
    priority: 'high',
    tags: ['billing', 'refund'],
    opening:
      'Our card statement shows two charges of 49.00 for invoice INV-2291. Could you refund the ' +
      'duplicate please?',
    reply:
      'You are right, the payment provider retried a charge that had already succeeded. I have ' +
      'refunded the second charge; it should show up within 5-10 business days.',
    note: 'Payment provider retry bug again. Logged with finance, third case this month.',
    closing: 'Refund confirmed on our side as well. Closing this one out.',
  },
  {
    subject: 'CSV export is missing the last column',
    priority: 'normal',
    tags: ['export', 'bug'],
    opening:
      'When I export the customer list to CSV the "Notes" column is empty for every row, even ' +
      'though the notes show up fine in the app.',
    reply:
      'Thanks for the clear report. I could reproduce it: notes with line breaks break the ' +
      'export. Our developers are on it. As a workaround, the Excel export includes the notes.',
    note: 'Reproduced on staging. Engineering issue opened, linked in #support-eng.',
    followUp: 'The Excel export works for now, thanks. Please let me know when CSV is fixed.',
  },
  {
    subject: 'How do I add a second user to our account?',
    priority: 'low',
    tags: ['how-to', 'account'],
    opening:
      'We hired a new office manager and want to give her access. Is that possible on the Basic ' +
      'plan?',
    reply:
      'Yes, the Basic plan includes up to three users. Go to Settings > Team, click "Invite" and ' +
      'enter her email address. She will get an invitation to set her own password.',
    closing: 'Let us know if anything else comes up!',
  },
  {
    subject: 'Website is down - customers cannot book appointments',
    priority: 'urgent',
    tags: ['outage', 'booking'],
    opening:
      'Our booking page shows "Service unavailable" since about 8am. This is costing us ' +
      'appointments, please help as soon as possible.',
    reply:
      'We are seeing elevated errors on the booking service and the team is working on it right ' +
      'now. I will update you here as soon as it is resolved.',
    note: 'Part of the 08:00 incident. Status page updated. Ping when the fix is deployed.',
    followUp: 'Still seeing errors on mobile, desktop seems fine now.',
    closing: 'The fix for mobile is out as well. Sorry again for the disruption.',
  },
  {
    subject: 'Invoice address needs to be updated',
    priority: 'low',
    tags: ['billing'],
    opening:
      'We moved offices. Can you change the address on our invoices to 14 Harbour Street, ' +
      'Suite 3?',
    reply:
      'Done. The new address will appear on all invoices from the next billing cycle. If you need ' +
      'the last invoice reissued, just let me know.',
  },
  {
    subject: 'Reminder emails go out in the wrong time zone',
    priority: 'normal',
    tags: ['notifications', 'bug'],
    opening:
      'Appointment reminders say 3pm when the appointment is at 2pm. I think it started after ' +
      'the clocks changed.',
    reply:
      'Thanks, that is a daylight saving issue on our side. Could you confirm the time zone set ' +
      'under Settings > Business profile? I want to rule out a configuration problem first.',
    followUp: 'It says Europe/London, which is correct.',
    closing:
      'Thanks for confirming. A fix went out this morning and reminders now use the right ' +
      'offset.',
  },
  {
    subject: 'Request: dark mode for the dashboard',
    priority: 'low',
    tags: ['feature-request'],
    opening: 'Not a bug, just a wish: a dark theme would be great for those of us working late.',
    reply:
      'Thanks for the suggestion! I have added your vote to the dark mode request. I cannot ' +
      'promise a date yet, but it is on the list for this year.',
  },
  {
    subject: 'Integration with our calendar stopped syncing',
    priority: 'high',
    tags: ['integrations', 'calendar'],
    opening:
      'New bookings are no longer showing up in Google Calendar. Last one that synced was on ' +
      'Friday.',
    reply:
      'It looks like the calendar connection was revoked, which can happen after a password ' +
      'change on the Google side. Please reconnect under Settings > Integrations and let me ' +
      'know if the missing bookings come through.',
    followUp: 'Reconnected, but the bookings from the weekend are still missing.',
    note: 'Backfill only covers 24h. Asked engineering to run a manual resync for this account.',
  },
  {
    subject: 'Can we get a copy of our data?',
    priority: 'normal',
    tags: ['data-export', 'account'],
    opening:
      'For our annual audit we need a full export of our records. What is the best way to get ' +
      'that?',
    reply:
      'You can request a full export under Settings > Data. It usually takes a few minutes and ' +
      'you will get an email with a download link that is valid for 7 days.',
    closing: 'I will mark this as solved, but feel free to reply if the export gives you trouble.',
  },
  {
    subject: 'Discount code not accepted at checkout',
    priority: 'normal',
    tags: ['billing', 'promo'],
    opening: 'The code SPRING25 from your newsletter says "invalid" when I try to upgrade.',
    reply:
      'Sorry about that, the code was set up for monthly plans only. I have applied the discount ' +
      'to your annual upgrade manually, so you can go ahead.',
  },
  {
    subject: 'Two-factor codes not arriving by SMS',
    priority: 'high',
    tags: ['login', '2fa'],
    opening:
      'I am not receiving the SMS code when I sign in. My phone number is correct. I am locked out.',
    reply:
      'Some carriers have been delaying our SMS messages today. I have sent a one-time backup ' +
      'code to your email address so you can sign in. I would also recommend switching to an ' +
      'authenticator app.',
    followUp: 'Got in with the backup code. I will set up the app, thanks.',
  },
  {
    subject: 'Slow loading on the reports page',
    priority: 'normal',
    tags: ['performance', 'reports'],
    opening:
      'The monthly report takes more than a minute to load and sometimes times out completely.',
    reply:
      'Thanks. Large date ranges are slow at the moment; we are working on caching. Until then, ' +
      'running the report one quarter at a time is much quicker.',
    note: 'Account has ~180k bookings. Performance work tracked in the reports epic.',
  },
  {
    subject: 'Cancel our subscription at the end of the term',
    priority: 'normal',
    tags: ['billing', 'cancellation'],
    opening:
      'We are closing the shop at the end of the month. Please cancel our subscription so we ' +
      'are not charged again.',
    reply:
      'I am sorry to hear that. I have scheduled the cancellation for the end of your current ' +
      'term, so you will not be charged again. Your data stays available for 30 days after that.',
    closing: 'All the best with what comes next.',
  },
  {
    subject: 'Question about the new pricing',
    priority: 'low',
    tags: ['billing', 'pricing'],
    opening: 'Does the price change in the announcement email apply to existing customers?',
    reply:
      'Existing annual plans keep their current price until renewal. Monthly plans move to the ' +
      'new price from the first invoice after the change date.',
  },
  {
    subject: 'Embedded booking widget not showing on our website',
    priority: 'normal',
    tags: ['booking', 'widget'],
    opening: 'I pasted the embed code into our website builder but the widget area stays blank.',
    reply:
      'Some website builders strip script tags from custom HTML blocks. Could you send me the ' +
      'URL of the page so I can take a look?',
    followUp: 'Sure, it is the "Book now" page on our site. The builder is Squarely.',
    note: 'Squarely needs the iframe variant. Sent the docs link.',
  },
  {
    subject: 'Staff member left - remove their access',
    priority: 'high',
    tags: ['account', 'security'],
    opening: 'One of our employees left today. Please make sure they can no longer log in.',
    reply:
      'I have deactivated their user and signed them out of all devices. You can also do this ' +
      'yourself under Settings > Team at any time.',
  },
  {
    subject: 'GDPR data processing agreement',
    priority: 'normal',
    tags: ['legal', 'gdpr'],
    opening: 'Our lawyer is asking for a signed DPA. Where can we get one?',
    reply:
      'You can download our standard DPA, already signed on our side, from Settings > Legal. If ' +
      'your lawyer needs changes, reply here and I will loop in our legal team.',
  },
];

/** A few replies customers send when tickets are reopened or chased. */
export const CHASERS = [
  'Any update on this?',
  'Just following up, we are still seeing the problem.',
  'Hi, is there any news? This is blocking us.',
];
