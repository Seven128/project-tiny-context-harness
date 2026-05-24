#!/usr/bin/env python3
from harness_utils import read_text, repo_path, require, run_main


def main() -> None:
    index = read_text(".docs/INDEX.md")
    docs_root = repo_path(".docs/04_implementation")
    docs = sorted(
        path for path in docs_root.rglob("*.md")
        if path.name != "overview.md"
    )
    if not docs:
        print("Implementation docs OK: no implementation docs yet")
        return
    for path in docs:
        relative = path.relative_to(repo_path(".")).as_posix()
        doc = relative if relative.startswith(".") else f".{relative}"
        index_path = doc.removeprefix(".docs/")
        require(doc in index or index_path in index, f".docs/INDEX.md does not link implementation doc: {doc}")
    print(f"Implementation docs OK: {len(docs)} implementation doc(s)")


if __name__ == "__main__":
    run_main(main)
