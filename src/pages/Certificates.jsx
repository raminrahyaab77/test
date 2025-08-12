import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { examAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiAward, FiRefreshCw } from 'react-icons/fi';
import CertificateCard from '../components/CertificateCard';
import { generateCertificatePDF } from '../utils/certificatePdf';
import { normalizeCertificateData, formatPercentage } from '../utils/score';

export default function Certificates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const {
    data: certificatesData,
    isLoading: certificatesLoading,
    error: certificatesError,
  } = useQuery({
    queryKey: ['userCertificates', currentPage, limit],
    queryFn: () =>
      userAPI.getUserCertificates({
        page: currentPage,
        limit,
      }),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const {
    data: passedAttemptsData,
    isLoading: passedAttemptsLoading,
    error: passedAttemptsError,
  } = useQuery({
    queryKey: ['passedAttempts'],
    queryFn: () => examAPI.getUserExamHistory({ status: 'passed', limit: 100 }),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const certificates =
    certificatesData?.data?.data?.certificates?.map(normalizeCertificateData) || [];
  const passedAttempts =
    passedAttemptsData?.data?.data?.attempts?.map(normalizeCertificateData) || [];

  // Console normalized percentage values
  // These logs help verify that score normalization behaves as expected
  // e.g., 0.85 -> 85, '92' -> 92, '92%' -> 92
  // eslint-disable-next-line no-console
  console.log('=== CERTIFICATE PERCENTAGE SCORES (normalized) ===');
  certificates.forEach((cert) => {
    // eslint-disable-next-line no-console
    console.log(
      `Certificate: ${cert.examTitle} - Score: ${
        cert.scorePercentage != null ? formatPercentage(cert.scorePercentage) : 'N/A'
      }%`
    );
  });
  // eslint-disable-next-line no-console
  console.log('=== PASSED ATTEMPTS PERCENTAGE SCORES (normalized) ===');
  passedAttempts.forEach((attempt) => {
    // eslint-disable-next-line no-console
    console.log(
      `Attempt: ${attempt.examTitle} - Score: ${
        attempt.scorePercentage != null
          ? formatPercentage(attempt.scorePercentage)
          : 'N/A'
      }%`
    );
  });

  const generateCertificateMutation = useMutation({
    mutationFn: (attemptId) => examAPI.generateCertificate(attemptId),
    onSuccess: () => {
      toast.success('Certificate generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['userCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['passedAttempts'] });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('Generate certificate error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate certificate');
    },
  });

  const autoGenerateCertificatesMutation = useMutation({
    mutationFn: () => examAPI.autoGenerateCertificates(),
    onSuccess: (data) => {
      toast.success(data.data?.message || 'Certificates auto-generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['userCertificates'] });
      queryClient.invalidateQueries({ queryKey: ['passedAttempts'] });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('Auto-generate certificates error:', error);
      toast.error(error.response?.data?.message || 'Failed to auto-generate certificates');
    },
  });

  const handleViewCertificate = (cert) => {
    const normalized = normalizeCertificateData(cert);
    try {
      generateCertificatePDF({ certificate: normalized, userFullName: user?.fullName });
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Certificate generation error:', error);
      toast.error('Failed to generate certificate');
    }
  };

  const handleGenerateCertificate = async (attemptId) => {
    try {
      await generateCertificateMutation.mutateAsync(attemptId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Generate certificate error:', error);
    }
  };

  const handleAutoGenerateAll = async () => {
    try {
      await autoGenerateCertificatesMutation.mutateAsync();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auto-generate all error:', error);
    }
  };

  const handlePageChange = (newPage) => setCurrentPage(newPage);
  const totalPages = Math.ceil((certificatesData?.data?.data?.total || 0) / limit);
  const isLoading = certificatesLoading || passedAttemptsLoading;

  if (certificatesError || passedAttemptsError) {
    return (
      <div className="error-container">
        <h3>Error loading certificates</h3>
        <p>Failed to load certificate data. Please try again later.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
          borderRadius: '24px',
          padding: '40px',
          marginBottom: '40px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px' }}>My Certificates</h1>
          <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '24px' }}>
            View and manage your earned certificates from completed exams
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={handleAutoGenerateAll}
              disabled={autoGenerateCertificatesMutation.isPending}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {autoGenerateCertificatesMutation.isPending ? (
                <>
                  <FiRefreshCw size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FiAward size={16} />
                  Auto-Generate All
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '40px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#1E293B', marginBottom: '24px' }}>
          Earned Certificates
        </h3>

        {isLoading ? (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  height: '200px',
                }}
              />
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <FiAward size={48} style={{ color: '#94A3B8' }} />
            </div>
            <h3>No certificates found</h3>
            <p>You haven't earned any certificates yet. Complete exams to earn your first certificate!</p>
          </div>
        ) : (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}
          >
            {certificates.map((certificate) => (
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                onDownload={() => handleViewCertificate(certificate)}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#1E293B', marginBottom: '24px' }}>
          Generate Certificates
        </h3>

        <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '24px' }}>
          Generate certificates for exams you've passed but haven't received certificates for yet.
        </p>

        {isLoading ? (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}
          >
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  height: '180px',
                }}
              />
            ))}
          </div>
        ) : passedAttempts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <FiAward size={48} style={{ color: '#94A3B8' }} />
            </div>
            <h3>No passed exams found</h3>
            <p>You need to pass an exam to be eligible for a certificate.</p>
          </div>
        ) : (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}
          >
            {passedAttempts.map((attempt) => (
              <div
                key={attempt.id}
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  transition: 'all 0.3s ease',
                }}
              >
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1E293B', marginBottom: '12px' }}>
                  {attempt.examTitle}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Category:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#15803D' }}>
                      {attempt.categoryName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Score:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#15803D' }}>
                      {attempt.scorePercentage != null
                        ? `${formatPercentage(attempt.scorePercentage)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Date:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B' }}>
                      {attempt.earnedDate ? new Date(attempt.earnedDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateCertificate(attempt.id)}
                  disabled={generateCertificateMutation.isPending}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #15803D',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: '#15803D',
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
                  {generateCertificateMutation.isPending ? (
                    <>
                      <FiRefreshCw size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FiAward size={14} />
                      Generate Certificate
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '32px' }}
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 16px',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              background: currentPage === 1 ? '#F1F5F9' : 'white',
              color: currentPage === 1 ? '#94A3B8' : '#64748B',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              style={{
                padding: '8px 16px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                background: currentPage === page ? '#2563EB' : 'white',
                color: currentPage === page ? 'white' : '#64748B',
                cursor: 'pointer',
              }}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 16px',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              background: currentPage === totalPages ? '#F1F5F9' : 'white',
              color: currentPage === totalPages ? '#94A3B8' : '#64748B',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}