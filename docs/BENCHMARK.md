# 업무 시나리오 측정: 이탈 Batch 1건 → 원인 LOT → 영향 범위

README 케이스 스터디(사건 A·C)의 흐름을 앱 함수로 그대로 실행하고 시간을 쟀습니다. `node work/bench-investigation.cjs`로 다시 잴 수 있습니다.

| 단계 | 결과 | 시간 (중앙값) |
|---|---|---|
| CSV 6종 읽기·검증 (Batch·Material·Process·Equipment·QC·Checksheet) | 6,039행 | 52.7 ms |
| 이탈 Batch 보고서 (SIM-S0197: 원료·공정·설비·QC·점검 이력 연결) | 발견 사항 3건 | 0.3 ms |
| 원료 3종 LOT별 비교 (이탈 집중도 + 분산성분) | ADDITIVE: pH 이탈 7건 중 7건이 ADDITIVE-LOT-23 (이 LOT 9 Batch), LOT 간 분산 기여 62%<br>SILICA: pH 이탈 7건 중 5건이 SILICA-LOT-34 (이 LOT 6 Batch), LOT 간 분산 기여 38%<br>DIW: pH 이탈 7건 중 7건이 DIW-LOT-14 (이 LOT 15 Batch), LOT 간 분산 기여 28% | 0.5 ms |
| 영향 범위 (ADDITIVE-LOT-23 투입 Batch 전수와 출하 상태) | 9 Batch 중 규격 통과·출하 2건 | 0.0 ms |
| 공정 변수 회귀 (LPC ~ 필터 차압 최대값, 240 Batch) | 기울기 8.59, R² 0.48 | 0.7 ms |
| **합계** | | **54 ms** |

- 20회 반복의 중앙값, Node v22.23.4, CPU만 사용, 합성 데이터 240 Batch
- 비교 기준: 같은 작업을 MES·LIMS·설비 이력에서 수작업으로 조회하고 엑셀로 합치면 작성자 경험상 반나절 가까이 걸립니다 (계측값 아님).
- 측정 대상은 자료 연결과 계산입니다. 어떤 LOT을 원인으로 볼지, 출하분을 어떻게 처리할지는 사람이 판단합니다.
- ADDITIVE와 함께 SILICA도 분산 기여가 크게 나옵니다. 같은 기간에 쓰인 LOT이 겹치는 교란 때문이고, README 사건 A의 3단계(정상 Batch와 공유하는 LOT 배제)가 이 구분을 보여 줍니다.
