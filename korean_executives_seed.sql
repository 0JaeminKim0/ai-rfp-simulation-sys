-- 한국 대기업 경영진 페르소나 데이터 (실제 데이터 기반)
-- CSV 데이터를 현재 personas 테이블 스키마에 맞게 변환

-- 기존 한국 기업 페르소나 삭제 (중복 방지)
DELETE FROM personas WHERE id LIKE 'SEC_%' OR id LIKE 'LGC_%' OR id LIKE 'HKS_%' OR id LIKE 'GSC_%';

-- 삼성전자 경영진 페르소나
INSERT INTO personas (
    id, name, avatar_url, position, department, influence_level, budget_authority, 
    technical_background, risk_tolerance, communication_style, decision_criteria, 
    key_concerns, preferred_solutions, relationship_dynamics, time_constraints, 
    information_sources, success_metrics, potential_objections
) VALUES 
('SEC_001', '이재용', '/static/avatars/lee_jaeyong.jpg', '회장', '삼성전자', 10, true, 
 false, 'high', 'strategic', '글로벌 시장점유율 확대와 기술혁신', 'AI·반도체 기술 선도, 글로벌 경쟁력', 
 'AI 기반 혁신 솔루션과 반도체 기술', '수직적 의사결정', '분기별 전략 검토', 
 '글로벌 시장 분석, 기술 트렌드 보고서', '글로벌 시장점유율, 기술혁신 지표', 
 '기술 변화 속도와 글로벌 규제 리스크'),

('SEC_002', '한종희', '/static/avatars/han_jonghee.jpg', '부회장(공동 대표이사)', 'DX부문', 9, true, 
 true, 'medium', 'collaborative', 'DX사업 수익성 개선과 사업 실행력', '가전·모바일 사업 강화, 사업 실행력', 
 '검증된 DX 기술과 수익성 중심 솔루션', '협업중심 리더십', '분기별 사업 성과 리뷰', 
 'DX 시장 보고서, 사업부 성과 데이터', 'DX사업 수익성, 시장 점유율', 
 '시장 변화와 경쟁사 대응'),

('SEC_003', '이주형', '/static/avatars/lee_juhyung.jpg', '부사장(CTO)', 'Samsung Research', 7, false, 
 true, 'high', 'analytical', 'AI 기술 개발 성과와 기술 전문성', '생성형 AI 기술 선도, 기술혁신', 
 '생성형 AI와 차세대 기술 솔루션', '수평적 연구협업', '연구개발 사이클', 
 '기술 연구 논문, AI 트렌드 분석', 'AI 기술 개발 성과, R&D 투자 대비 특허', 
 '기술 상용화 속도와 투자 대비 효과'),

('SEC_004', '전영현', '/static/avatars/jeon_younghyun.jpg', '부회장(공동 대표이사)', 'DS부문', 9, true, 
 true, 'medium', 'direct', '반도체 사업 글로벌 점유율과 기술 경쟁력', '반도체 기술 혁신 및 생산성', 
 '반도체 기술 혁신과 생산성 향상 솔루션', '수직적 기술 리더십', '반도체 시장 사이클', 
 '반도체 시장 분석, 기술 로드맵', '반도체 글로벌 점유율, 기술 경쟁력', 
 '기술 투자 비용과 시장 변동성');

-- LG화학 경영진 페르소나
INSERT INTO personas (
    id, name, avatar_url, position, department, influence_level, budget_authority, 
    technical_background, risk_tolerance, communication_style, decision_criteria, 
    key_concerns, preferred_solutions, relationship_dynamics, time_constraints, 
    information_sources, success_metrics, potential_objections
) VALUES 
('LGC_001', '신학철', '/static/avatars/shin_hakchul.jpg', '대표이사', 'LG화학', 10, true, 
 true, 'medium', 'direct', '배터리 사업 글로벌 1위와 수익성', '배터리·소재 사업 집중, 시장 지배력', 
 '배터리 기술과 친환경 소재 솔루션', '수직적 전략 실행', '분기별 사업 성과', 
 '글로벌 배터리 시장 분석, ESG 트렌드', '배터리 사업 글로벌 점유율, 수익성', 
 '원재료 가격 변동과 기술 경쟁'),

