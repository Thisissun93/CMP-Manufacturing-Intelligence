# 데이터 정책 및 문헌 근거

- 6개 CSV 열 구조 유지. 240 Batch, Material 720, Process 2880, Equipment 29(STATUS 3 + FILTER_CHANGE 26), QC 2160, Checksheet 10행. `npm run generate`로 고정 시드에서 동일하게 재생성됩니다.
- 공정 변수: MIX 단계 Temperature(C, 6점, 상한 30)·Agitator_Speed(rpm, 3점, 상한 330), FILTER 단계 Filter_DP(kPa, 3점, 경보 80). 필터는 설비별 8 Batch 주기로 교체하며 FILTER_CHANGE 이벤트로 기록합니다.
- 설비 3대, 각 LOT 80분, 다음 시작까지 10분 여유. 설비 내 동시 생산 없음. 공장 전체 07:00–19:00 / 19:00–다음 날 07:00, Asia/Seoul. CSV는 같은 시각을 UTC Z로 표현. 시작 포함/종료 제외 구간으로 교대 적용.
- 원료 LOT 교체 주기를 원료마다 다르게 둠: SILICA 6, ADDITIVE 9, DIW 15 Batch(공장 생산 순서 기준, 시작 위치도 서로 다름). 모든 원료가 같은 시점에 바뀌면 LOT 효과를 원료별로 구분할 수 없기 때문입니다. 원료 제조 LOT와 개별 드럼은 다름. 드럼 용량/잔량·소분/혼합 투입을 모사하지 않음. DIW도 추적 그룹 예시이며 드럼 사용 주장이 아님.
- pH는 무차원(표시 pH), 고형분 wt%, 동점도가 아닌 점도 mPa.s, 입도 nm, LPC count/mL, 제타 전위 mV, Fe ug/kg, 온도 C(°C), 차압 kPa, 회전 rpm, 시간 min, 투입 kg. ASCII CSV 표기는 UI 기호와 동등. 자동 단위 환산은 하지 않음. 분포 기준·희석비·측정온도·시험법이 다르면 단위가 같아도 비교 불가.
- 숫자 열의 None/null/N/A/NA/결측/미측정/미기록은 빈값으로 인식. QC 빈값은 NOT_MEASURED로 분류하되 미측정/미기록 사유는 미확인. 0 대입 없음. QC 최종 분석에서 제외. Material 수량·Process 값 등 필수값의 결측은 행 위치와 경고 후 입력 보완 필요. 규격 빈값은 단측 또는 미등록으로 처리. ID·시각은 숫자 결측 토큰 치환 대상 아님.
- QC 채취→시험→검토→승인 흐름을 가정. 원본 시험 이력을 유지하며 승인된 최종 결과가 정확히 1개일 때 선택. 여러 최종 결과는 충돌, 승인 결과 없음은 미확정. 재시험 통과가 최초 이탈을 지우지 않음. 자동 출하 승인 없음. 시연 CSV는 승인 상태가 미리 기입된 합성 자료이며 사용자 인증 기능은 없음.

## 근거 링크

단위·측정 개념은 아래 제조사 자료를 참고했습니다. 수치 규격은 문헌에서 승인 기준으로 가져온 것이 아닙니다.

- [Malvern: CMP 입도 분석](https://www.malvernpanalytical.com/en/industries/electronics/cmp-slurry) — nm 입도, 측정 기법 구분.
- [Malvern: 제타 전위](https://www.malvernpanalytical.com/en/products/measurement-type/zeta-potential/) — mV.
- [Entegris: 입자 특성](https://www.entegris.com/en/home/resources/industry-insights/general-particle-sizing.html) — particles/mL와 LPC 측정.
- [Malvern: 농축 CMP slurry 제타 측정](https://www.malvernpanalytical.com/br/learn/knowledge-center/application-notes/an101104highlyconcentratedcmpslurry) — 희석과 매질 조건의 중요성.
- [FDA: OOS 조사 지침](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/investigating-out-specification-oos-test-results-pharmaceutical-production-level-2-revision) — 최초 이탈 기록 보존 원칙의 참고 자료. 의약품 지침이며 CMP에 적용되는 법규 또는 산업 표준이라는 뜻이 아님.

## 시연 시나리오 (의도적으로 심은 사건)

- 사건 A: ADDITIVE-LOT-23(SIM-S0195~S0203)의 pH를 +0.58 높게, 제타 전위를 −1.4 mV 낮게 설정. 같은 기간의 SILICA·DIW LOT은 정상 Batch와 공유됩니다.
- 사건 B: MIX-2의 정기 필터 교체 1회 누락(21 Batch 연속 사용). Filter_DP 최대값이 70 kPa를 넘으면 LPC가 차압에 비례해 증가하도록 설정. SIM-S0233 직전 FILTER_CHANGE로 복귀합니다.
- 혼합 온도·교반 속도는 전 기간 정상 범위로 두어 교란 요인을 만들지 않았습니다.

설비 시간·원료 LOT 주기·교대·규격 수치·사건의 크기는 본 프로그램의 시연 가정이며 실제 공정 수치가 아닙니다.
