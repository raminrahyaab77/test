import jsPDF from 'jspdf';

export function generateCertificatePDF({ certificate, userFullName }) {
  const examTitle = certificate.examTitle || 'Unknown Exam';
  const score = (certificate.score !== undefined && certificate.score !== null)
    ? `${certificate.score}%`
    : 'N/A';
  const earnedDateSafe = certificate.earnedDate
    ? new Date(certificate.earnedDate)
    : null;
  const earnedDateText = earnedDateSafe && !isNaN(earnedDateSafe)
    ? earnedDateSafe.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';
  const idText = certificate.id || 'N/A';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(248, 249, 250);
  doc.rect(0, 0, width, height, 'F');

  // Border
  doc.setDrawColor(21, 101, 192);
  doc.setLineWidth(1);
  doc.rect(15, 15, width - 30, height - 30);

  // Header
  doc.setFontSize(28);
  doc.setTextColor(21, 101, 192);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF ACHIEVEMENT', width / 2, 30, { align: 'center' });

  // Decorative elements
  doc.setFillColor(21, 101, 192);
  doc.circle(25, 25, 8, 'F');
  doc.circle(width - 25, 25, 8, 'F');
  doc.circle(25, height - 25, 8, 'F');
  doc.circle(width - 25, height - 25, 8, 'F');

  // Recipient
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('This certificate is awarded to', width / 2, 50, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(21, 101, 192);
  doc.text(userFullName || 'User', width / 2, 65, { align: 'center' });

  // Details
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`For successfully completing the ${examTitle} examination`, width / 2, 80, { align: 'center' });

  doc.setFontSize(14);
  doc.text(`with a score of ${score}`, width / 2, 90, { align: 'center' });

  doc.text(`on ${earnedDateText}`, width / 2, 100, { align: 'center' });

  // Signature lines
  doc.setFontSize(12);
  doc.text('________________________', 40, 130);
  doc.text('Exam Administrator', 40, 137);

  doc.text('________________________', width - 90, 130);
  doc.text('Date', width - 90, 137);

  // Certificate ID
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Certificate ID: ${idText}`, width / 2, height - 15, { align: 'center' });

  // Save
  doc.save(`certificate_${idText}.pdf`);
}