('LGC_002', '차동석', '/static/avatars/cha_dongseok.jpg', 'CFO', '재무부문', 8, true, 
 false, 'low', 'analytical', '재무건전성 및 투자수익률', '재무 최적화 및 투자 관리', 
 '검증된 재무 관리 솔루션과 리스크 최소화', '협업중심 재무 관리', '분기별 재무 보고', 
 '재무 데이터, 시장 분석 보고서', '재무건전성, 투자수익률, ROI', 
 '과도한 투자와 재무 리스크'),

('LGC_003', '이종구', '/static/avatars/lee_jonggu.jpg', '부사장(CTO)', '기술개발부문', 7, false, 
 true, 'medium', 'analytical', 'R&D투자 대비 특허 성과와 기술혁신', '친환경 소재 기술 개발', 
 '친환경 기술과 혁신적 연구개발 솔루션', '수평적 기술 협업', 'R&D 프로젝트 사이클', 
 '기술 연구 보고서, 특허 분석', 'R&D투자 대비 특허 성과, 기술혁신 지표', 
 '기술 상용화 시간과 개발 비용');

-- 한국조선해양 경영진 페르소나
INSERT INTO personas (
    id, name, avatar_url, position, department, influence_level, budget_authority, 
    technical_background, risk_tolerance, communication_style, decision_criteria, 
    key_concerns, preferred_solutions, relationship_dynamics, time_constraints, 
    information_sources, success_metrics, potential_objections
) VALUES 
('HKS_001', '김성준', '/static/avatars/kim_sungjun.jpg', '대표이사', '한국조선해양', 10, true, 
 true, 'low', 'direct', '조선 수주량 및 수익성', '친환경 선박 기술 확보', 
 '친환경 조선 기술과 글로벌 경쟁력 솔루션', '수직적 사업 관리', '분기별 수주 성과', 
 '조선 시장 분석, 친환경 규제 동향', '조선 수주량, 수익성, 글로벌 경쟁력', 
 '조선업 경기 변동과 환경 규제'),

('HKS_002', '이종윤', '/static/avatars/lee_jongyun.jpg', '전무(CFO)', '재정부문', 7, true, 
 false, 'low', 'collaborative', '자금조달 성공률 및 재무비율', '조달 강화 및 재무 건전성', 
 '안정적 재무 관리와 자금조달 솔루션', '협업중심 재무 계획', '분기별 재무 검토', 
 '재무 보고서, 자금 조달 시장 분석', '자금조달 성공률, 재무비율 안정성', 
 '자금 조달 비용과 재무 부담'),

('HKS_003', '가삼현', '/static/avatars/ka_samhyun.jpg', '부회장', '한국조선해양', 8, false, 
 false, 'low', 'collaborative', '조선업계 ESG 성과와 지속가능경영', 'ESG 경영 및 친환경 기술', 
 'ESG 기반 지속가능 솔루션', '협업중심 ESG 경영', 'ESG 평가 사이클', 
 'ESG 평가 보고서, 지속가능경영 동향', '조선업계 ESG 성과, 지속가능경영 지표', 
 'ESG 투자 비용과 규제 대응');

-- GS칼텍스 경영진 페르소나
INSERT INTO personas (
    id, name, avatar_url, position, department, influence_level, budget_authority, 
    technical_background, risk_tolerance, communication_style, decision_criteria, 
    key_concerns, preferred_solutions, relationship_dynamics, time_constraints, 
    information_sources, success_metrics, potential_objections
) VALUES 
('GSC_001', '허세홍', '/static/avatars/heo_sehong.jpg', '대표이사', 'GS칼텍스', 10, true, 
 false, 'high', 'strategic', '정유사업 수익성 및 신사업 진출', '탈정유 신사업 확장', 
 '신재생에너지와 탈정유 전환 솔루션', '수직적 전략 추진', '분기별 사업 전환 성과', 
 '에너지 시장 동향, 신사업 분석', '정유사업 수익성, 신사업 진출 성과', 
 '에너지 전환 비용과 시장 변화'),

('GSC_002', '최우진', '/static/avatars/choi_woojin.jpg', 'CFO', '재무부문', 7, true, 
 false, 'low', 'analytical', '재무성과 및 투자효율성', '재무구조 개선 및 신사업 투자', 
 '검증된 투자와 재무구조 개선 솔루션', '협업중심 재무 전략', '분기별 투자 성과', 
 '재무 성과 분석, 투자 효율성 보고서', '재무성과, 투자효율성, ROI', 
 '신사업 투자 리스크와 재무 부담');