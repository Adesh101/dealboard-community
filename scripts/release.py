#!/usr/bin/env python3
"""Build the static Dealboard distribution from committed HEAD. Requires Git and Pandoc."""

import argparse
import html
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from urllib.parse import urlsplit

APP_FILES = (
    "index.html", "app.mjs", "core.mjs", "sample-quotes.mjs",
    "docs/dealer-tracker.csv", "examples/local.json", "examples/shipped.json",
)
GUIDES = (
    "docs/field-guide.md", "docs/dealer-messages.md",
    "docs/shop-with-an-assistant.md", "docs/c300-search.md",
)
GUIDE_STYLE = """
:root { color-scheme: light; }
body { margin: 0 auto; max-width: 76ch; padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem;
       font: 1.05rem/1.65 system-ui, sans-serif; background: #fcfcfa; color: #162d30; }
nav { display: flex; flex-wrap: wrap; gap: 1.4rem; padding-bottom: .8rem;
      border-bottom: 1px solid #c7d6d4; font-weight: 600; }
h1, h2, h3 { line-height: 1.22; margin: 1.6em 0 .5em; }
a { color: #00675f; text-underline-offset: .15em; overflow-wrap: anywhere; }
pre, blockquote { padding: 1rem; margin: 1rem 0; background: #eef3f0; border-radius: .4rem; }
pre { overflow-x: auto; white-space: pre-wrap; }
table { display: block; overflow-x: auto; border-collapse: collapse; font-size: .94em; }
td, th { border-bottom: 1px solid #c7d6d4; text-align: left; padding: .5rem; }
"""


def git(repo, *args, **kwargs):
    return subprocess.run(
        ["git", "-C", str(repo), *args], check=True, **kwargs,
    )


def rewrite_guide_links(markup):
    """Rewrite local Markdown links while preserving query strings and fragments."""
    def replace(match):
        target = urlsplit(match["url"])
        if target.scheme or target.netloc or not target.path.endswith(".md"):
            return match[0]
        updated = target._replace(path=target.path[:-3] + ".html").geturl()
        return match["prefix"] + match["quote"] + updated + match["quote"]
    return re.sub(
        r"(?P<prefix>\bhref\s*=\s*)(?P<quote>[\"'])(?P<url>.*?)(?P=quote)",
        replace, markup, flags=re.IGNORECASE,
    )


def render_guide(source):
    body = subprocess.run(
        ["pandoc", "--from=gfm", "--to=html5", "--wrap=none"],
        input=source, capture_output=True, check=True, text=True,
    ).stdout
    title = html.escape(source.splitlines()[0].removeprefix("# ").strip())
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Dealboard</title><style>{GUIDE_STYLE}</style></head>
<body><nav aria-label="Navigation"><a href="../index.html">Dealboard</a><a href="field-guide.html">Shopping field guide</a></nav>
<main>{rewrite_guide_links(body)}</main></body></html>
"""


def write_mirror(repo, commit, mirror):
    # Publish a single branch. A fresh pack avoids publishing local refs, config,
    # reflogs, remotes, hooks, stashes, unreachable objects or personal worktrees.
    pack_dir = mirror / "objects/pack"
    pack_dir.mkdir(parents=True)
    pack_id = git(
        repo, "-c", "pack.writeReverseIndex=false", "pack-objects", "--revs", str(pack_dir / "pack"),
        input=commit + "\n", capture_output=True, text=True,
    ).stdout.strip()
    refs = {
        "HEAD": "ref: refs/heads/main\n",
        "refs/heads/main": commit + "\n",
        "info/refs": commit + "\trefs/heads/main\n",
        "objects/info/packs": f"P pack-{pack_id}.pack\n\n",
    }
    for filename, contents in refs.items():
        target = mirror / filename
        target.parent.mkdir(exist_ok=True, parents=True)
        target.write_text(contents, encoding="ascii")


def build(repo, commit, output):
    archive = output / "downloads/dealboard-community.zip"
    archive.parent.mkdir()
    git(repo, "archive", "--format=zip", "--prefix=dealboard-community/",
        "--output=" + str(archive), commit)
    # All deployed bytes, including the app and guides, come from the archive.
    # Untracked files and work-in-progress edits cannot enter this release.
    with zipfile.ZipFile(archive) as bundle:
        for name in (*APP_FILES, *GUIDES):
            try:
                data = bundle.read("dealboard-community/" + name)
            except KeyError as error:
                raise ValueError(f"Committed HEAD is missing required file {name}") from error
            dest = output / name
            dest.parent.mkdir(exist_ok=True, parents=True)
            if name in GUIDES:
                dest.with_suffix(".html").write_text(render_guide(data.decode()), encoding="utf-8")
            elif name == "index.html":
                dest.write_text(rewrite_guide_links(data.decode()), encoding="utf-8")
            else:
                dest.write_bytes(data)
    write_mirror(repo, commit, output / "source/dealboard-community")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="new directory outside the repository")
    args = parser.parse_args()
    repo = Path(git(Path(__file__).resolve().parent, "rev-parse", "--show-toplevel",
                    capture_output=True, text=True).stdout.strip()).resolve()
    output = args.output.absolute()
    if output.is_symlink() or output.exists() or output.resolve().is_relative_to(repo):
        parser.exit(1, "Choose a new, unused output directory outside the repository.\n")
    if not shutil.which("pandoc"):
        parser.exit(1, "Install Pandoc to render the public guides, then rerun the release.\n")
    output = output.resolve()
    commit = git(repo, "rev-parse", "--verify", "HEAD^{commit}", capture_output=True, text=True).stdout.strip()
    output.mkdir(parents=True, exist_ok=False)
    try:
        build(repo, commit, output)
    except BaseException:
        shutil.rmtree(output)
        raise
    print(f"Built Dealboard from {commit} at {output}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
