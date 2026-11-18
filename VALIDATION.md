# 검증

## 독립 계산 대조 (자동)

`work/statistics-core.js`의 결과를 앱 코드를 쓰지 않는 계산과 비교합니다. 데이터는 시연용 240 Batch, 허용 오차는 상대 1e-9입니다.

| 영역 | 대조한 값 | 독립 계산 |
|---|---|---|
| 공정능력 (pH 240 Batch) | 평균, 표본 σ, Pp, Ppk | pandas·numpy |
| 공정능력 (MIX-1, 이동범위) | 군내 σ(MR̄/1.128), Cp, Cpk, Ppk | numpy |
| 회귀 (LPC ~ 필터 차압 최대) | 기울기, 절편, r, R², RMSE | scipy `linregress`, statsmodels OLS |
| 순위 상관 | Spearman | scipy `spearmanr` |
| 분산성분 (pH ~ 원료 LOT, 3종) | LOT 간 분산, 잔차 분산, 기여율 | statsmodels 일원 ANOVA 평균제곱 + 불균형 n0 |

- 기준값: `python work/reference/compute_reference.py` → `work/reference/expected.json`
- 대조: `npm test`의 `work/test-reference.cjs` (23개 값)
- CI는 Python으로 기준값을 다시 계산해 `expected.json`이 최신인지도 확인합니다.
- 분산성분은 앱과 같은 조건(LOT당 Batch 2개 이상)으로 계산합니다.

## 기존 시험

기본 자동 시험: 240 Batch, 설비 생산 시간 비중복, 07/19시 12시간 교대, 원료 LOT 교체 시점 엇갈림, 시나리오 분리(pH 이탈 전부 ADDITIVE-LOT-23 · 같은 기간 SILICA/DIW LOT은 정상 Batch와 공유 · LPC_1p0 이탈 전부 MIX-2 & Filter_DP>80), HOLD/RELEASED와 QC 판정 일치, 생성기 결정성, QC 빈칸/None 처리, 수기 기준 능력지수·회귀, HTML/DAT 일치·SHA256. npm run build && npm test.

로컬 브라우저 시험: 통계 계산·240/80 Batch 선택·보고서 내보내기·그룹 비교(설비/원료 LOT)·RCA 검토 완료 조건·백업 복원. README 화면은 헤드리스 Chromium으로 빌드 결과를 실행해 캡처했습니다. 실제 설비 데이터 검증 또는 제3자 인증을 의미하지 않습니다. CI는 기본 시험만 수행하며 브라우저 시험 자동화 확대가 남아 있습니다.

공개 전: 압축 해제 폴더에서 빌드/시험 → app 실행 → 240 Batch 시연 → 저장/복원 → 저장소 파일 검토. 현장 적용 전: 단위/시험법·규격 승인·독립 계산 도구 대조·측정시스템·권한/감사 관리.
