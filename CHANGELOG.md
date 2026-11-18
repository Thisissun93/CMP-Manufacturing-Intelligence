# 변경 이력

## 2026-11-18 — 측정과 검증

- 업무 시나리오 측정 `npm run bench` → `docs/BENCHMARK.md`: 이탈 Batch 1건에서 원인 LOT·영향 범위·공정 회귀까지 앱 함수로 실행한 시간.
- 독립 계산 대조: `work/reference/compute_reference.py`(pandas·scipy·statsmodels)의 기준값과 `work/test-reference.cjs`로 23개 값 비교, CI에서 기준값 재계산 확인.
- `AGENTS.md`(Codex 리뷰 기준), README 측정·검증 요약과 CI 배지.

## Ver1.0 업데이트 — 2026-10-01

- 시연 데이터 재설계: 원료 LOT 교체 주기 분리(SILICA 6 · ADDITIVE 9 · DIW 15), 원인이 분리되는 두 사건(첨가제 LOT pH 이탈, MIX-2 필터 교체 지연에 따른 LPC 이탈) 수록. 고정 시드 생성기 `work/generate-sample240.cjs`와 `npm run generate` 추가.
- 공정 변수 추가: 교반 속도(rpm), 필터 차압(kPa), FILTER_CHANGE 설비 이벤트.
- 2단계 통계에 그룹 요인(설비 / 원료별 LOT) 선택, 그룹 비교표(이탈 집중도), 그룹 기준 %Contribution 추가.
- 시험 확장: 시나리오 분리·판정 일치·생성기 결정성. README를 케이스 스터디 중심으로 재작성하고 화면 캡처와 영문 요약 추가.

## Ver1.0 — 2026-09-24

07/19 교대, 원료 LOT별 6개 생산 연결, 숫자 결측 처리, 검토 백업/복원, 그래프 표시 보완, 문헌 기반 RCA 문서, GitHub 기본 CI와 문서 추가.
