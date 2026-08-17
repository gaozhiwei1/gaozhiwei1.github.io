# LLM Interview Handbook

Commercial-format Chinese LaTeX handbook for LLM algorithm, foundation-model,
post-training, inference-optimization, RAG, and Agent interviews.

## Build

Compile from this directory:

```bash
XDG_CACHE_HOME=.cache latexmk -xelatex -interaction=nonstopmode main.tex
```

Clean generated files:

```bash
latexmk -C main.tex
```

## Contents

- `main.tex`: document entry point and global style.
- `sections/`: modular Chinese handbook chapters.
- `figures/diagrams.tex`: TikZ vector diagrams.
- `code/interview_snippets.py`: runnable mirror of the commented PyTorch examples embedded beside their explanations.
- `main.pdf`: compiled handbook artifact.
- `CHANGELOG.md`: versioned content, correctness, and publication-quality changes through 2026 Edition v2.1.
