# 데이터 출처와 라이선스

2026-10-20 갱신. 코드는 MIT이며 사전·예문·한자 데이터에는 아래 원본별 라이선스가 적용됩니다. 재배포 시 해당 출처 표시와 동일조건변경허락 조건을 유지해야 합니다. 사이트에도 /data/credits.txt와 예문 원문 링크를 제공합니다.

## JLPT 등급·표기·읽기

- [Tanos JLPT Resources](https://www.tanos.co.uk/jlpt/), CC BY
- [Open Anki JLPT Decks](https://github.com/jamsinclair/open-anki-jlpt-decks), src/n1.csv~src/n5.csv (프로젝트 코드는 MIT)

N1 2,699개를 통합하고 읽기 오류·문맥/품사 주석·중복을 교정했습니다. 원본 영어의 오류도 일본어 표기와 읽기에 맞추어 교정했습니다. 이 등급 분류는 JLPT 주관 기관의 공식 어휘 목록이 아닌 학습용 참고 분류입니다.

## 한국어 뜻과 설명

- [국립국어원 한국어기초사전](https://krdict.korean.go.kr/kor/mainAction), [저작권 정책](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo), [CC BY-SA 2.0 KR](https://creativecommons.org/licenses/by-sa/2.0/kr/)
- 공식 XML 다운로드의 공개 미러: [spellcheck-ko/korean-dict-nikl](https://github.com/spellcheck-ko/korean-dict-nikl), krdict/001.xml~011.xml (자료 작성일 2026-06-19)
- [한국어 위키낱말사전](https://ko.wiktionary.org/), [Kaikki 추출 데이터](https://kaikki.org/kowiktionary/) (2026-10-01 덤프, 2026-10-16 추출)

한국어기초사전의 일본어 대역어를 일본어 표기·읽기에 맞춰 역방향으로 대조하고 한국어 표제어와 정의를 선택했습니다. 한국어 중심 사전이므로 다의어·문체·읽기를 추가 대조했습니다. meaningSource에 가능한 범위에서 사전 항목·뜻 번호를 보존했습니다.

위키낱말사전에는 CC BY-SA와 GFDL 조건이 적용됩니다. 현재 원문 페이지는 텍스트를 CC BY-SA 4.0으로 표시합니다. 어간 설명·다른 품사의 뜻·관련 없는 의미를 제외하고 한국어 설명을 정리했습니다. 사전으로 직접 연결되지 않은 항목은 일본어와 JMdict 뜻을 참고하여 한국어로 별도 작성했습니다.

## 일본어 예문

- [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html), [EDRDG 라이선스](https://www.edrdg.org/edrdg/licence.html), CC BY-SA 4.0
- 구조화 배포: [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified), jmdict-examples-eng-3.6.2 / 2026-10-12
- [Tatoeba 다운로드](https://tatoeba.org/eng/downloads), [이용 약관·라이선스](https://tatoeba.org/eng/terms_of_use)
- [Tanaka Corpus 안내](https://www.edrdg.org/wwwjdic/wwwjdicinf.html)

뜻에 연결된 JMdict 예문을 우선 선택하고 부족한 항목은 Tatoeba의 문장에서 원형·읽기·품사를 대조했습니다. Tatoeba/Tanaka 예문은 원래의 CC BY 조건을 유지합니다. Tatoeba 텍스트 다운로드는 CC BY 2.0 FR로 제공되며 일부 문장은 CC0일 수 있습니다. example.sourceId로 원문을 연결하고, 알려진 작성자는 example.author에 보존했습니다. 없는 작성자 이름을 만들어 붙이지 않았습니다.

용례가 부족하거나 뜻·읽기와 맞지 않은 문장은 Kotoba Loop용 예문과 한국어 번역으로 대체했습니다. example.source가 kotoba-loop-original인 문장은 프로젝트 작성 자료이며, 새로 작성한 학습 데이터는 CC BY-SA 4.0으로 제공합니다. 외부 문장을 프로젝트 작성 문장으로 표시하지 않습니다.

## 한자 부수

- [KANJIDIC2 / EDRDG](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project), CC BY-SA 4.0
- [KanjiVG](https://kanjivg.tagaini.net/), [원본 저장소](https://github.com/KanjiVG/kanjivg), CC BY-SA 3.0, © Ulrich Apel 등 기여자, r20260714
- [Unicode CJKRadicals.txt](https://www.unicode.org/Public/UCD/latest/ucd/CJKRadicals.txt), [Unicode 이용 조건](https://www.unicode.org/copyright.html)

대표 부수 번호, 원래 한자, 글자별 실제 구성 모양을 연결했습니다. KanjiVG의 그림 파일 대신 구성 정보를 텍스트로 정리했습니다. 肉→月과 月→月, 阜→⻖와 邑→⻏, 示→礻와 衣→衤를 구별합니다. 구조 정보를 확인하기 어려운 소수의 글자는 대표 부수 원형으로 표시합니다.

## 변경 기록과 검수 범위

전체 뜻·예문·필수 필드·ID·부수 정보를 검사했고, 낮은 사전 일치 항목과 예문 불일치를 추가 교정했습니다. 방법은 사전 대조·자동 검사·모델의 언어 검토를 결합한 것입니다. 모든 의미를 망라하거나 원어민이 전수 검수한 자료로 표시하지 않습니다. data/README.md와 교정 JSON에 방법과 변경 기록을 보존했습니다.

초기 N5~N2 자료에 들어 있던 기계 번역은 이번 사전 대조와 별도 교정으로 보완했습니다. 단어 오류를 발견하면 저장소 이슈에 표기·읽기를 함께 알려 주세요.
