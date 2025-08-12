import React from 'react';
import { FiAward, FiDownload } from 'react-icons/fi';
import { formatPercentage } from '../utils/score';

export default function CertificateCard({ certificate, onDownload }) {
  const scoreLabel =
    certificate?.scorePercentage != null
      ? `${formatPercentage(certificate.scorePercentage)}%`
      : 'N/A';

  const dateLabel = certificate?.earnedDate
    ? new Date(certificate.earnedDate).toLocaleDateString()
    : 'N/A';

  return (
    <div
      style={{
        padding: '24px',
        borderRadius: '16px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: 'white',
          }}
        >
          <FiAward size={24} />
        </div>
        <div>
          <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '4px' }}>
            {certificate.examTitle}
          </h4>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            {certificate.categoryName}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#64748B' }}>Score:</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#15803D' }}>{scoreLabel}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#64748B' }}>Date:</span>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B' }}>{dateLabel}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: '#64748B' }}>Status:</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 8px',
              borderRadius: '12px',
              backgroundColor: '#DCFCE7',
              color: '#166534',
              textTransform: 'uppercase',
            }}
          >
            Earned
          </span>
        </div>
      </div>

      <button
        onClick={onDownload}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid #2563EB',
          borderRadius: '8px',
          background: 'transparent',
          color: '#2563EB',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <FiDownload size={14} />
        Download Certificate
      </button>
    </div>
  );
}