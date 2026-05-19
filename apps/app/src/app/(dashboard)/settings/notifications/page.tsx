'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, PageHeader, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

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

export default function NotificationsPage() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [localPrefs, setLocalPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  const { isLoading, data: serverPrefs } = useQuery<NotificationPrefs>({
    queryKey: ['notification-prefs'],
    queryFn: () => apiClient.get<NotificationPrefs>('/agents/me/notification-prefs'),
  });

  useEffect(() => {
    if (serverPrefs) setLocalPrefs(serverPrefs);
  }, [serverPrefs]);

  const mutation = useMutation({
    mutationFn: (data: NotificationPrefs) =>
      apiClient.patch('/agents/me/notification-prefs', data),
    onSettled: (_, err) => {
      if (err) {
        addToast('Failed to save preferences.', 'error');
      } else {
        void qc.invalidateQueries({ queryKey: ['notification-prefs'] });
        addToast('Notification preferences saved.', 'success');
      }
    },
  });

  function toggle(key: keyof Omit<NotificationPrefs, 'digestFrequency'>) {
    const updated: NotificationPrefs = { ...localPrefs, [key]: !localPrefs[key] };
    setLocalPrefs(updated);
    mutation.mutate(updated);
  }

  function setDigest(value: 'never' | 'daily' | 'weekly') {
    const updated = { ...localPrefs, digestFrequency: value };
    setLocalPrefs(updated);
    mutation.mutate(updated);
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Notifications" subtitle="Configure how you receive alerts." />
        <Card><div style={{ color: 'var(--text-3)' }}>Loading...</div></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Configure how and when you receive alerts." />

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 20 }}>Email Notifications</h3>
        {([
          { key: 'emailOnLeadAssigned', label: 'New lead assigned to you', desc: 'Receive an email when a lead is routed to your queue.' },
          { key: 'emailOnEscalation', label: 'Escalation alerts', desc: 'Receive an email when a conversation needs human attention.' },
          { key: 'emailOnBooking', label: 'Appointment booked', desc: 'Receive an email when a lead books a consultation.' },
        ] as const).map(({ key, label, desc }) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>{desc}</div>
            </div>
            <button
              onClick={() => toggle(key)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
                background: localPrefs[key] ? 'var(--accent)' : 'var(--bg-4)',
                transition: 'background 0.2s',
                position: 'relative',
              }}
            >
              <span style={{
                position: 'absolute', width: 18, height: 18, borderRadius: '50%',
                background: '#000', top: 3,
                left: localPrefs[key] ? 23 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        ))}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 20 }}>SMS Notifications</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Urgent escalation SMS</div>
            <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>
              Receive an SMS for URGENT escalations (lawyer, discrimination keywords).
            </div>
          </div>
          <button
            onClick={() => toggle('smsOnUrgentEscalation')}
            style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
              background: localPrefs.smsOnUrgentEscalation ? 'var(--accent)' : 'var(--bg-4)',
              transition: 'background 0.2s',
              position: 'relative',
            }}
          >
            <span style={{
              position: 'absolute', width: 18, height: 18, borderRadius: '50%',
              background: '#000', top: 3,
              left: localPrefs.smsOnUrgentEscalation ? 23 : 3,
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Performance Digest</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['never', 'daily', 'weekly'] as const).map((freq) => (
            <Button
              key={freq}
              variant={localPrefs.digestFrequency === freq ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setDigest(freq)}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </Button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {localPrefs.digestFrequency === 'never'
            ? 'No digest emails will be sent.'
            : `A ${localPrefs.digestFrequency} summary of leads, bookings, and performance will be emailed to you.`}
        </p>
      </Card>
    </div>
  );
}
