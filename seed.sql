-- Seed data for PDF parsing pipeline testing

-- Insert test RFPs
INSERT OR IGNORE INTO rfps (id, title, content, industry, budget_range, deadline, requirements, status) VALUES 
  ('rfp-001', 'Digital Transformation Initiative', 'Large-scale digital transformation project focusing on cloud migration and process automation', 'Technology', '$5M-10M', '2024-12-31', 'Cloud infrastructure, API integration, security compliance', 'active'),
  ('rfp-002', 'Supply Chain Optimization System', 'Enterprise supply chain management system with real-time tracking and predictive analytics', 'Manufacturing', '$2M-5M', '2024-06-30', 'ERP integration, IoT sensors, machine learning', 'active'),
  ('rfp-003', 'Customer Experience Platform', 'Omnichannel customer experience platform with AI-powered personalization', 'Retail', '$1M-3M', '2024-09-15', 'CRM integration, AI/ML capabilities, mobile app', 'active');

-- Insert test personas (기본 5개 + Executive 페르소나 12개 추가)
INSERT OR IGNORE INTO personas (id, name, avatar_url, position, department, influence_level, budget_authority, technical_background, risk_tolerance, communication_style, decision_criteria, key_concerns, preferred_solutions, relationship_dynamics, time_constraints, information_sources, success_metrics, potential_objections) VALUES 
  -- 기존 기본 페르소나들
  ('persona-001', 'Sarah Chen', '/static/avatars/sarah.jpg', 'Chief Technology Officer', 'Technology', 9, true, true, 'medium', 'direct', 'Technical feasibility and scalability', 'Security, integration complexity', 'Cloud-native, API-first solutions', 'Collaborative with engineering teams', 'Quarterly planning cycles', 'Technical documentation, vendor demos', 'System performance and uptime', 'Vendor lock-in concerns'),
  ('persona-002', 'Michael Rodriguez', '/static/avatars/michael.jpg', 'Chief Financial Officer', 'Finance', 8, true, false, 'low', 'formal', 'Cost-benefit analysis and ROI', 'Budget overruns, hidden costs', 'Proven solutions with clear pricing', 'Cautious with procurement decisions', 'Annual budget cycles', 'Financial reports, industry benchmarks', 'Cost savings and efficiency gains', 'High upfront costs'),
  ('persona-003', 'Jennifer Kim', '/static/avatars/jennifer.jpg', 'VP of Operations', 'Operations', 7, false, true, 'high', 'collaborative', 'Operational efficiency and user adoption', 'Change management, training requirements', 'User-friendly, intuitive interfaces', 'Inclusive decision-making process', 'Project-driven timelines', 'User feedback, pilot programs', 'Process improvement metrics', 'Disruption to current workflows'),
  ('persona-004', 'David Thompson', '/static/avatars/david.jpg', 'CISO', 'Security', 8, false, true, 'low', 'analytical', 'Security compliance and risk mitigation', 'Data breaches, regulatory violations', 'Security-first, compliant solutions', 'Detail-oriented evaluation process', 'Immediate security needs', 'Security audits, compliance frameworks', 'Zero security incidents', 'Insufficient security controls'),
  ('persona-005', 'Lisa Wang', '/static/avatars/lisa.jpg', 'Chief Marketing Officer', 'Marketing', 6, false, false, 'high', 'persuasive', 'Customer engagement and brand impact', 'Market positioning, customer satisfaction', 'Innovative, customer-centric solutions', 'Stakeholder alignment meetings', 'Campaign launch deadlines', 'Market research, customer surveys', 'Customer acquisition and retention', 'Technology complexity affecting UX'),
  
  -- Executive 페르소나들 (데모용 추가)
  ('exec-001', 'James Parker', '/static/avatars/james.jpg', 'Chief Executive Officer', 'Executive', 10, true, false, 'medium', 'strategic', 'Long-term business growth and competitive advantage', 'Market share, shareholder value, regulatory risks', 'Proven market leaders with strong ROI', 'Board-level strategic decisions', 'Quarterly earnings focus', 'Industry reports, board meetings, analyst briefings', 'Revenue growth, market capitalization, ESG metrics', 'Disruptive technology risks'),
  ('exec-002', 'Patricia Johnson', '/static/avatars/patricia.jpg', 'Chief Operating Officer', 'Operations', 9, true, true, 'medium', 'systematic', 'Operational excellence and process optimization', 'Scalability, efficiency, quality control', 'Enterprise-grade, scalable solutions', 'Cross-functional leadership team', 'Monthly performance reviews', 'Operational dashboards, KPI reports', 'Operational efficiency, cost reduction, quality metrics', 'Implementation complexity and resource constraints'),
  ('exec-003', 'Robert Wilson', '/static/avatars/robert.jpg', 'Chief Strategy Officer', 'Strategy', 8, false, false, 'high', 'visionary', 'Strategic alignment and competitive positioning', 'Market disruption, strategic execution gaps', 'Innovative solutions with strategic advantage', 'Strategy committee and board presentations', 'Annual strategic planning cycles', 'Market intelligence, competitive analysis', 'Strategic goal achievement, market position improvement', 'Technology adoption barriers'),
  ('exec-004', 'Maria Gonzalez', '/static/avatars/maria.jpg', 'Chief Human Resources Officer', 'Human Resources', 7, true, false, 'low', 'empathetic', 'Employee engagement and talent retention', 'Skills gap, change management, cultural fit', 'User-friendly solutions with strong support', 'People-first approach to technology adoption', 'Quarterly employee surveys', 'HR analytics, employee feedback, industry benchmarks', 'Employee satisfaction, retention rates, productivity', 'User adoption challenges and training requirements'),
  ('exec-005', 'Thomas Anderson', '/static/avatars/thomas.jpg', 'Chief Legal Officer', 'Legal', 8, false, false, 'low', 'cautious', 'Legal compliance and risk mitigation', 'Regulatory compliance, contractual risks, data privacy', 'Compliant solutions with strong legal frameworks', 'Legal review and approval processes', 'Regulatory deadline-driven', 'Legal databases, regulatory updates, industry counsel', 'Zero legal incidents, compliance audit results', 'Regulatory non-compliance and legal exposure'),
  ('exec-006', 'Emily Davis', '/static/avatars/emily.jpg', 'Chief Innovation Officer', 'Innovation', 7, true, true, 'high', 'experimental', 'Innovation leadership and digital transformation', 'Innovation pipeline, technology adoption speed', 'Cutting-edge, disruptive technology solutions', 'Innovation committees and pilot programs', 'Innovation sprint cycles', 'Technology trends, startup ecosystem, research publications', 'Innovation metrics, patent portfolio, time-to-market', 'Technology maturity and implementation risks'),
  ('exec-007', 'Christopher Brown', '/static/avatars/christopher.jpg', 'Chief Revenue Officer', 'Sales', 8, true, false, 'medium', 'results-driven', 'Revenue growth and market expansion', 'Sales pipeline, customer acquisition cost, churn', 'Revenue-generating solutions with clear ROI', 'Sales leadership and customer-facing decisions', 'Quarterly revenue targets', 'Sales reports, customer feedback, market analysis', 'Revenue growth, customer lifetime value, market share', 'Customer adoption barriers and competitive pressure'),
  ('exec-008', 'Amanda Taylor', '/static/avatars/amanda.jpg', 'Chief Customer Officer', 'Customer Success', 7, false, false, 'high', 'customer-centric', 'Customer satisfaction and experience optimization', 'Customer churn, satisfaction scores, support quality', 'Customer-first solutions with excellent support', 'Customer advisory boards and feedback sessions', 'Customer success metrics cycles', 'Customer surveys, support tickets, usage analytics', 'Customer satisfaction scores, NPS, retention rates', 'Poor user experience and support challenges'),
  ('exec-009', 'Kenneth Martinez', '/static/avatars/kenneth.jpg', 'Chief Supply Chain Officer', 'Supply Chain', 7, true, true, 'low', 'analytical', 'Supply chain efficiency and cost optimization', 'Supply disruption, inventory management, vendor risks', 'Reliable, cost-effective supply chain solutions', 'Supplier partnership and vendor management', 'Supply chain performance cycles', 'Supply chain analytics, vendor reports, industry data', 'Cost savings, delivery performance, inventory turnover', 'Supply chain disruption and integration complexity'),
  ('exec-010', 'Rachel Wilson', '/static/avatars/rachel.jpg', 'Chief Sustainability Officer', 'Sustainability', 6, false, false, 'medium', 'purpose-driven', 'Environmental impact and sustainability goals', 'ESG compliance, carbon footprint, stakeholder expectations', 'Sustainable, environmentally responsible solutions', 'Sustainability committee and stakeholder engagement', 'ESG reporting cycles', 'Sustainability reports, ESG ratings, regulatory updates', 'Carbon reduction, ESG scores, sustainability targets', 'Greenwashing risks and sustainability measurement challenges'),
  ('exec-011', 'Steven Clark', '/static/avatars/steven.jpg', 'Chief Risk Officer', 'Risk Management', 8, false, true, 'low', 'methodical', 'Enterprise risk management and mitigation', 'Operational risks, cybersecurity threats, regulatory changes', 'Low-risk, compliant solutions with strong controls', 'Risk committee and audit processes', 'Risk assessment cycles', 'Risk reports, audit findings, regulatory guidance', 'Risk reduction, control effectiveness, audit results', 'Unidentified risks and control failures'),
  ('exec-012', 'Laura Anderson', '/static/avatars/laura.jpg', 'Chief Data Officer', 'Data & Analytics', 7, true, true, 'medium', 'data-driven', 'Data governance and analytics capabilities', 'Data quality, privacy compliance, analytics ROI', 'Data-centric solutions with strong governance', 'Data governance committees and analytics teams', 'Data quality improvement cycles', 'Data quality reports, analytics dashboards, compliance audits', 'Data quality scores, analytics adoption, compliance rates', 'Data privacy violations and poor data quality');

