/**
 * Static title for each dashboard route, longest path matched first so
 * `/leads/123` resolves to "Lead" rather than the `/leads` list title.
 */
const TITLES: Array<[string, string]> = [
  ['/conversations/', 'Conversation'],
  ['/leads/', 'Lead'],
  ['/settings/ai', 'AI configuration'],
  ['/settings/billing', 'Billing'],
  ['/settings/notifications', 'Notification settings'],
  ['/settings/phone', 'Phone'],
  ['/settings/workspace', 'Workspace settings'],
  ['/leads', 'Leads'],
  ['/conversations', 'Conversations'],
  ['/integrations', 'Integrations'],
  ['/agents', 'Team'],
  ['/audit-log', 'Audit log'],
  ['/notifications', 'Notifications'],
  ['/queue', 'Queue inspector'],
  ['/routing', 'Routing'],
  ['/analytics', 'Analytics'],
  ['/appointments', 'Appointments'],
  ['/ai-playground', 'AI playground'],
  ['/onboarding', 'Onboarding'],
];

export function pageTitleFor(pathname: string): string {
  for (const [prefix, title] of TITLES) {
    if (pathname.startsWith(prefix)) return title;
  }
  return 'Overview';
}
