# MarkitDown 변환 도구

Microsoft [MarkItDown](https://github.com/microsoft/markitdown)으로 PDF, Word, PowerPoint, Excel, HTML, CSV, 이미지 같은 문서를 **Markdown으로 한꺼번에 바꿔주는** 도구 모음입니다.

## 구성

| 파일 | 설명 |
|---|---|
| `setup.sh` | 가상환경을 만들고 패키지를 설치 |
| `convert.py` | 파일, 폴더, URL을 받아 일괄 변환하는 CLI |
| `examples/basic_usage.py` | Python API 기본 사용 예제 (경로 변환, 스트림 변환, 저장) |
| `examples/image_with_llm.py` | OpenAI 모델로 이미지 설명을 붙이는 예제 |
| `tests/` | `convert.py` 테스트 (pytest) |
| `input/` | 변환할 파일을 넣는 기본 폴더 |

## 1. 설치

Python 3.10 이상이 필요합니다.

```bash
git clone https://github.com/lryse51618/MarkitDown.git
cd MarkitDown
./setup.sh
source .venv/bin/activate        # Windows: .venv\Scripts\activate
```

`setup.sh`를 쓰지 않고 직접 설치하려면:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt   # markitdown[all]
```

## 2. 가장 쉬운 사용법

1. 변환할 문서를 `input/` 폴더에 넣습니다.
2. 아래 명령을 실행합니다.

```bash
python convert.py
```

3. 변환된 `.md` 파일이 `output/` 폴더에 생깁니다.

## 3. `convert.py` 옵션

```bash
python convert.py 보고서.pdf 발표.pptx          # 특정 파일만 변환
python convert.py docs/ -o 결과                 # docs 폴더 -> 결과 폴더
python convert.py docs/ -r                      # 하위 폴더까지 (폴더 구조 유지)
python convert.py docs/ --overwrite             # 이미 있는 .md 덮어쓰기
python convert.py https://example.com           # 웹 페이지 변환
python convert.py 사진.jpg --llm-model gpt-4o   # 이미지 설명을 LLM으로 생성
python convert.py 스캔.pdf --docintel-endpoint https://<리소스>.cognitiveservices.azure.com/
```

| 옵션 | 설명 |
|---|---|
| `inputs` | 파일, 폴더 또는 URL (여러 개 가능, 기본값 `input`) |
| `-o, --output` | 결과 폴더 (기본값 `output`) |
| `-r, --recursive` | 하위 폴더까지 변환 |
| `--overwrite` | 기존 결과 덮어쓰기 (기본은 건너뜀) |
| `--use-plugins` | 설치된 MarkItDown 플러그인 사용 |
| `--llm-model` | 이미지 설명용 OpenAI 모델 (`pip install openai`, `OPENAI_API_KEY` 필요) |
| `--docintel-endpoint` | Azure Document Intelligence 엔드포인트 (스캔한 PDF OCR) |

변환에 실패한 파일이 하나라도 있으면 종료 코드 1을 반환하므로 스크립트나 CI에서도 쓸 수 있습니다.

## 4. 공식 `markitdown` 명령 직접 쓰기

`markitdown[all]`을 설치하면 `markitdown` 명령도 함께 생깁니다.

```bash
markitdown 문서.pdf                  # 화면에 출력
markitdown 문서.pdf -o 결과.md       # 파일로 저장
cat 문서.pdf | markitdown -x pdf     # 표준입력 (확장자 힌트 지정)
```

## 5. Python 코드에서 쓰기

```python
from markitdown import MarkItDown

md = MarkItDown(enable_plugins=False)
result = md.convert("보고서.xlsx")       # 경로, URL 모두 가능
print(result.text_content)
```

메모리에 있는 데이터(업로드 파일 등)는 `convert_stream`을 씁니다. 자세한 내용은 `examples/basic_usage.py`를 참고하세요.

```bash
python examples/basic_usage.py
```

## 6. 지원 포맷

PDF, DOCX, PPTX, XLSX/XLS, HTML, CSV, JSON, XML, TXT, EPUB, Outlook MSG, Jupyter Notebook, ZIP(내부 파일 각각 변환), 이미지(EXIF 메타데이터, LLM 설명), 오디오(메타데이터, 음성 인식), YouTube URL

## 7. 테스트

```bash
pip install -r requirements-dev.txt
pytest
```

## 8. 문제 해결

- **`markitdown: command not found`**: 가상환경을 켰는지 확인하세요 (`source .venv/bin/activate`).
- **특정 포맷이 변환되지 않음**: `pip install -r requirements.txt`로 `markitdown[all]`을 다시 설치하세요.
- **스캔한 PDF에서 텍스트가 나오지 않음**: 기본 변환기는 OCR을 하지 않습니다. `--docintel-endpoint`를 쓰거나 별도 OCR 도구로 먼저 처리하세요.
- **표나 레이아웃이 원본과 다름**: MarkItDown은 원본 모양을 그대로 재현하기보다 LLM이 읽기 좋은 구조를 만드는 것이 목적입니다.
