# CMP Manufacturing Intelligence — Ver1.0

[![프로그램 바로 실행](https://img.shields.io/badge/프로그램-바로_실행-008577?style=for-the-badge)](https://thisissun93.github.io/CMP-Manufacturing-Intelligence/)

설치 없이 브라우저에서 실행합니다. 프로그램에서 ‘통계용 240 Batch 불러오기’를 눌러 시작하세요.
제작자: 김태양. CSV 기반 제조 이력 조사·통계 분석·RCA 검토 지원을 위한 오프라인 시연 프로그램입니다. 실제 공장 데이터로 검증된 제조 품질 시스템이 아닙니다. 현업의 작업 흐름을 학습하고 구현한 포트폴리오입니다.

## 시작하기

app/CMP_Batch_Investigator_v2.html을 Edge 또는 Chrome에서 엽니다. 설치나 서버 연결은 필요하지 않습니다. ‘통계용 240 Batch 불러오기’를 누르고 SIM-S0240 보고서 → LOT 통계 분석 → RCA/검증 순서로 확인합니다. samples/의 여섯 CSV를 직접 넣어도 됩니다. .dat는 프로그램의 업데이트 버튼으로 불러옵니다. 파일명 v2는 과거 호환 이름이며 화면 버전은 Ver1.0입니다.

## 기능

- Batch·Material·Process·Equipment·QC·Checksheet의 서로 다른 행 수 연결
- 공장 전체 교대 점검, QC 규격/누락 신호, 공정·시간 비교
- 능력지수, 회귀·상관, 분포·추세·설비 비교와 그래프
- 문헌 기반 원인 후보와 OCAP/FMEA/Control Plan, 편집 가능한 검토 초안
- 검토 이력 저장·백업·복원 및 충돌/손상 검사

## 개발 및 검증

Node.js 22 이상, 외부 패키지 설치 없이 npm run build 후 npm test를 실행합니다. 빌드 결과는 outputs/CMP_Batch_Investigator_v2_Update/CMP_Batch_Investigator_v2/에 생성됩니다. app/는 배포 시점 사본입니다. 소스 수정 후 빌드 결과를 app/로 갱신하세요. work/에 계산·UI·빌드 소스를 분리했습니다. CI는 계산/데이터/패키지 기본 검증을 실행합니다. 브라우저 전체 회귀 시험은 CI에 아직 포함되지 않았습니다.

## 데이터와 범위

samples/는 240 Batch의 권장 시연 자료입니다. outputs/의 50행 CSV는 기존 형식 호환 시험을 위해 보존한 과거 샘플이며 새 교대/원료 가정을 소급 적용하지 않았습니다. 자세한 내용은 DATA_POLICY.md와 VALIDATION.md를 참조하세요.

## 한계와 다음 단계

실제 제품 규격·측정시스템·정상 비교군은 미검증입니다. 상관이나 R²는 원인 확률이 아닙니다. 브라우저 저장은 인증된 감사 추적이 아니며 자동 MES 연결·전자서명·사용자 권한은 없습니다. 다음 개선은 독립 통계 도구 대조, 브라우저 CI, 단위 변환 검증, 영속 저장과 접근 권한, 현업 검토 순서입니다.

## 이용 조건

오픈소스 라이선스는 아직 선택하지 않았습니다. 제작자 표시가 재사용을 기술적으로 차단하지는 않습니다. 외부 문서는 복제하지 않고 링크 및 자체 요약만 포함합니다. 라이선스 선택 전에는 오픈소스 프로젝트로 표방하지 않습니다.
