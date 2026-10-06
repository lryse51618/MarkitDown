#!/usr/bin/env python3
"""MarkItDown 일괄 변환 도구.

파일이나 폴더를 받아 지원되는 문서를 모두 Markdown(.md)으로 변환합니다.
폴더를 넘기면 하위 폴더 구조를 그대로 유지해서 출력 폴더에 저장합니다.

예시:
    python convert.py input/                 # input 폴더 전체 -> output/
    python convert.py 보고서.pdf 발표.pptx -o 결과
    python convert.py docs/ -r --overwrite   # 하위 폴더까지, 기존 결과 덮어쓰기
    python convert.py https://example.com    # URL도 변환 가능
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from pathlib import Path

from markitdown import MarkItDown

# MarkItDown이 처리할 수 있는 대표적인 확장자
SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".pptx", ".xlsx", ".xls",
    ".html", ".htm", ".csv", ".json", ".xml", ".txt", ".md",
    ".epub", ".msg", ".ipynb", ".zip", ".rss", ".atom",
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp",
    ".mp3", ".wav", ".m4a", ".mp4",
}


@dataclass
class Summary:
    converted: list[Path] = field(default_factory=list)
    skipped: list[Path] = field(default_factory=list)
    failed: list[tuple[str, str]] = field(default_factory=list)


def is_url(value: str) -> bool:
    return value.startswith(("http://", "https://"))


def collect_files(directory: Path, recursive: bool) -> list[Path]:
    pattern = "**/*" if recursive else "*"
    return sorted(
        p for p in directory.glob(pattern)
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def url_to_filename(url: str) -> str:
    name = url.split("://", 1)[1].rstrip("/")
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in name)
    return (safe or "page") + ".md"


def build_converter(args: argparse.Namespace) -> MarkItDown:
    kwargs: dict = {"enable_plugins": args.use_plugins}

    if args.llm_model:
        try:
            from openai import OpenAI
        except ImportError:
            sys.exit("--llm-model을 쓰려면 먼저 `pip install openai`를 실행하세요.")
        kwargs["llm_client"] = OpenAI()  # OPENAI_API_KEY 환경변수를 사용
        kwargs["llm_model"] = args.llm_model

    if args.docintel_endpoint:
        kwargs["docintel_endpoint"] = args.docintel_endpoint

    return MarkItDown(**kwargs)


def write_markdown(text: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")


def convert_one(md: MarkItDown, source: str, dest: Path, overwrite: bool,
                summary: Summary) -> None:
    if dest.exists() and not overwrite:
        print(f"  건너뜀 (이미 있음): {dest}")
        summary.skipped.append(dest)
        return
    try:
        result = md.convert(source)
    except Exception as exc:  # 변환기마다 던지는 예외가 달라서 전부 잡는다
        print(f"  실패: {source} -> {type(exc).__name__}: {exc}")
        summary.failed.append((source, str(exc)))
        return
    write_markdown(result.text_content, dest)
    print(f"  완료: {source} -> {dest}")
    summary.converted.append(dest)


def run(args: argparse.Namespace) -> Summary:
    md = build_converter(args)
    out_dir = Path(args.output)
    summary = Summary()

    for target in args.inputs:
        if is_url(target):
            convert_one(md, target, out_dir / url_to_filename(target),
                        args.overwrite, summary)
            continue

        path = Path(target)
        if path.is_dir():
            files = collect_files(path, args.recursive)
            if not files:
                print(f"변환할 파일이 없습니다: {path}")
            for file in files:
                dest = out_dir / file.relative_to(path).with_suffix(".md")
                convert_one(md, str(file), dest, args.overwrite, summary)
        elif path.is_file():
            convert_one(md, str(path), out_dir / path.with_suffix(".md").name,
                        args.overwrite, summary)
        else:
            print(f"  실패: 경로를 찾을 수 없습니다: {target}")
            summary.failed.append((target, "경로 없음"))

    return summary


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="문서(PDF, Word, PPT, Excel, 이미지 등)를 Markdown으로 일괄 변환합니다.",
    )
    parser.add_argument("inputs", nargs="*", default=["input"],
                        help="변환할 파일, 폴더 또는 URL (기본값: input)")
    parser.add_argument("-o", "--output", default="output",
                        help="결과를 저장할 폴더 (기본값: output)")
    parser.add_argument("-r", "--recursive", action="store_true",
                        help="폴더의 하위 폴더까지 변환")
    parser.add_argument("--overwrite", action="store_true",
                        help="이미 있는 .md 파일을 덮어쓰기")
    parser.add_argument("--use-plugins", action="store_true",
                        help="설치된 MarkItDown 플러그인 사용")
    parser.add_argument("--llm-model", metavar="MODEL",
                        help="이미지 설명에 쓸 OpenAI 모델 (예: gpt-4o)")
    parser.add_argument("--docintel-endpoint", metavar="URL",
                        help="Azure Document Intelligence 엔드포인트 (스캔 PDF OCR용)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    summary = run(args)
    print(
        f"\n결과: 성공 {len(summary.converted)}개, "
        f"건너뜀 {len(summary.skipped)}개, 실패 {len(summary.failed)}개"
    )
    return 1 if summary.failed else 0


if __name__ == "__main__":
    sys.exit(main())
