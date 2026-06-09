import { createExportPdf, reserveFooterY, runAutoTableExport } from '@/lib/pdf-export';

export class PDFService {
  /**
   * Generates a highly branded and formatted QA Bug Audit Report
   */
  static generateBugReportPDF(projectName: string, clientName: string, bugs: any[]) {
    const columnCount = 6;
    const doc = createExportPdf(columnCount);
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header Branding Banner
    doc.setFillColor(31, 41, 55); // Slate 800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFillColor(59, 130, 246); // Primary Blue Ribbon
    doc.rect(0, 40, pageWidth, 1.5, 'F');

    // 2. Corporate Title Typography
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CMS ENTERPRISE', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Quality Assurance & System Audit Bureau', 15, 24);

    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 32);

    // 3. Project Information Grid
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('QA BUG AUDIT REPORT', 15, 55);

    // Info cards background
    doc.setFillColor(243, 244, 246); // Slate 100
    doc.roundedRect(15, 60, pageWidth - 30, 25, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text('Project Identifier:', 20, 70);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(projectName || 'General Workspace', 55, 70);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text('Client Enterprise:', 20, 78);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(clientName || 'N/A', 55, 78);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text('Total Bugs Flagged:', 130, 74);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38); // Red 600
    doc.text(String(bugs.length), 165, 75);

    // 4. Tabular Bug Data
    const tableRows = bugs.map((bug, idx) => [
      bug.bugNumber || `B-${idx + 1}`,
      bug.title || 'No description',
      (bug.severity || 'medium').toUpperCase(),
      (bug.platform || 'web').toUpperCase(),
      (bug.status || 'open').replace('_', ' ').toUpperCase(),
      bug.assigneeName || 'Unassigned',
    ]);

    runAutoTableExport(doc, {
      columnCount,
      startY: 95,
      head: [['ID', 'Bug Overview & Title', 'Severity', 'Platform', 'Status', 'Assignee']],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 24 },
        3: { cellWidth: 22 },
        4: { cellWidth: 28 },
        5: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const text = String(data.cell.raw);
          if (text === 'CRITICAL') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (text === 'HIGH') {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
      },
    });

    // 5. Footer Sign-Off Seals & Signature Area
    const finalY = reserveFooterY(doc, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('___________________________________', 15, finalY);
    doc.text('Quality Control Officer Sign-off', 15, finalY + 5);

    doc.text('___________________________________', 130, finalY);
    doc.text('System Audit Cryptographic Hash', 130, finalY + 5);

    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.5);
    doc.circle(185, finalY - 5, 12, 'D');
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text('AUDITED', 178, finalY - 6);
    doc.text('SYSTEM', 179, finalY - 3);
    doc.text('SEAL', 182, finalY);

    doc.save(`QA-Audit-Report-${projectName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
  }

  /**
   * Generates developer's chronological workloads and monthly output metrics.
   */
  static generateDeveloperLogsPDF(devName: string, monthName: string, logs: any[]) {
    const columnCount = 5;
    const doc = createExportPdf(columnCount);

    // Header Banner
    doc.setFillColor(17, 24, 39); // Darker Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFillColor(16, 185, 129); // Emerald Active Ribbon
    doc.rect(0, 40, 210, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CMS WORKSPACE', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(209, 213, 219);
    doc.text('Official Developer Productivity & Timesheet Chronology', 15, 24);

    doc.setFontSize(8);
    doc.text(`Printed On: ${new Date().toLocaleString()}`, 15, 32);

    // Body Titles
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DEVELOPER TIMESHEET DOSSIER', 15, 55);

    // Summary Card
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 25, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Assigned Resource:', 20, 70);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(devName, 55, 70);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Reporting Interval:', 20, 78);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(monthName || 'Total Cumulative History', 55, 78);

    const totalHours = logs.reduce((sum, log) => sum + (parseFloat(log.hoursSpent) || 0), 0);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Total Hours Logged:', 125, 74);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text(`${totalHours.toFixed(1)} hrs`, 162, 75);

    const rows = logs.map((log) => [
      new Date(log.logDate).toLocaleDateString(),
      log.projectName || 'N/A',
      log.taskTitle || 'Generic Development',
      `${log.hoursSpent} hrs`,
      `${log.completionPct || 0}%`,
    ]);

    runAutoTableExport(doc, {
      columnCount,
      startY: 95,
      head: [['Date Logged', 'Project', 'Task Description', 'Duration', 'Complete %']],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81],
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 38 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
      },
    });

    const finalY = reserveFooterY(doc, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('I hereby declare these hours represent genuine project efforts.', 15, finalY);
    
    doc.setFontSize(9);
    doc.text('_______________________________', 15, finalY + 12);
    doc.text('Developer Electronic Attestation', 15, finalY + 17);

    doc.text('_______________________________', 130, finalY + 12);
    doc.text('Authorized Supervisor Signature', 130, finalY + 17);

    doc.save(`Timesheet-${devName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
  }
}
