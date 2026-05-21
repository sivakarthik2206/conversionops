'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import { SettingsNav } from '@/components/layout/SettingsNav';

interface NotificationPrefs {
  emailOnLeadAssigned: boolean;
  emailOnEscalation: boolean;
  emailOnBooking: boolean;
  smsOnUrgentEscalation: boolean;
  digestFrequency: 'never' | 'daily' | 'weekly';
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailOnLeadAssigned: true,
  emailOnEscalation: true,
  emailOnBooking: true,
  smsOnUrgentEscalation: false,
  digestFrequency: 'daily',
};

const EMAIL_PREFS = [
  { key: 'emailOnLeadAssigned' as const, label: 'Lead assigned',       desc: 'When a lead is routed to your queue.',                  icon: 'user' as const,    color: 'var(--blue)' },
  { key: 'emailOnEscalation' as const,   label: 'Escalation alert',     desc: 'When a conversation needs human attention.',           icon: 'bolt' as const,    color: 'var(--amber)' },
  { key: 'emailOnBooking' as const,      label: 'Appointment booked',   desc: 'When a lead books a consultation through the AI.',     icon: 'calendar' as const, color: 'var(--green)' },
];

export default function NotificationsPage() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  const { isLoading, data: serverPrefs } = useQuery<NotificationPrefs>({
    queryKey: ['notification-prefs'],
    queryFn: () => apiClient.get<NotificationPrefs>('/agents/me/notification-prefs'),
  });

  useEffect(() => { if (serverPrefs) setPrefs(serverPrefs); }, [serverPrefs]);

  const mutation = useMutation({
    mutationFn: (data: NotificationPrefs) => apiClient.patch('/agents/me/notification-prefs', data),
    onSettled: (_, err) => {
      if (err) addToast('Failed to save', 'error');
      else {
        void qc.invalidateQueries({ queryKey: ['notification-prefs'] });
        addToast('Preferences saved', 'success');
      }
    },
  });

  function toggle(key: keyof Omit<NotificationPrefs, 'digestFrequency'>) {
    const updated: NotificationPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    mutation.mutate(updated);
  }

  function setDigest(value: 'never' | 'daily' | 'weekly') {
    const updated = { ...prefs, digestFrequency: value };
    setPrefs(updated);
    mutation.mutate(updated);
  }

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      <SettingsNav />

      <div style={{ flex: 1, maxWidth: 680 }}>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Settings · Notifications</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Notifications
          </h1>
        </div>

        {isLoading ? (
          <div style={{ padding: 28, color: 'var(--text-3)', fontSize: 13 }}>Loading preferences&hellip;</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div className="surface-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Icon name="mail" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Email</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {EMAIL_PREFS.map((p, i) => (
                  <ToggleRow
                    key={p.key}
                    icon={p.icon}
                    color={p.color}
                    label={p.label}
                    desc={p.desc}
                    value={prefs[p.key]}
                    onChange={() => toggle(p.key)}
                    isLast={i === EMAIL_PREFS.length - 1}
                  />
                ))}
              </div>
            </div>

            {/* SMS */}
            <div className="surface-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Icon name="phone" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>SMS</h3>
              </div>
              <ToggleRow
                icon="shield"
                color="var(--red)"
                label="Urgent escalation"
                desc="Get an SMS for URGENT escalations (lawyer, discrimination, threats)."
                value={prefs.smsOnUrgentEscalation}
                onChange={() => toggle('smsOnUrgentEscalation')}
                isLast
              />
            </div>

            {/* Digest */}
            <div className="surface-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon name="chart" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Performance digest</h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 14px' }}>
                A summary of leads, bookings, and conversion performance.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {(['never', 'daily', 'weekly'] as const).map(freq => {
                  const active = prefs.digestFrequency === freq;
                  return (
                    <button
                      key={freq}
                      onClick={() => setDigest(freq)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: active ? 'rgba(232,255,71,0.10)' : 'var(--bg-3)',
                        border: '1px solid',
                        borderColor: active ? 'var(--accent)' : 'var(--border)',
                        color: active ? 'var(--accent)' : 'var(--text-2)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize',
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.04em',
                      }}
                    >
                      {freq}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  icon, color, label, desc, value, onChange, isLast,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  color: string;
  label: string;
  desc: string;
  value: boolean;
  onChange: () => void;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: `${color}14`,
          border: `1px solid ${color}33`,
          color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={13} stroke={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
      <button
        onClick={onChange}
        aria-label={value ? `Disable ${label}` : `Enable ${label}`}
        style={{
          width: 38,
          height: 22,
          borderRadius: 100,
          border: 'none',
          background: value ? 'var(--accent)' : 'var(--bg-4)',
          boxShadow: value ? '0 0 12px rgba(232,255,71,0.30)' : 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: value ? '#0a0a0b' : 'var(--text-3)',
            transition: 'left 0.25s var(--ease-out-quart)',
            left: value ? 18 : 2,
          }}
        />
      </button>
    </div>
  );
}
