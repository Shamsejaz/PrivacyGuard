import React, { useState } from 'react';
import { Download, Filter, Calendar, BarChart3, PieChart, TrendingUp, FileText, Shield, Users, Database } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [reportType, setReportType] = useState('compliance');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Mock data for charts
  const complianceData = {
    labels: ['GDPR', 'CCPA', 'HIPAA', 'PDPL', 'PIPEDA'],
    datasets: [
      {
        label: 'Compliance Score',
        data: [87, 92, 78, 85, 90],
        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)'],
        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)', 'rgba(255, 206, 86, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'],
        borderWidth: 1,
      },
    ],
  };

  const dsarData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Access Requests',
        data: [12, 19, 15, 17, 22, 24],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
      {
        label: 'Deletion Requests',
        data: [8, 12, 10, 9, 14, 17],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
      {
        label: 'Rectification Requests',
        data: [5, 7, 4, 6, 8, 9],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  const riskTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Overall Risk Score',
        data: [78, 75, 72, 68, 65, 62],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
      },
      {
        label: 'GDPR Risk',
        data: [82, 80, 76, 72, 70, 68],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
      },
      {
        label: 'CCPA Risk',
        data: [75, 73, 70, 68, 65, 62],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const dataSourcesData = {
    labels: ['Databases', 'Cloud Storage', 'File Systems', 'SaaS Applications'],
    datasets: [
      {
        label: 'PII Records (thousands)',
        data: [245, 180, 120, 310],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Mock data for tables
  const complianceTable = [
    { regulation: 'GDPR', score: '87%', status: 'Compliant', lastAssessment: '2024-06-15', nextReview: '2024-09-15' },
    { regulation: 'CCPA', score: '92%', status: 'Compliant', lastAssessment: '2024-06-10', nextReview: '2024-09-10' },
    { regulation: 'HIPAA', score: '78%', status: 'Needs Attention', lastAssessment: '2024-06-05', nextReview: '2024-07-05' },
    { regulation: 'PDPL', score: '85%', status: 'Compliant', lastAssessment: '2024-06-01', nextReview: '2024-09-01' },
    { regulation: 'PIPEDA', score: '90%', status: 'Compliant', lastAssessment: '2024-05-28', nextReview: '2024-08-28' },
  ];

  const dsarTable = [
    { month: 'January', access: 12, deletion: 8, rectification: 5, total: 25, avgResponseTime: '18 days' },
    { month: 'February', access: 19, deletion: 12, rectification: 7, total: 38, avgResponseTime: '17 days' },
    { month: 'March', access: 15, deletion: 10, rectification: 4, total: 29, avgResponseTime: '15 days' },
    { month: 'April', access: 17, deletion: 9, rectification: 6, total: 32, avgResponseTime: '14 days' },
    { month: 'May', access: 22, deletion: 14, rectification: 8, total: 44, avgResponseTime: '12 days' },
    { month: 'June', access: 24, deletion: 17, rectification: 9, total: 50, avgResponseTime: '10 days' },
  ];

  const riskTable = [
    { category: 'Overall', current: '62%', previous: '65%', change: '-3%', trend: 'Improving' },
    { category: 'GDPR', current: '68%', previous: '70%', change: '-2%', trend: 'Improving' },
    { category: 'CCPA', current: '62%', previous: '65%', change: '-3%', trend: 'Improving' },
    { category: 'Data Security', current: '58%', previous: '63%', change: '-5%', trend: 'Improving' },
    { category: 'Vendor Risk', current: '72%', previous: '75%', change: '-3%', trend: 'Improving' },
  ];

  const dataSourcesTable = [
    { type: 'Databases', count: 12, records: '245K', piiDensity: '32%', riskLevel: 'Medium' },
    { type: 'Cloud Storage', count: 8, records: '180K', piiDensity: '28%', riskLevel: 'Medium' },
    { type: 'File Systems', count: 15, records: '120K', piiDensity: '18%', riskLevel: 'Low' },
    { type: 'SaaS Applications', count: 10, records: '310K', piiDensity: '45%', riskLevel: 'High' },
  ];

  // Generate PDF report
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Create new PDF document
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Add header
      doc.setFontSize(22);
      doc.setTextColor(0, 51, 153);
      doc.text('PrivacyGuard AI', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, pageWidth / 2, 30, { align: 'center' });
      
      // Add date range
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const dateRangeText = dateRange === '30d' ? 'Last 30 Days' : 
                           dateRange === '90d' ? 'Last 90 Days' : 
                           dateRange === '6m' ? 'Last 6 Months' : 'Last 12 Months';
      doc.text(`Report Period: ${dateRangeText}`, pageWidth / 2, 38, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 43, { align: 'center' });
      
      // Add executive summary
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Executive Summary', 14, 55);
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const summaryText = reportType === 'compliance' 
        ? 'This report provides an overview of the organization\'s compliance status across multiple privacy regulations. Overall compliance score has improved by 3% in the last quarter, with GDPR and CCPA showing the most significant improvements.'
        : reportType === 'dsar' 
        ? 'This report summarizes Data Subject Access Request (DSAR) activities. The organization has processed 218 requests in the last 6 months, with a 28% increase in volume and a 44% improvement in response time.'
        : reportType === 'risk' 
        ? 'This report presents the organization\'s privacy risk assessment. Overall risk score has decreased by 3% in the last quarter, indicating improved privacy posture. Data security shows the most significant improvement with a 5% risk reduction.'
        : 'This report provides an analysis of personal data across all data sources. The organization manages 855K records containing personal data across 45 data sources, with SaaS applications showing the highest PII density at 45%.';
      
      const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 28);
      doc.text(splitSummary, 14, 62);
      
      // Add key metrics
      doc.setFontSize(14);
      doc.text('Key Metrics', 14, 85);
      
      // Add table based on report type
      doc.setFontSize(10);
      if (reportType === 'compliance') {
        autoTable(doc, {
          head: [['Regulation', 'Score', 'Status', 'Last Assessment', 'Next Review']],
          body: complianceTable.map(row => [
            row.regulation,
            row.score,
            row.status,
            row.lastAssessment,
            row.nextReview
          ]),
          startY: 90,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 153], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });
      } else if (reportType === 'dsar') {
        autoTable(doc, {
          head: [['Month', 'Access', 'Deletion', 'Rectification', 'Total', 'Avg Response Time']],
          body: dsarTable.map(row => [
            row.month,
            row.access.toString(),
            row.deletion.toString(),
            row.rectification.toString(),
            row.total.toString(),
            row.avgResponseTime
          ]),
          startY: 90,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 153], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });
      } else if (reportType === 'risk') {
        autoTable(doc, {
          head: [['Risk Category', 'Current Score', 'Previous Score', 'Change', 'Trend']],
          body: riskTable.map(row => [
            row.category,
            row.current,
            row.previous,
            row.change,
            row.trend
          ]),
          startY: 90,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 153], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });
      } else {
        autoTable(doc, {
          head: [['Data Source Type', 'Count', 'Records', 'PII Density', 'Risk Level']],
          body: dataSourcesTable.map(row => [
            row.type,
            row.count.toString(),
            row.records,
            row.piiDensity,
            row.riskLevel
          ]),
          startY: 90,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 153], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });
      }
      
      // Get the Y position after the table
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      
      // Add chart
      const chartRef = document.getElementById('report-chart');
      if (chartRef) {
        const canvas = await html2canvas(chartRef);
        const imgData = canvas.toDataURL('image/png');
        
        // Add chart title
        doc.setFontSize(14);
        doc.text('Visualization', 14, finalY + 15);
        
        // Add chart image
        const imgWidth = pageWidth - 28;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', 14, finalY + 20, imgWidth, imgHeight);
        
        // Add new page if chart is too big
        if (finalY + 20 + imgHeight > pageHeight - 20) {
          doc.addPage();
        }
      }
      
      // Add recommendations
      const recommendationsY = chartRef ? finalY + 130 : finalY + 20;
      
      // Check if we need a new page
      if (recommendationsY > pageHeight - 60) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Recommendations', 14, 20);
        
        doc.setFontSize(10);
        const recommendations = reportType === 'compliance' 
          ? [
              'Update HIPAA compliance measures to address the 78% score',
              'Schedule quarterly compliance reviews for all regulations',
              'Implement automated compliance monitoring for real-time alerts'
            ]
          : reportType === 'dsar' 
          ? [
              'Continue optimizing DSAR response workflow to maintain improvement trend',
              'Implement additional automation for common request types',
              'Conduct staff training on handling complex DSAR cases'
            ]
          : reportType === 'risk' 
          ? [
              'Focus on further reducing vendor risk which remains highest at 72%',
              'Continue data security improvements which show strongest positive trend',
              'Implement additional encryption for high-risk data assets'
            ]
          : [
              'Prioritize SaaS applications for data minimization due to high PII density',
              'Implement additional controls for cloud storage containing sensitive data',
              'Consider data retention policy updates for file systems'
            ];
        
        let yPos = 30;
        recommendations.forEach((rec, index) => {
          doc.text(`${index + 1}. ${rec}`, 14, yPos);
          yPos += 8;
        });
      } else {
        doc.setFontSize(14);
        doc.text('Recommendations', 14, recommendationsY);
        
        doc.setFontSize(10);
        const recommendations = reportType === 'compliance' 
          ? [
              'Update HIPAA compliance measures to address the 78% score',
              'Schedule quarterly compliance reviews for all regulations',
              'Implement automated compliance monitoring for real-time alerts'
            ]
          : reportType === 'dsar' 
          ? [
              'Continue optimizing DSAR response workflow to maintain improvement trend',
              'Implement additional automation for common request types',
              'Conduct staff training on handling complex DSAR cases'
            ]
          : reportType === 'risk' 
          ? [
              'Focus on further reducing vendor risk which remains highest at 72%',
              'Continue data security improvements which show strongest positive trend',
              'Implement additional encryption for high-risk data assets'
            ]
          : [
              'Prioritize SaaS applications for data minimization due to high PII density',
              'Implement additional controls for cloud storage containing sensitive data',
              'Consider data retention policy updates for file systems'
            ];
        
        let yPos = recommendationsY + 10;
        recommendations.forEach((rec, index) => {
          doc.text(`${index + 1}. ${rec}`, 14, yPos);
          yPos += 8;
        });
      }
      
      // Add footer
      const footerText = 'CONFIDENTIAL - For Executive Review Only';
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`PrivacyGuard AI - ${new Date().toLocaleDateString()}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      doc.text('Page 1', 14, pageHeight - 10);
      
      // Save the PDF
      doc.save(`PrivacyGuard_${reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600 mt-1">Comprehensive privacy compliance analytics and executive reporting</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={generatePDF}
            disabled={isGeneratingPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? 'Generating PDF...' : 'Export PDF Report'}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Report Configuration</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="compliance">Compliance Report</option>
                <option value="dsar">DSAR Activity Report</option>
                <option value="risk">Risk Assessment Report</option>
                <option value="datasources">Data Sources Report</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {reportType === 'compliance' && (
            <>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overall Score</p>
                    <p className="text-2xl font-bold text-green-600">86%</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Compliant</p>
                    <p className="text-2xl font-bold text-blue-600">4/5</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Improvement</p>
                    <p className="text-2xl font-bold text-teal-600">+3%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-teal-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Next Review</p>
                    <p className="text-2xl font-bold text-purple-600">15d</p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </Card>
            </>
          )}

          {reportType === 'dsar' && (
            <>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold text-blue-600">218</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                    <p className="text-2xl font-bold text-green-600">14d</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Volume Trend</p>
                    <p className="text-2xl font-bold text-orange-600">+28%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-purple-600">98%</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </Card>
            </>
          )}

          {reportType === 'risk' && (
            <>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overall Risk</p>
                    <p className="text-2xl font-bold text-green-600">62%</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Risk Reduction</p>
                    <p className="text-2xl font-bold text-blue-600">-3%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600 transform rotate-180" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Risk Areas</p>
                    <p className="text-2xl font-bold text-orange-600">2</p>
                  </div>
                  <Shield className="h-8 w-8 text-orange-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Vulnerabilities</p>
                    <p className="text-2xl font-bold text-purple-600">12</p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
              </Card>
            </>
          )}

          {reportType === 'datasources' && (
            <>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Sources</p>
                    <p className="text-2xl font-bold text-blue-600">45</p>
                  </div>
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-green-600">855K</p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">PII Records</p>
                    <p className="text-2xl font-bold text-orange-600">312K</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Risk Sources</p>
                    <p className="text-2xl font-bold text-red-600">8</p>
                  </div>
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {reportType === 'compliance' ? 'Compliance by Regulation' : 
               reportType === 'dsar' ? 'DSAR Requests by Type' : 
               reportType === 'risk' ? 'Risk Score Trend' : 
               'PII by Data Source Type'}
            </h3>
            <div id="report-chart" className="h-80">
              {reportType === 'compliance' && <Bar data={complianceData} options={{ maintainAspectRatio: false }} />}
              {reportType === 'dsar' && <Bar data={dsarData} options={{ maintainAspectRatio: false }} />}
              {reportType === 'risk' && <Line data={riskTrendData} options={{ maintainAspectRatio: false }} />}
              {reportType === 'datasources' && <Pie data={dataSourcesData} options={{ maintainAspectRatio: false }} />}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {reportType === 'compliance' ? 'Compliance Status' : 
               reportType === 'dsar' ? 'DSAR Metrics' : 
               reportType === 'risk' ? 'Risk Assessment' : 
               'Data Source Analysis'}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {reportType === 'compliance' && (
                      <>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regulation</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Assessment</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Review</th>
                      </>
                    )}
                    {reportType === 'dsar' && (
                      <>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deletion</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rectification</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response</th>
                      </>
                    )}
                    {reportType === 'risk' && (
                      <>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                      </>
                    )}
                    {reportType === 'datasources' && (
                      <>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PII Density</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportType === 'compliance' && complianceTable.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{row.regulation}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.score}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        <Badge 
                          variant={row.status === 'Compliant' ? 'success' : 'warning'} 
                          size="sm"
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.lastAssessment}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.nextReview}</td>
                    </tr>
                  ))}
                  {reportType === 'dsar' && dsarTable.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{row.month}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.access}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.deletion}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.rectification}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.total}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.avgResponseTime}</td>
                    </tr>
                  ))}
                  {reportType === 'risk' && riskTable.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{row.category}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.current}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.previous}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-green-600">{row.change}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        <Badge 
                          variant={row.trend === 'Improving' ? 'success' : 'danger'} 
                          size="sm"
                        >
                          {row.trend}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {reportType === 'datasources' && dataSourcesTable.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{row.type}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.count}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.records}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{row.piiDensity}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        <Badge 
                          variant={row.riskLevel === 'Low' ? 'success' : row.riskLevel === 'Medium' ? 'warning' : 'danger'} 
                          size="sm"
                        >
                          {row.riskLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Executive Insights</h3>
          <div className="text-sm text-blue-800">
            {reportType === 'compliance' && (
              <p>Overall compliance has improved by 3% this quarter. HIPAA compliance requires attention with a score of 78%, primarily due to incomplete access controls and audit logging. Recommend prioritizing HIPAA compliance improvements in the next 30 days.</p>
            )}
            {reportType === 'dsar' && (
              <p>DSAR volume has increased 28% over the past 6 months, while average response time has improved from 18 to 10 days. Access requests remain the most common type at 48% of total volume. The automation improvements have significantly enhanced efficiency despite increased volume.</p>
            )}
            {reportType === 'risk' && (
              <p>Overall risk score has improved from 65% to 62% this quarter. Data security shows the most significant improvement with a 5% risk reduction due to enhanced encryption and access controls. Vendor risk remains the highest category at 72% and should be prioritized.</p>
            )}
            {reportType === 'datasources' && (
              <p>SaaS applications represent the highest concentration of PII (45% density) and highest risk level. These 10 applications contain 310K PII records. Recommend implementing additional controls for SaaS data and conducting a data minimization review.</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Available Reports</h2>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download All Reports
          </Button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Quarterly Compliance Report</h3>
                  <p className="text-sm text-gray-600">Q2 2024 • Generated on June 30, 2024</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Annual Risk Assessment</h3>
                  <p className="text-sm text-gray-600">2024 • Generated on January 15, 2024</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-gray-900">DSAR Activity Report</h3>
                  <p className="text-sm text-gray-600">H1 2024 • Generated on June 15, 2024</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Data Inventory Report</h3>
                  <p className="text-sm text-gray-600">Q2 2024 • Generated on June 20, 2024</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;