-- Link personas to RFPs with relevance scores
INSERT OR IGNORE INTO rfp_personas (rfp_id, persona_id, relevance_score, notes) VALUES 
  -- RFP-001: Digital Transformation Initiative
  ('rfp-001', 'persona-001', 10, 'Primary technical decision maker for digital transformation'),
  ('rfp-001', 'persona-002', 8, 'Budget approval and financial oversight'),
  ('rfp-001', 'persona-003', 7, 'Process integration and change management'),
  ('rfp-001', 'persona-004', 9, 'Security architecture and compliance'),
  ('rfp-001', 'exec-001', 9, 'CEO oversight for strategic digital transformation'),
  ('rfp-001', 'exec-002', 8, 'COO ensuring operational readiness'),
  ('rfp-001', 'exec-003', 8, 'CSO aligning with corporate strategy'),
  ('rfp-001', 'exec-006', 9, 'CIO leading innovation and technology adoption'),
  ('rfp-001', 'exec-011', 7, 'CRO managing transformation risks'),
  
  -- RFP-002: Supply Chain Optimization System
  ('rfp-002', 'persona-001', 8, 'Technical integration requirements'),
  ('rfp-002', 'persona-002', 9, 'Cost optimization focus'),
  ('rfp-002', 'persona-003', 10, 'Primary operational stakeholder'),
  ('rfp-002', 'persona-004', 6, 'Data security for supply chain'),
  ('rfp-002', 'exec-002', 10, 'COO leading supply chain excellence'),
  ('rfp-002', 'exec-009', 10, 'CSCO as primary stakeholder for supply chain optimization'),
  ('rfp-002', 'exec-007', 8, 'CRO interested in revenue impact from supply chain efficiency'),
  ('rfp-002', 'exec-012', 7, 'CDO for supply chain analytics and data governance'),
  
  -- RFP-003: Customer Experience Platform
  ('rfp-003', 'persona-001', 7, 'Platform architecture and APIs'),
  ('rfp-003', 'persona-002', 7, 'Marketing technology budget'),
  ('rfp-003', 'persona-005', 10, 'Primary business stakeholder for customer experience'),
  ('rfp-003', 'exec-007', 10, 'CRO focused on customer acquisition and revenue growth'),
  ('rfp-003', 'exec-008', 10, 'CCO as primary advocate for customer experience'),
  ('rfp-003', 'exec-004', 7, 'CHRO interested in employee tools for customer service'),
  ('rfp-003', 'exec-012', 8, 'CDO for customer data analytics and personalization');

