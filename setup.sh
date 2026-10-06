#!/usr/bin/env bash
# 가상환경을 만들고 MarkItDown과 개발용 패키지를 설치합니다.
set -euo pipefail
cd "$(dirname "$0")"

PYTHON="${PYTHON:-python3}"
"$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else "Python 3.10 이상이 필요합니다.")'

[ -d .venv ] || "$PYTHON" -m venv .venv
. .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements-dev.txt -q

echo "설치 완료. 다음 명령으로 가상환경을 켜세요:"
echo "  source .venv/bin/activate"
