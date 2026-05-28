#!/usr/bin/env python3
import re

from harness_utils import (
    combined_text,
    contains_any,
    load_plan,
    markdown_deliverables,
    read_text,
    repo_path,
    require,
    run_main,
    validate_plan_contract,
)


TEST_FACT_SOURCE_REF = re.compile(r"\.docs/07_test/[^\s`,)]+")


def superseded_test_docs(docs) -> list[str]:
    paths: set[str] = set()
    for doc in docs:
        for line in doc.read_text(encoding="utf-8").splitlines():
            lowered = line.lower()
            if "superseded" not in lowered and "被替代" not in lowered and "失效" not in lowered:
                continue
            for match in TEST_FACT_SOURCE_REF.findall(line):
                paths.add(match.rstrip(".,;:"))
    return sorted(paths)


def main() -> None:
    validate_plan_contract(load_plan(), allow_open=False)
    docs = markdown_deliverables(".docs/rfc")
    require(docs, "No RFC documents found in .docs/rfc/")
    text = combined_text(docs)
    require(contains_any(text, ["background", "背景"]), "RFC must include background")
    require(contains_any(text, ["product impact", "产品影响"]), "RFC must include product impact")
    require(contains_any(text, ["technical impact", "技术影响"]), "RFC must include technical impact candidates")
    require(contains_any(text, ["regression", "回归"]), "RFC must include regression requirements")
    require(
        contains_any(text, ["test fact source impact", "测试事实源影响"]),
        "RFC must include Test Fact Source Impact",
    )
    index_text = read_text(".docs/INDEX.md")
    for path in superseded_test_docs(docs):
        require(not repo_path(path).exists(), f"Superseded test doc still exists in current facts: {path}")
        require(path not in index_text, f"Superseded test doc still linked from .docs/INDEX.md: {path}")
    statuses = re.findall(r"Status:\s*([A-Z_]+)", text)
    require(statuses, "RFC must include a Status line")
    allowed = {"DRAFT", "APPLIED", "VERIFIED", "ARCHIVED"}
    invalid = [status for status in statuses if status not in allowed]
    require(not invalid, "Invalid RFC status: " + ", ".join(invalid))
    print(f"RFC artifacts OK: {len(docs)} file(s)")


if __name__ == "__main__":
    run_main(main)
