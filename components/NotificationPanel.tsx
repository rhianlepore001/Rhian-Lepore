import React from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { formatRelativeTimeInTimeZone, agendaPathForNotification } from '../utils/relativeTime';
import type { Alert, AppNotification } from '../contexts/AlertsContext';

export interface NotificationPanelProps {
  notifications: AppNotification[];
  alerts: Alert[];
  timeZone: string;
  now?: Date | number;
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
  onNavigate: (path: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  alerts,
  timeZone,
  now,
  onMarkRead,
  onMarkAll,
  onNavigate,
}) => {
  const { accent, colors } = useBrutalTheme();
  const hasUnread = notifications.some((item) => !item.read);
  const hasItems = notifications.length > 0 || alerts.length > 0;

  return (
    <div
      data-testid="notifications-panel"
      className={`fixed left-4 right-4 md:left-auto md:right-0 md:w-80 z-50 flex flex-col overflow-hidden
        top-[calc(var(--header-top,0px)+3.5rem+0.5rem)] md:absolute md:top-full md:mt-2
        max-h-[calc(100dvh-var(--header-top,0px)-3.5rem-6rem-var(--safe-bottom,0px)-1.25rem)]
        md:max-h-[min(28rem,70vh)]
        shadow-promax-glass ring-1 ring-[var(--color-border)]
        ${colors.card} border ${colors.border} rounded-xl`}
    >
      <div className={`p-3 border-b ${colors.divider} flex items-center justify-between gap-2 shrink-0`}>
        <div className={`font-bold ${colors.text} uppercase text-xs tracking-wider`}>
          Notificações
        </div>
        {hasUnread && (
          <button
            type="button"
            data-testid="mark-all-read"
            onClick={() => { onMarkAll(); }}
            className={`text-xs font-semibold ${accent.text} hover:underline min-h-[44px] px-1 shrink-0`}
          >
            Marcar todas como lidas
          </button>
        )}
      </div>
      <div className="overflow-y-auto min-h-0 flex-1">
        {!hasItems ? (
          <div className="p-4 text-center" data-testid="notifications-empty">
            <p className={`text-sm ${colors.text}`}>Nenhuma notificação nova</p>
          </div>
        ) : (
          <>
            {notifications.map((item) => {
              const unread = !item.read;
              return (
                <button
                  type="button"
                  key={item.id}
                  data-testid="bell-notification"
                  data-read={unread ? 'false' : 'true'}
                  onClick={() => {
                    if (unread) onMarkRead(item.id);
                    onNavigate(agendaPathForNotification(item));
                  }}
                  className={`w-full text-left p-3 border-b ${colors.divider} last:border-0 cursor-pointer transition-colors
                    ${unread ? `${accent.bgDim}` : 'opacity-60'}
                    hover:bg-[var(--color-card-hover)]`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {unread ? (
                      <span
                        data-testid="bell-unread-dot"
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${accent.bg}`}
                        aria-hidden
                      />
                    ) : (
                      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-transparent" aria-hidden />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        data-testid="bell-notification-message"
                        className={`text-sm leading-snug break-words ${unread ? colors.text : colors.textMuted}`}
                      >
                        {item.message || item.title}
                      </p>
                      <p
                        data-testid="bell-relative-time"
                        className={`text-xs mt-1 font-mono uppercase tracking-wide ${colors.textSecondary}`}
                      >
                        {formatRelativeTimeInTimeZone(item.created_at, timeZone, now)}
                      </p>
                    </div>
                    <Bell className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${unread ? accent.text : colors.textMuted}`} aria-hidden />
                  </div>
                </button>
              );
            })}
            {alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  if (alert.actionPath) onNavigate(alert.actionPath);
                }}
                className={`p-3 hover:bg-[var(--color-card-hover)] border-b ${colors.divider} last:border-0 cursor-pointer transition-colors group ${alert.actionPath ? '' : 'cursor-default'} ${alert.type === 'danger' ? 'border-l-2 border-l-[var(--color-danger)] pl-2' : ''}`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-[var(--color-danger)]' :
                    alert.type === 'warning' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug break-words ${colors.text} ${alert.actionPath ? 'group-hover:text-theme-accent' : ''} transition-colors`}>
                      {alert.text}
                    </p>
                    <p className={`text-xs ${colors.textSecondary} mt-1 uppercase tracking-wide`}>
                      {alert.type === 'danger' ? 'Urgente' : alert.type === 'warning' ? 'Atenção' : 'Info'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
