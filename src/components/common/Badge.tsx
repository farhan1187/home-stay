import React from 'react';
import { BookingStatus, UserRole } from '../../types';
import { BOOKING_STATUS_CONFIG, ROLE_COLORS, ROLE_LABELS } from '../../lib/constants';

interface StatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = BOOKING_STATUS_CONFIG[status] || BOOKING_STATUS_CONFIG.booked;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const colors = ROLE_COLORS[role] || ROLE_COLORS.manager;
  const label = ROLE_LABELS[role] || role;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {label}
    </span>
  );
};
