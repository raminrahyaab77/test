import React from 'react';
import { FiAward, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const formatDate = (date) => {
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

const generatePdfCertificate = (certificate, recipientName) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Background
    doc.setFillColor(248, 249, 250);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

    // Border
    doc.setDrawColor(21, 101, 192);
    doc.setLineWidth(1);
    doc.rect(15, 15, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 30);

    // Header
    doc.setFontSize(28);
    doc.setTextColor(21, 101, 192);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF ACHIEVEMENT', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

    // Decorative dots
    doc.setFillColor(21, 101, 192);
    doc.circle(25, 25, 8, 'F');
    doc.circle(doc.internal.pageSize.getWidth() - 25, 25, 8, 'F');
    doc.circle(25, doc.internal.pageSize.getHeight() - 25, 8, 'F');
    doc.circle(doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 25, 8, 'F');

    // Recipient
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('This certificate is awarded to', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });

    doc.setFontSize(28);
    doc.setTextColor(21, 101, 192);
    doc.text(recipientName || 'User', doc.internal.pageSize.getWidth() / 2, 65, { align: 'center' });

    // Exam details
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`For successfully completing the ${certificate.examTitle} examination`, doc.internal.pageSize.getWidth() / 2, 80, { align: 'center' });

    doc.setFontSize(14);
    doc.text(`with a score of ${certificate.scorePercentage}%`, doc.internal.pageSize.getWidth() / 2, 90, { align: 'center' });

    const displayDate = formatDate(certificate.earnedDate);
    doc.text(`on ${displayDate}`, doc.internal.pageSize.getWidth() / 2, 100, { align: 'center' });

    // Signatures
    doc.setFontSize(12);
    doc.text('________________________', 40, 130);
    doc.text('Exam Administrator', 40, 137);

    doc.text('________________________', doc.internal.pageSize.getWidth() - 90, 130);
    doc.text('Date', doc.internal.pageSize.getWidth() - 90, 137);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Certificate ID: ${certificate.id}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

    doc.save(`certificate_${certificate.id}.pdf`);
    toast.success('Certificate downloaded successfully!');
  } catch (error) {
    console.error('Certificate generation error:', error);
    toast.error('Failed to generate certificate');
  }
};

const CertificateCard = ({ certificate, recipientName }) => {
  return (
    <div style={{
      padding: '24px',
      borderRadius: '16px',
      backgroundColor: '#F8FAFC',
      border: '1px solid #E2E8F0',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: 'white'
        }}>
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
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#15803D' }}>
            {certificate.scorePercentage}%
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#64748B' }}>Date:</span>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B' }}>
            {formatDate(certificate.earnedDate)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: '#64748B' }}>Status:</span>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            padding: '4px 8px',
            borderRadius: '12px',
            backgroundColor: '#DCFCE7',
            color: '#166534',
            textTransform: 'uppercase'
          }}>
            Earned
          </span>
        </div>
      </div>

      <button
        onClick={() => generatePdfCertificate(certificate, recipientName)}
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
          gap: '6px'
        }}
      >
        <FiDownload size={14} />
        Download Certificate
      </button>
    </div>
  );
};

export default CertificateCard;