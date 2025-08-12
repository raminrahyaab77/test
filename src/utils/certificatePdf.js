import jsPDF from 'jspdf';
import { formatPercentage } from './score';

export function generateCertificatePDF({ certificate, userFullName }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(248, 249, 250);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Border
  doc.setDrawColor(21, 101, 192);
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Header
  doc.setFontSize(28);
  doc.setTextColor(21, 101, 192);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF ACHIEVEMENT', pageWidth / 2, 30, { align: 'center' });

  // Decorative
  doc.setFillColor(21, 101, 192);
  doc.circle(25, 25, 8, 'F');
  doc.circle(pageWidth - 25, 25, 8, 'F');
  doc.circle(25, pageHeight - 25, 8, 'F');
  doc.circle(pageWidth - 25, pageHeight - 25, 8, 'F');

  // Recipient
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('This certificate is awarded to', pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(21, 101, 192);
  doc.text(userFullName || 'User', pageWidth / 2, 65, { align: 'center' });

  // Details
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `For successfully completing the ${certificate.examTitle} examination`,
    pageWidth / 2,
    80,
    { align: 'center' }
  );

  const scoreLabel = certificate.scorePercentage != null
    ? `${formatPercentage(certificate.scorePercentage)}%`
    : 'N/A';
  doc.setFontSize(14);
  doc.text(`with a score of ${scoreLabel}`, pageWidth / 2, 90, { align: 'center' });

  const dateStr = certificate.earnedDate
    ? new Date(certificate.earnedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';
  doc.text(`on ${dateStr}`, pageWidth / 2, 100, { align: 'center' });

  // Signatures
  doc.setFontSize(12);
  doc.text('________________________', 40, 130);
  doc.text('Exam Administrator', 40, 137);

  doc.text('________________________', pageWidth - 90, 130);
  doc.text('Date', pageWidth - 90, 137);

  // Footer / ID
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Certificate ID: ${certificate.id}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );

  doc.save(`certificate_${certificate.id}.pdf`);
}