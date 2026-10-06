"""LLM으로 이미지 설명을 붙여서 변환하는 예제.

준비:
    pip install openai
    export OPENAI_API_KEY="sk-..."

실행:
    python examples/image_with_llm.py 사진.jpg
"""

import sys

from markitdown import MarkItDown
from openai import OpenAI

if len(sys.argv) != 2:
    sys.exit("사용법: python examples/image_with_llm.py <이미지 또는 pptx 파일>")

md = MarkItDown(llm_client=OpenAI(), llm_model="gpt-4o")
result = md.convert(sys.argv[1])
print(result.text_content)
