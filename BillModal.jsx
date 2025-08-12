import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { billingAPI, paymentAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FiPrinter,
  FiDownload,
  FiX,
  FiCheck,
  FiClock,
  FiUser,
  FiMail,
  FiBook,
  FiTag,
  FiClock as FiDuration,
  FiAward,
  FiCalendar,
  FiDollarSign,
  FiPercent,
  FiHome,
  FiMapPin,
  FiPhone,
  FiInfo,
  FiCreditCard
} from 'react-icons/fi';
import { FaRegCheckCircle, FaRegClock, FaReceipt } from 'react-icons/fa';
import { createPortal } from 'react-dom';

const BillModal = ({ bill, onClose, onPrint }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  if (!bill) return null;

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount ?? 0);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePrint = async () => {
    try {
      setIsProcessing(true);

      const bookingId = bill?.booking?.id;
      if (!bookingId) {
        toast.error('Invalid booking ID');
        return;
      }

      const response = await paymentAPI.processPaymentOnPrint(bookingId);

      if (response?.data?.success) {
        if (response.data.data?.bill) {
          Object.assign(bill, response.data.data.bill);
        } else {
          bill.status = 'PAID';
          bill.payment = {
            method: 'CASH',
            paidAt: new Date().toISOString()
          };
        }
      }

      // Wait a tick so the print-only container is rendered before invoking print
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.print();

      queryClient.invalidateQueries(['user-bookings']);
      queryClient.invalidateQueries(['admin-bookings']);

      const message = response?.data?.message || 'Payment processed and bill printed successfully!';
      toast.success(message);

      if (onPrint) onPrint();
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => { // ensure axios requests blobs
    try {
      // If your billingAPI allows passing responseType per-call, prefer that.
      if (billingAPI?.setResponseType) {
        billingAPI.setResponseType('blob');
      }
    } catch {}

    try {
      setIsProcessing(true);

      if (!bill?.booking?.id) {
        toast.error('Invalid booking ID');
        return;
      }

      if (bill.status !== 'PAID' && bill.status !== 'COMPLETED') {
        toast.error('Bill must be paid or completed before downloading');
        return;
      }

      const response = await billingAPI.downloadBill(bill.booking.id);

      // Support both Axios response types: arraybuffer/blob or data payload
      const fileData = response?.data ?? response;

      if (fileData) {
        const contentType = (response?.headers?.['content-type']) || 'application/pdf';
        const blob = fileData instanceof Blob ? fileData : new Blob([fileData], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `bill-${bill.billNumber || bill.booking.id}.pdf`);
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);

        toast.success('Bill downloaded successfully');
      } else {
        toast.error('No file data received from server');
      }
    } catch (error) {
      console.error('Download error details:', error);

      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 400:
            toast.error(data?.message || 'Bill not ready for download. Please ensure payment is completed.');
            break;
          case 404:
            toast.error('Bill not found. Please contact support.');
            break;
          case 401:
            toast.error('Authentication required. Please login again.');
            break;
          case 403:
            toast.error("Access denied. You don't have permission to download this bill.");
            break;
          default:
            toast.error(`Download failed: ${data?.message || 'Server error'}`);
        }
      } else if (error.request) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const StatusPill = () => (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        bill.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {bill.status === 'PAID' ? 'Paid' : 'Pending'}
    </span>
  );

  const InvoiceBody = () => (
    <div className="p-6">
      {/* Bill Header (company + invoice meta) */}
      <div className="flex flex-col md:flex-row justify-between mb-8">
        <div className="mb-6 md:mb-0">
          <div className="flex items-center mb-3">
            <FiHome className="text-indigo-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-800">Mock Exam System</h3>
          </div>
          <div className="space-y-1 text-gray-600">
            <p className="flex items-center">
              <FiMapPin className="mr-2 opacity-70" />
              123 Education Street
            </p>
            <p className="flex items-center">
              <span className="inline-block w-5"></span>
              Learning City, LC 12345
            </p>
            <p className="flex items-center">
              <FiMail className="mr-2 opacity-70" />
              contact@mockexam.com
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-end text-indigo-600 font-medium">
            <FiInfo className="mr-2" />
            <span>INVOICE</span>
          </div>
          <div className="flex items-center justify-end text-gray-600">
            <FiTag className="mr-2 opacity-70" />
            <span>Bill #: {bill.billNumber}</span>
          </div>
          <div className="flex items-center justify-end text-gray-600">
            <FiCalendar className="mr-2 opacity-70" />
            <span>Date: {formatDate(bill.billDate)}</span>
          </div>
          <div className="flex items-center justify-end text-gray-600">
            <FiClock className="mr-2 opacity-70" />
            <span>Due: {formatDate(bill.dueDate)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6"></div>

      {/* Customer Info */}
      <div className="mb-8">
        <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-3">
          <FiUser className="text-indigo-600 mr-2" />
          Bill To:
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center text-gray-800 font-medium mb-1">
            <FiUser className="mr-2 text-gray-500" />
            {bill.customer?.name}
          </div>
          <div className="flex items-center text-gray-600">
            <FiMail className="mr-2 text-gray-500" />
            {bill.customer?.email}
          </div>
        </div>
      </div>

      {/* Exam Details */}
      <div className="mb-8">
        <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-3">
          <FiBook className="text-indigo-600 mr-2" />
          Exam Details:
        </h4>
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <FiBook className="mr-2" />
              Exam Title
            </div>
            <div className="font-medium text-gray-800 ml-5">
              {bill.exam?.title}
            </div>
          </div>
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <FiTag className="mr-2" />
              Category
            </div>
            <div className="font-medium text-gray-800 ml-5">
              {bill.exam?.category}
            </div>
          </div>
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <FiDuration className="mr-2" />
              Duration
            </div>
            <div className="font-medium text-gray-800 ml-5">
              {bill.exam?.duration} minutes
            </div>
          </div>
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <FiAward className="mr-2" />
              Total Marks
            </div>
            <div className="font-medium text-gray-800 ml-5">
              {bill.exam?.totalMarks}
            </div>
          </div>
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <FiCalendar className="mr-2" />
              Booking Date & Time
            </div>
            <div className="font-medium text-gray-800 ml-5">
              {bill?.booking?.scheduledAt
                ? new Date(bill.booking.scheduledAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : ''}
            </div>
          </div>
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <FiInfo className="mr-2" />
              Status
            </div>
            <div className="font-medium text-gray-800 ml-5">
              {bill?.booking?.status}
            </div>
          </div>
        </div>
      </div>

      {/* Amount Details */}
      <div className="mb-8">
        <h4 className="flex items-center text-lg font-semibold text-gray-800 mb-3">
          <FiDollarSign className="text-indigo-600 mr-2" />
          Payment Summary:
        </h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  <div className="flex items-center">
                    <FiCreditCard className="mr-2" />
                    Description
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3">
                  <div className="flex items-center text-gray-800">
                    <FiBook className="mr-2 text-gray-500" />
                    {bill.exam?.title} - Exam Fee
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-800">
                  {formatCurrency(bill?.amount?.subtotal, bill?.amount?.currency)}
                </td>
              </tr>
              {bill?.amount?.tax > 0 && (
                <tr>
                  <td className="px-4 py-3">
                    <div className="flex items-center text-gray-800">
                      <FiPercent className="mr-2 text-gray-500" />
                      Tax
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    {formatCurrency(bill?.amount?.tax, bill?.amount?.currency)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-indigo-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-indigo-800">
                  <div className="flex items-center">
                    <FiDollarSign className="mr-2" />
                    Total
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-indigo-800">
                  {formatCurrency(bill?.amount?.total, bill?.amount?.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Status */}
      <div
        className={`p-4 rounded-lg mb-6 ${
          bill.status === 'PAID'
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}
      >
        <div className="flex items-center">
          {bill.status === 'PAID' ? (
            <FaRegCheckCircle className="text-green-600 mr-3" size={18} />
          ) : (
            <FaRegClock className="text-amber-600 mr-3" size={18} />
          )}
          <div>
            <div className="font-medium text-gray-800">
              {bill.status === 'PAID' ? 'Payment Successful' : 'Payment Pending'}
            </div>
            {bill.payment && (
              <div className="text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center">
                  <FiCreditCard className="mr-1.5" />
                  Method: {bill.payment.method || 'Not specified'}
                </span>
                {bill.payment.paidAt && (
                  <span className="flex items-center">
                    <FiCalendar className="mr-1.5" />
                    Paid on: {formatDate(bill.payment.paidAt)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 text-center text-gray-500">
        <p className="flex items-center justify-center mb-2">
          <FiCheck className="mr-2 text-green-500" />
          Thank you for choosing Mock Exam System!
        </p>
        <p className="flex items-center justify-center">
          <FiPhone className="mr-2" />
          For any questions, please contact us at support@mockexam.com
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Local print CSS fallback to work even if Tailwind print: variant isn't available */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          html, body { background: #fff !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>

      {/* Screen-only modal with actions */}
      <div className="fixed inset-0 bg-gray-900/50 bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden no-print">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
          {/* Header with actions (hidden in print) */}
          <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FaReceipt className="text-indigo-600 text-2xl" />
              <h2 className="text-2xl font-bold text-gray-800">Invoice</h2>
              <StatusPill />
            </div>
            {/* Actions container (Download/Print/Close) */}
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={handlePrint} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <FiClock style={{ marginRight: 8 }} /> Processing...
                  </>
                ) : (
                  <>
                    <FiPrinter style={{ marginRight: 8 }} /> Print
                  </>
                )}
              </button>
              <button className="btn btn-primary" onClick={handleDownload}>
                <FiDownload style={{ marginRight: 8 }} /> Download
              </button>
              <button className="btn btn-outline" onClick={onClose}>
                <FiX />
              </button>
            </div>
          </div>

          {/* Invoice content */}
          <InvoiceBody />
        </div>
      </div>

      {/* Print-only clean container (no buttons, no overlay). Rendered via portal to avoid hidden ancestors */}
      {typeof window !== 'undefined' && createPortal(
        <div className="print-only">
          <div className="bg-white w-full">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaReceipt className="text-indigo-600 text-2xl" />
                <h2 className="text-2xl font-bold text-gray-800">Invoice</h2>
                <StatusPill />
              </div>
            </div>
            <InvoiceBody />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BillModal;