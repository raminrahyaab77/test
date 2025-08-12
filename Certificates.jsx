import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { examAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiAward, FiRefreshCw, FiEye, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';

// Helper to ensure the score is always a whole-number percentage
const toPercentage = (value) => {
  if (value === undefined || value === null) return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  // If returned as a fraction (e.g. 0.85), convert to percentage
  const percent = num <= 1 && num >= 0 ? num * 100 : num;
  return Math.round(percent);
};

const Certificates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Normalise certificate/attempt object to a common shape
  const normalise = (item) => ({
    id: item?.id ?? 'N/A',
    examTitle: item?.exam?.title ?? item?.examTitle ?? 'Unknown Exam',
    score: toPercentage(item?.score ?? item?.percentage),
    earnedDate: item?.earnedDate ?? item?.completedAt ?? item?.createdAt ?? 'N/A',
    categoryName: item?.exam?.examCategory?.name ?? item?.categoryName ?? 'Unknown Category',
  });

  /* ----------------------------- API QUERIES ----------------------------- */
  const {
    data: certificatesData,
    isLoading: certificatesLoading,
    error: certificatesError,
  } = useQuery({
    queryKey: ['userCertificates', currentPage, limit],
    queryFn: () => userAPI.getUserCertificates({ page: currentPage, limit }),
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  const {
    data: passedAttemptsData,
    isLoading: passedAttemptsLoading,
    error: passedAttemptsError,
  } = useQuery({
    queryKey: ['passedAttempts'],
    queryFn: () => examAPI.getUserExamHistory({ status: 'passed', limit: 100 }),
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  const certificates = certificatesData?.data?.data?.certificates?.map(normalise) ?? [];
  const passedAttempts = passedAttemptsData?.data?.data?.attempts?.map(normalise) ?? [];

  /* ----------------------------- MUTATIONS ------------------------------ */
  const generateCertificateMutation = useMutation({
    mutationFn: (attemptId) => examAPI.generateCertificate(attemptId),
    onSuccess: () => {
      toast.success('Certificate generated successfully!');
      queryClient.invalidateQueries(['userCertificates']);
      queryClient.invalidateQueries(['passedAttempts']);
    },
    onError: (err) => {
      console.error('Generate certificate error:', err);
      toast.error(err.response?.data?.message ?? 'Failed to generate certificate');
    },
  });

  const autoGenerateCertificatesMutation = useMutation({
    mutationFn: () => examAPI.autoGenerateCertificates(),
    onSuccess: (data) => {
      toast.success(data.data?.message ?? 'Certificates auto-generated successfully!');
      queryClient.invalidateQueries(['userCertificates']);
      queryClient.invalidateQueries(['passedAttempts']);
    },
    onError: (err) => {
      console.error('Auto-generate certificates error:', err);
      toast.error(err.response?.data?.message ?? 'Failed to auto-generate certificates');
    },
  });

  /* ------------------------- HANDLERS & HELPERS ------------------------- */
  const handleViewCertificate = (cert) => {
    const certificate = normalise(cert);

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Background & border
      doc.setFillColor(248, 249, 250).rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
      doc.setDrawColor(21, 101, 192).setLineWidth(1).rect(15, 15, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 30);

      // Header
      doc.setFontSize(28).setTextColor(21, 101, 192).setFont('helvetica', 'bold');
      doc.text('CERTIFICATE OF ACHIEVEMENT', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

      // Recipient
      doc.setFontSize(18).setTextColor(0, 0, 0);
      doc.text('This certificate is awarded to', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
      doc.setFontSize(28).setTextColor(21, 101, 192);
      doc.text(user?.fullName ?? 'User', doc.internal.pageSize.getWidth() / 2, 65, { align: 'center' });

      // Exam details
      doc.setFontSize(16).setTextColor(0, 0, 0);
      doc.text(`For successfully completing the ${certificate.examTitle} examination`, doc.internal.pageSize.getWidth() / 2, 80, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`with a score of ${certificate.score}%`, doc.internal.pageSize.getWidth() / 2, 90, { align: 'center' });
      doc.text(`on ${new Date(certificate.earnedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, doc.internal.pageSize.getWidth() / 2, 100, { align: 'center' });

      // Signatures & ID
      doc.setFontSize(12);
      doc.text('________________________', 40, 130);
      doc.text('Exam Administrator', 40, 137);
      doc.text('________________________', doc.internal.pageSize.getWidth() - 90, 130);
      doc.text('Date', doc.internal.pageSize.getWidth() - 90, 137);
      doc.setFontSize(10).setTextColor(100, 100, 100);
      doc.text(`Certificate ID: ${certificate.id}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

      doc.save(`certificate_${certificate.id}.pdf`);
      toast.success('Certificate downloaded successfully!');
    } catch (err) {
      console.error('Certificate generation error:', err);
      toast.error('Failed to generate certificate');
    }
  };

  const handleGenerateCertificate = async (attemptId) => {
    try {
      await generateCertificateMutation.mutateAsync(attemptId);
    } catch (_) {}
  };

  const handleAutoGenerateAll = async () => {
    try {
      await autoGenerateCertificatesMutation.mutateAsync();
    } catch (_) {}
  };

  const handlePageChange = (p) => setCurrentPage(p);

  /* ----------------------------- RENDERING ------------------------------ */
  const isLoading = certificatesLoading || passedAttemptsLoading;
  const totalPages = Math.ceil((certificatesData?.data?.data?.total ?? 0) / limit);

  if (certificatesError || passedAttemptsError) {
    return (
      <div className="error-container">
        <h3>Error loading certificates</h3>
        <p>Failed to load certificate data. Please try again later.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      {/* ... existing code (omitted for brevity, identical to the user's provided UI) ... */}
    </div>
  );
};

export default Certificates;