-- Insert default persona mapping rules
INSERT OR IGNORE INTO persona_mapping_rules (rule_id, rule_name, signal_type, signal_pattern, target_persona_field, adjustment_logic, precedence, active) VALUES 
  ('rule-001', 'Budget Authority Detection', 'budget_procurement', 'budget|procurement|financial|cost', 'budget_authority', '{"action": "set_boolean", "value": true, "confidence_boost": 0.2}', 90, true),
  ('rule-002', 'Technical Background from Requirements', 'technical_requirements', 'API|integration|architecture|technical', 'technical_background', '{"action": "set_boolean", "value": true, "confidence_boost": 0.15}', 85, true),
  ('rule-003', 'Risk Tolerance from Compliance', 'risk_compliance', 'compliance|regulatory|security|audit', 'risk_tolerance', '{"action": "set_value", "value": "low", "confidence_boost": 0.1}', 80, true),
  ('rule-004', 'Decision Criteria from KPIs', 'kpis', 'performance|efficiency|ROI|metrics', 'decision_criteria', '{"action": "append_text", "separator": ", ", "confidence_boost": 0.1}', 75, true),
  ('rule-005', 'Key Concerns from Risk Signals', 'risk_compliance', 'risk|compliance|security|audit', 'key_concerns', '{"action": "append_text", "separator": ", ", "confidence_boost": 0.1}', 70, true),
  ('rule-006', 'Innovation Influence Level', 'innovation_poc', 'innovation|POC|pilot|experimental', 'influence_level', '{"action": "increase_numeric", "amount": 1, "max": 10, "confidence_boost": 0.1}', 65, true),
  ('rule-007', 'Governance Communication Style', 'governance_decision', 'governance|committee|board|executive', 'communication_style', '{"action": "set_value", "value": "formal", "confidence_boost": 0.1}', 60, true),
  ('rule-008', 'Strategic Themes Success Metrics', 'strategic_themes', 'strategic|transformation|growth|efficiency', 'success_metrics', '{"action": "append_text", "separator": ", ", "confidence_boost": 0.1}', 55, true),
  ('rule-009', 'Evaluation Criteria Preferences', 'evaluation_criteria', 'evaluation|criteria|requirements|preferences', 'preferred_solutions', '{"action": "append_text", "separator": ", ", "confidence_boost": 0.1}', 50, true),
  ('rule-010', 'Technical Requirements Objections', 'technical_requirements', 'complex|difficult|challenging|integration', 'potential_objections', '{"action": "append_text", "separator": ", ", "confidence_boost": 0.1}', 45, true),
  ('rule-011', 'Budget Constraints Time Pressure', 'budget_procurement', 'urgent|immediate|deadline|timeline', 'time_constraints', '{"action": "set_value", "value": "immediate", "confidence_boost": 0.1}', 40, true),
  ('rule-012', 'Innovation Information Sources', 'innovation_poc', 'research|analysis|study|report', 'information_sources', '{"action": "append_text", "separator": ", ", "confidence_boost": 0.1}', 35, true);

PRAGMA foreign_keys = ON;