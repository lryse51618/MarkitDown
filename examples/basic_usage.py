"""MarkItDown Python API 기본 사용 예제.

실행:
    python examples/basic_usage.py
"""

import io
import tempfile
from pathlib import Path

from markitdown import MarkItDown, StreamInfo

md = MarkItDown(enable_plugins=False)

# 1) 파일 경로로 변환
with tempfile.TemporaryDirectory() as tmp:
    csv_path = Path(tmp) / "성적.csv"
    csv_path.write_text("이름,점수\n철수,90\n영희,95\n", encoding="utf-8")

    result = md.convert(str(csv_path))
    print("=== 1) 파일 경로 ===")
    print(result.text_content)

# 2) 메모리 속 데이터(스트림)로 변환 - 웹 업로드 파일 처리 등에 유용
html = "<h1>제목</h1><p>본문 <b>굵게</b></p><ul><li>하나</li><li>둘</li></ul>"
stream = io.BytesIO(html.encode("utf-8"))
result = md.convert_stream(stream, stream_info=StreamInfo(extension=".html"))
print("=== 2) 스트림 ===")
print(result.text_content)

# 3) 변환 결과를 파일로 저장
out = Path("output") / "example.md"
out.parent.mkdir(exist_ok=True)
out.write_text(result.text_content, encoding="utf-8")
print(f"=== 3) 저장 완료: {out} ===")
