import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { examAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiAward, FiRefreshCw, FiEye, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';

const Certificates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Normalize certificate data structure and ensure proper score formatting
  const normalizeCertificateData = (certificate) => {
    // Extract score/percentage and ensure it's a number
    let score = certificate?.score || certificate?.percentage || 0;
    
    // If score is a string, try to parse it
    if (typeof score === 'string') {
      score = parseFloat(score.replace('%', ''));
    }
    
    // Ensure score is a valid number
    if (isNaN(score)) {
      score = 0;
    }
    
    // Round to 1 decimal place for display
    score = Math.round(score * 10) / 10;

    return {
      id: certificate?.id || 'N/A',
      examTitle: certificate?.exam?.title || certificate?.examTitle || 'Unknown Exam',
      score: score, // This will be a number (e.g., 85.5)
      earnedDate: certificate?.earnedDate || certificate?.completedAt || certificate?.createdAt || 'N/A',
      categoryName: certificate?.exam?.examCategory?.name || certificate?.categoryName || 'Unknown Category'
    };
  };

  // Fetch user certificates
  const {
    data: certificatesData,
    isLoading: certificatesLoading,
    error: certificatesError,
    refetch: refetchCertificates
  } = useQuery({
    queryKey: ['userCertificates', currentPage, limit],
    queryFn: () => userAPI.getUserCertificates({
      page: currentPage,
      limit
    }),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Fetch passed attempts for certificate generation
  const {
    data: passedAttemptsData,
    isLoading: passedAttemptsLoading,
    error: passedAttemptsError
  } = useQuery({
    queryKey: ['passedAttempts'],
    queryFn: () => examAPI.getUserExamHistory({
      status: 'passed',
      limit: 100
    }),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Extract and normalize data from API responses
  const certificates = certificatesData?.data?.data?.certificates?.map(normalizeCertificateData) || [];
  const passedAttempts = passedAttemptsData?.data?.data?.attempts?.map(normalizeCertificateData) || [];
  
  // Console log the percentage scores for debugging
  console.log('=== CERTIFICATE PERCENTAGE SCORES ===');
  certificates.forEach(cert => {
    console.log(`Certificate: ${cert.examTitle} - Score: ${cert.score}% (Type: ${typeof cert.score})`);
  });
  
  console.log('=== PASSED ATTEMPTS PERCENTAGE SCORES ===');
  passedAttempts.forEach(attempt => {
    console.log(`Attempt: ${attempt.examTitle} - Score: ${attempt.score}% (Type: ${typeof attempt.score})`);
  });

  // Generate certificate mutation
  const generateCertificateMutation = useMutation({
    mutationFn: (attemptId) => examAPI.generateCertificate(attemptId),
    onSuccess: (data) => {
      toast.success('Certificate generated successfully!');
      queryClient.invalidateQueries(['userCertificates']);
      queryClient.invalidateQueries(['passedAttempts']);
    },
    onError: (error) => {
      console.error('Generate certificate error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate certificate');
    }
  });

  // Auto-generate certificates mutation
  const autoGenerateCertificatesMutation = useMutation({
    mutationFn: () => examAPI.autoGenerateCertificates(),
    onSuccess: (data) => {
      toast.success(data.data?.message || 'Certificates auto-generated successfully!');
      queryClient.invalidateQueries(['userCertificates']);
      queryClient.invalidateQueries(['passedAttempts']);
    },
    onError: (error) => {
      console.error('Auto-generate certificates error:', error);
      toast.error(error.response?.data?.message || 'Failed to auto-generate certificates');
    }
  });

  // Handle view/generate PDF certificate
  const handleViewCertificate = (cert) => {
    const certificate = normalizeCertificateData(cert);
    
    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Add certificate background
      doc.setFillColor(248, 249, 250);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

      // Add decorative border
      doc.setDrawColor(21, 101, 192);
      doc.setLineWidth(1);
      doc.rect(15, 15, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 30);

      // Add header
      doc.setFontSize(28);
      doc.setTextColor(21, 101, 192);
      doc.setFont('helvetica', 'bold');
      doc.text('CERTIFICATE OF ACHIEVEMENT', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

      // Add decorative elements
      doc.setFillColor(21, 101, 192);
      doc.circle(25, 25, 8, 'F');
      doc.circle(doc.internal.pageSize.getWidth() - 25, 25, 8, 'F');
      doc.circle(25, doc.internal.pageSize.getHeight() - 25, 8, 'F');
      doc.circle(doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 25, 8, 'F');

      // Add recipient information
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('This certificate is awarded to', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
      
      doc.setFontSize(28);
      doc.setTextColor(21, 101, 192);
      doc.text(user?.fullName || 'User', doc.internal.pageSize.getWidth() / 2, 65, { align: 'center' });

      // Add exam details with proper score formatting
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`For successfully completing the ${certificate.examTitle} examination`, 
        doc.internal.pageSize.getWidth() / 2, 80, { align: 'center' });
      
      doc.setFontSize(14);
      // Format score properly - ensure it shows as percentage
      const formattedScore = certificate.score % 1 === 0 ? certificate.score.toString() : certificate.score.toFixed(1);
      doc.text(`with a score of ${formattedScore}%`, 
        doc.internal.pageSize.getWidth() / 2, 90, { align: 'center' });
      
      doc.text(`on ${new Date(certificate.earnedDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, doc.internal.pageSize.getWidth() / 2, 100, { align: 'center' });

      // Add signature lines
      doc.setFontSize(12);
      doc.text('________________________', 40, 130);
      doc.text('Exam Administrator', 40, 137);
      
      doc.text('________________________', doc.internal.pageSize.getWidth() - 90, 130);
      doc.text('Date', doc.internal.pageSize.getWidth() - 90, 137);

      // Add certificate ID
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Certificate ID: ${certificate.id}`, 
        doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

      // Save the PDF with a more descriptive filename
      const fileName = `certificate_${certificate.examTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${certificate.id}.pdf`;
      doc.save(fileName);
      
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Certificate generation error:', error);
      toast.error('Failed to generate certificate');
    }
  };

  // Handle generate certificate for a specific attempt
  const handleGenerateCertificate = async (attemptId) => {
    try {
      await generateCertificateMutation.mutateAsync(attemptId);
    } catch (error) {
      console.error('Generate certificate error:', error);
    }
  };

  // Handle auto-generate all certificates
  const handleAutoGenerateAll = async () => {
    try {
      await autoGenerateCertificatesMutation.mutateAsync();
    } catch (error) {
      console.error('Auto-generate all error:', error);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Calculate total pages
  const totalPages = Math.ceil((certificatesData?.data?.data?.total || 0) / limit);

  // Format score for display - ensures consistent percentage display
  const formatScore = (score) => {
    if (typeof score === 'number') {
      return score % 1 === 0 ? `${score}%` : `${score.toFixed(1)}%`;
    }
    return `${score}%`;
  };

  // Handle errors
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

  const isLoading = certificatesLoading || passedAttemptsLoading;

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
        borderRadius: '24px',
        padding: '40px',
        marginBottom: '40px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px' }}>
            My Certificates
          </h1>
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
                cursor: autoGenerateCertificatesMutation.isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: autoGenerateCertificatesMutation.isPending ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (!autoGenerateCertificatesMutation.isPending) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
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

      {/* Certificates Grid */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '40px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#1E293B', marginBottom: '24px' }}>
          Earned Certificates
        </h3>
        
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                padding: '24px',
                borderRadius: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ color: '#94A3B8' }}>Loading...</div>
              </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {certificates.map((certificate) => (
              <div key={certificate.id} style={{
                padding: '24px',
                borderRadius: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
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
                      {formatScore(certificate.score)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Date:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B' }}>
                      {new Date(certificate.earnedDate).toLocaleDateString()}
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
                  onClick={() => handleViewCertificate(certificate)}
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
                  onMouseOver={(e) => {
                    e.target.style.background = '#2563EB';
                    e.target.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#2563EB';
                  }}
                >
                  <FiDownload size={14} />
                  Download Certificate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificate Generation Section */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#1E293B', marginBottom: '24px' }}>
          Generate Certificates
        </h3>
        
        <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '24px' }}>
          Generate certificates for exams you've passed but haven't received certificates for yet.
        </p>
        
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[1, 2].map(i => (
              <div key={i} style={{
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                height: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ color: '#94A3B8' }}>Loading...</div>
              </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {passedAttempts.map((attempt) => (
              <div key={attempt.id} style={{
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1E293B', marginBottom: '12px' }}>
                  {attempt.examTitle}
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Category:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B' }}>
                      {attempt.categoryName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Score:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#15803D' }}>
                      {formatScore(attempt.score)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#64748B' }}>Date:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B' }}>
                      {new Date(attempt.earnedDate).toLocaleDateString()}
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
                    cursor: generateCertificateMutation.isPending ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: generateCertificateMutation.isPending ? 0.7 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!generateCertificateMutation.isPending) {
                      e.target.style.background = '#15803D';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!generateCertificateMutation.isPending) {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#15803D';
                    }
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '32px'
        }}>
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
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              if (currentPage !== 1) {
                e.target.style.background = '#F8FAFC';
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== 1) {
                e.target.style.background = 'white';
              }
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
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                if (currentPage !== page) {
                  e.target.style.background = '#F8FAFC';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== page) {
                  e.target.style.background = 'white';
                }
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
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.background = '#F8FAFC';
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.background = 'white';
              }
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Certificates;