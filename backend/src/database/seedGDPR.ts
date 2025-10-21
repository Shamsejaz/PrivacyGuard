import { Pool } from 'pg';

export async function seedGDPRData(pool: Pool): Promise<void> {
  console.log('🌱 Seeding GDPR data...');

  try {
    // Seed lawful basis records
    await pool.query(`
      INSERT INTO lawful_basis_records (processing_activity, lawful_basis, data_categories, purposes, data_subjects, retention_period, status, review_date)
      VALUES 
      ('Customer Registration', 'contract', '["Personal Identifiers", "Contact Information"]', '["Account creation", "Service provision"]', '["Customers"]', '7 years after account closure', 'active', '2024-07-15'),
      ('Marketing Communications', 'consent', '["Contact Information", "Communication Preferences"]', '["Newsletter distribution", "Product updates"]', '["Newsletter Subscribers"]', 'Until consent withdrawn', 'active', '2024-08-01'),
      ('Financial Reporting', 'legal_obligation', '["Transaction Data", "Financial Information"]', '["Tax compliance", "Regulatory reporting"]', '["Customers"]', '10 years', 'active', '2024-06-30')
      ON CONFLICT DO NOTHING
    `);

    // Seed processing records
    await pool.query(`
      INSERT INTO processing_records (activity_name, controller, processor, purposes, lawful_basis, data_categories, data_subjects, recipients, third_country_transfers, retention_period, technical_measures, organisational_measures)
      VALUES 
      ('Customer Registration and Account Management', 'PrivacyGuard Ltd.', 'Cloud Services Provider', '["Account creation", "Service provision", "Customer support"]', 'Contract (Article 6(1)(b))', '["Name", "Email", "Phone", "Address", "Payment information"]', '["Customers", "Prospects"]', '["Payment processors", "Customer support team"]', true, '7 years after account closure', '["Encryption at rest", "Encryption in transit", "Access controls"]', '["Staff training", "Data handling procedures", "Regular audits"]'),
      ('Marketing Communications', 'PrivacyGuard Ltd.', null, '["Newsletter distribution", "Product updates", "Promotional campaigns"]', 'Consent (Article 6(1)(a))', '["Name", "Email", "Communication preferences"]', '["Newsletter subscribers", "Marketing contacts"]', '["Email service provider", "Marketing team"]', false, 'Until consent withdrawn', '["Email encryption", "Secure databases"]', '["Consent management", "Opt-out procedures"]'),
      ('Employee Data Management', 'PrivacyGuard Ltd.', null, '["HR management", "Payroll processing", "Performance evaluation"]', 'Contract (Article 6(1)(b)) / Legal obligation (Article 6(1)(c))', '["Personal details", "Employment history", "Salary information", "Performance data"]', '["Employees", "Job applicants"]', '["Payroll provider", "HR team", "Management"]', false, '7 years after employment ends', '["HR system access controls", "Data encryption"]', '["HR policies", "Confidentiality agreements"]')
      ON CONFLICT DO NOTHING
    `);

    // Seed DPIAs
    await pool.query(`
      INSERT INTO dpias (title, description, processing_type, risk_level, status, reviewer, data_categories, mitigation_measures, residual_risk, completed_date)
      VALUES 
      ('Customer Analytics Platform', 'Implementation of advanced customer behavior analytics using AI/ML', 'Automated Decision Making', 'high', 'approved', 'Sarah Johnson (DPO)', '["Personal Identifiers", "Behavioral Data", "Transaction History"]', '["Implement data minimization principles", "Regular algorithm auditing", "User consent management", "Data anonymization where possible"]', 'medium', '2024-02-01'),
      ('Employee Monitoring System', 'Deployment of workplace monitoring software for productivity tracking', 'Systematic Monitoring', 'high', 'in_review', 'Michael Chen (Legal)', '["Employee Data", "Activity Logs", "Location Data"]', '["Clear employee notification", "Purpose limitation enforcement", "Regular data deletion", "Access controls implementation"]', 'medium', null),
      ('Marketing Automation Enhancement', 'Upgrade to marketing automation platform with enhanced profiling', 'Profiling', 'medium', 'draft', 'Not assigned', '["Contact Information", "Preferences", "Engagement Data"]', '["Opt-in consent collection", "Profile accuracy controls", "Easy opt-out mechanisms"]', 'low', null)
      ON CONFLICT DO NOTHING
    `);

    // Seed data breaches
    await pool.query(`
      INSERT INTO data_breaches (title, description, discovery_date, reported_date, severity, status, affected_data_subjects, data_categories, likely_consequences, mitigation_measures, supervisory_authority_notified, data_subjects_notified, notification_deadline, assigned_to)
      VALUES 
      ('Email Database Unauthorized Access', 'Unauthorized access to customer email database through compromised admin credentials', '2024-02-15', '2024-02-16', 'high', 'reported', 15000, '["Email addresses", "Names", "Subscription preferences"]', 'Potential spam emails, phishing attempts targeting affected users', '["Immediate password reset for all admin accounts", "Enhanced access controls implemented", "Security audit conducted", "Affected users notified"]', true, true, '2024-02-18', 'Sarah Johnson (DPO)'),
      ('Payment Processing System Glitch', 'System error exposed payment card details in transaction logs', '2024-02-10', '2024-02-11', 'high', 'resolved', 250, '["Payment card numbers", "Expiry dates", "Transaction amounts"]', 'Risk of financial fraud, identity theft', '["Immediate system patch applied", "Log files secured and encrypted", "Payment processor notified", "Credit monitoring offered to affected customers"]', true, true, '2024-02-13', 'Michael Chen (Security)'),
      ('Employee Data Misdirection', 'HR report containing employee personal data sent to wrong recipient', '2024-02-08', null, 'medium', 'assessed', 45, '["Employee names", "Salaries", "Performance ratings"]', 'Privacy violation, potential workplace discrimination', '["Recipient confirmed data deletion", "Email recall attempted", "Enhanced email verification procedures", "Staff training scheduled"]', false, true, '2024-02-11', 'Lisa Wong (HR)')
      ON CONFLICT DO NOTHING
    `);

    // Seed data portability requests
    await pool.query(`
      INSERT INTO data_portability_requests (request_id, data_subject_name, data_subject_email, data_subject_user_id, status, data_categories, format, delivery_method, completion_date, expiry_date, file_size, download_count, notes)
      VALUES 
      ('DP-2024-001', 'John Smith', 'john.smith@email.com', 'USR-12345', 'delivered', '["Profile Information", "Transaction History", "Communication Preferences"]', 'json', 'email', '2024-02-12', '2024-03-12', '2.3 MB', 1, 'Complete data export including all historical transactions'),
      ('DP-2024-002', 'Sarah Johnson', 'sarah.j@email.com', 'USR-67890', 'processing', '["Account Data", "Usage Analytics", "Support Tickets"]', 'csv', 'secure_portal', null, '2024-03-16', null, 0, 'Processing large dataset, estimated completion in 2 days'),
      ('DP-2024-003', 'Michael Chen', 'mchen@email.com', 'USR-11111', 'ready', '["Personal Details", "Order History"]', 'pdf', 'download', '2024-02-17', '2024-03-17', '1.8 MB', 0, 'Ready for download via secure link')
      ON CONFLICT DO NOTHING
    `);

    // Seed compliance items
    await pool.query(`
      INSERT INTO compliance_items (article, requirement, description, status, evidence, responsible, last_reviewed, next_review, priority, category)
      VALUES 
      ('Article 5', 'Lawfulness, fairness and transparency', 'Personal data shall be processed lawfully, fairly and in a transparent manner', 'compliant', '["Lawful basis documentation", "Privacy notices", "Consent records"]', 'Sarah Johnson (DPO)', '2024-01-15', '2024-07-15', 'high', 'principles'),
      ('Article 5', 'Purpose limitation', 'Personal data shall be collected for specified, explicit and legitimate purposes', 'compliant', '["Purpose documentation", "Data mapping", "Processing records"]', 'Sarah Johnson (DPO)', '2024-01-20', '2024-07-20', 'high', 'principles'),
      ('Article 5', 'Data minimisation', 'Personal data shall be adequate, relevant and limited to what is necessary', 'partial', '["Data audit reports", "Minimization procedures"]', 'Michael Chen (IT)', '2024-02-01', '2024-05-01', 'medium', 'principles'),
      ('Article 15', 'Right of access by the data subject', 'Data subject shall have the right to obtain confirmation of processing and access to personal data', 'compliant', '["DSAR procedures", "Access request logs", "Response templates"]', 'Customer Support', '2024-02-05', '2024-08-05', 'high', 'rights'),
      ('Article 17', 'Right to erasure (right to be forgotten)', 'Data subject shall have the right to obtain erasure of personal data', 'partial', '["Deletion procedures", "Erasure logs"]', 'IT Team', '2024-01-25', '2024-04-25', 'high', 'rights'),
      ('Article 30', 'Records of processing activities', 'Controller shall maintain a record of processing activities under its responsibility', 'compliant', '["Processing records", "Activity documentation", "Regular updates"]', 'Sarah Johnson (DPO)', '2024-02-01', '2024-05-01', 'high', 'obligations'),
      ('Article 32', 'Security of processing', 'Implement appropriate technical and organisational measures to ensure security', 'partial', '["Security policies", "Technical measures", "Risk assessments"]', 'Security Team', '2024-01-15', '2024-04-15', 'high', 'security'),
      ('Article 33', 'Notification of personal data breach to supervisory authority', 'Notify supervisory authority of personal data breach within 72 hours', 'compliant', '["Breach procedures", "Notification templates", "Response logs"]', 'Sarah Johnson (DPO)', '2024-02-15', '2024-08-15', 'high', 'obligations'),
      ('Article 35', 'Data protection impact assessment', 'Carry out DPIA where processing is likely to result in high risk', 'compliant', '["DPIA procedures", "Assessment reports", "Risk evaluations"]', 'Sarah Johnson (DPO)', '2024-01-30', '2024-07-30', 'high', 'governance'),
      ('Article 37', 'Designation of data protection officer', 'Designate DPO where required and ensure proper position and tasks', 'compliant', '["DPO appointment", "Role definition", "Independence documentation"]', 'Executive Team', '2024-01-01', '2024-07-01', 'high', 'governance')
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ GDPR data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding GDPR data:', error);
    throw error;
  }
}
