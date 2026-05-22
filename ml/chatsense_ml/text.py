from __future__ import annotations

import math
import re
from collections import Counter

TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z']+")

STOPWORDS = {
    "a",
    "about",
    "after",
    "again",
    "all",
    "am",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "but",
    "by",
    "can",
    "did",
    "do",
    "for",
    "from",
    "had",
    "has",
    "have",
    "he",
    "her",
    "here",
    "hey",
    "him",
    "his",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "just",
    "like",
    "me",
    "my",
    "no",
    "not",
    "of",
    "on",
    "or",
    "our",
    "so",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "this",
    "to",
    "too",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "with",
    "you",
    "your",
}


def tokenize(text: str) -> list[str]:
    return [
        token.lower().strip("'")
        for token in TOKEN_RE.findall(text)
        if token.lower().strip("'") not in STOPWORDS
    ]


def word_count(text: str) -> int:
    return len(TOKEN_RE.findall(text))


def top_keywords(texts: list[str], limit: int = 8) -> list[str]:
    counts: Counter[str] = Counter()
    for text in texts:
        counts.update(tokenize(text))
    return [word for word, _count in counts.most_common(limit)]


def tfidf_vectors(docs: list[str]) -> list[dict[str, float]]:
    tokenized = [tokenize(doc) for doc in docs]
    doc_freq: Counter[str] = Counter()
    for tokens in tokenized:
        doc_freq.update(set(tokens))

    total_docs = max(len(docs), 1)
    vectors: list[dict[str, float]] = []
    for tokens in tokenized:
        counts = Counter(tokens)
        vector: dict[str, float] = {}
        for token, count in counts.items():
            idf = math.log((1 + total_docs) / (1 + doc_freq[token])) + 1
            vector[token] = count * idf
        vectors.append(normalize_vector(vector))
    return vectors


def normalize_vector(vector: dict[str, float]) -> dict[str, float]:
    norm = math.sqrt(sum(value * value for value in vector.values()))
    if norm == 0:
        return vector
    return {key: value / norm for key, value in vector.items()}


def cosine(left: dict[str, float], right: dict[str, float]) -> float:
    if len(left) > len(right):
        left, right = right, left
    return sum(value * right.get(key, 0.0) for key, value in left.items())


def summarize_text(text: str, max_chars: int = 180) -> str:
    compact = re.sub(r"\s+", " ", text).strip()
    if len(compact) <= max_chars:
        return compact
    return compact[: max_chars - 1].rstrip() + "..."
