# AGENTS.md

## 저장소 개요
CMP 슬러리 Batch 조사 도구. 원료 LOT·공정·설비·QC 이력을 연결해 규격 이탈의 원인 후보를 좁히고(그룹 비교, 공정능력, 회귀, 분산성분), 영향 범위와 CAPA 효과를 검토하는 오프라인 브라우저 앱. 데이터는 240 Batch 합성 데이터.

- 앱 소스: `work/*.js` → `npm run build`로 `app/` 단일 HTML·DAT 생성
- 테스트: `npm test` (`work/test-release.cjs` 시나리오·결정성, `work/test-reference.cjs` 독립 계산 대조)
- 독립 기준값: `work/reference/compute_reference.py` (pandas·scipy·statsmodels) → `expected.json`

## Review guidelines
품질 판정을 실제보다 좋게 만들거나, 원인·영향 범위를 잘못 좁히게 만드는 오류는 P1 이상으로 본다.

- **통계**: Cp/Cpk(군내 σ = MR̄/1.128, 설비 1개·시간순), Pp/Ppk(표본 표준편차), 회귀·R²·RMSE, Spearman 순위(동순위 평균), 분산성분(일원 랜덤효과, 불균형 n0)이 표준 정의와 맞는지. 표본 부족·분산 0 처리.
- **판정**: QC 규격 판정과 HOLD/RELEASED가 일치하는지. 빈칸·None 측정값이 합격으로 처리되지 않는지.
- **원인 좁히기**: 원료 LOT 비교에서 교란(같은 기간에 겹친 LOT)을 원인으로 단정하는 문구가 생기지 않는지.
- **영향 범위**: 원인 LOT이 투입된 Batch가 빠짐없이 조회되는지, 규격을 통과해 이미 출하된 Batch가 누락되지 않는지.
- **산출물**: 빌드 결과(`app/`)와 소스(`work/`)가 일치하는지(SHA256 검증), 합성 데이터 전제가 문서에서 빠지지 않는지.
- **문서와 수치**: README·`docs/`·`VALIDATION.md`의 수치가 스크립트 출력과 맞는지.

- README 맨 위의 영어 요약(English summary)에 있는 수치는 한국어 본문·docs와 같아야 합니다. 수치를 바꾸는 PR에서 영어 요약이 갱신되지 않았으면 지적하세요.
