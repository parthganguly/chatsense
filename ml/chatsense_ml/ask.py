from __future__ import annotations

from .schemas import AskAnswer, AskSnippet, ChatMessage
from .text import cosine, summarize_text, tfidf_vectors, tokenize, top_keywords
from .topics import build_topic_documents

QUERY_EXPANSIONS = {
    "tension": ["upset", "hurt", "ignored", "sorry", "stressed", "argument", "fight"],
    "conflict": ["upset", "hurt", "ignored", "sorry", "argument", "fight", "wrong"],
    "support": ["help", "understand", "care", "listen", "thanks", "here"],
    "warmth": ["love", "missed", "nice", "sweet", "thanks", "care"],
    "distance": ["gap", "ignored", "late", "busy", "silence", "tired"],
    "plan": ["meeting", "coffee", "dinner", "weekend", "project", "today"],
}


def build_ask_index(messages: list[ChatMessage]) -> list[AskSnippet]:
    snippets: list[AskSnippet] = []
    for document in build_topic_documents(messages, chunk_size=12):
        senders = sorted({message.sender for message in document.messages})
        snippets.append(
            AskSnippet(
                id=document.id,
                date_range=document.date_range,
                senders=senders,
                text=summarize_text(document.text, max_chars=650),
                keywords=top_keywords([document.text], limit=8),
            )
        )
    return snippets


def answer_question(index: list[AskSnippet], question: str, limit: int = 4) -> AskAnswer:
    if not question.strip() or not index:
        return AskAnswer(
            question=question,
            answer="I need a question and enough chat history to answer from evidence.",
            confidence=0.0,
            evidence=[],
        )

    docs = [snippet.text for snippet in index]
    vectors = tfidf_vectors([_expand_question(question), *docs])
    query_vector = vectors[0]
    scored = [
        (cosine(query_vector, vector), snippet)
        for vector, snippet in zip(vectors[1:], index, strict=True)
    ]
    evidence = [
        snippet
        for score, snippet in sorted(scored, key=lambda item: item[0], reverse=True)
        if score > 0
    ][:limit]

    if not evidence:
        return AskAnswer(
            question=question,
            answer="I could not find strong matching evidence in this chat yet.",
            confidence=0.1,
            evidence=[],
        )

    top_score = max(score for score, _snippet in scored)
    keywords = sorted({keyword for snippet in evidence for keyword in snippet.keywords})[:8]
    date_ranges = [f"{item.date_range[0]} to {item.date_range[-1]}" for item in evidence]
    answer = (
        "The closest evidence is around "
        f"{'; '.join(date_ranges)}. "
        f"Recurring terms include {', '.join(keywords) if keywords else 'no strong keywords'}. "
        "Use the snippets as grounded context rather than a final judgment."
    )

    return AskAnswer(
        question=question,
        answer=answer,
        confidence=round(min(0.95, 0.25 + top_score), 4),
        evidence=evidence,
    )


def _expand_question(question: str) -> str:
    expansions: list[str] = []
    tokens = set(tokenize(question))
    for token in tokens:
        expansions.extend(QUERY_EXPANSIONS.get(token, []))
    return " ".join([question, *expansions])
