from __future__ import annotations

from dataclasses import dataclass

from .schemas import ChatMessage, TopicCluster
from .text import cosine, summarize_text, tfidf_vectors, tokenize, top_keywords


@dataclass(frozen=True)
class TopicDocument:
    id: str
    date_range: list[str]
    messages: list[ChatMessage]
    text: str


def build_topic_documents(messages: list[ChatMessage], chunk_size: int = 18) -> list[TopicDocument]:
    ordered = sorted(messages, key=lambda message: message.timestamp)
    documents: list[TopicDocument] = []

    for start in range(0, len(ordered), chunk_size):
        chunk = ordered[start : start + chunk_size]
        if not chunk:
            continue
        text = "\n".join(f"{message.sender}: {message.content}" for message in chunk)
        documents.append(
            TopicDocument(
                id=f"chunk-{len(documents) + 1}",
                date_range=[
                    chunk[0].timestamp.date().isoformat(),
                    chunk[-1].timestamp.date().isoformat(),
                ],
                messages=chunk,
                text=text,
            )
        )

    return documents


def cluster_topics(messages: list[ChatMessage], max_topics: int = 8) -> list[TopicCluster]:
    documents = build_topic_documents(messages)
    if not documents:
        return []

    vectors = tfidf_vectors([document.text for document in documents])
    clusters: list[list[int]] = []
    centroids: list[dict[str, float]] = []

    for index, vector in enumerate(vectors):
        best_cluster = -1
        best_score = 0.0
        for cluster_index, centroid in enumerate(centroids):
            score = cosine(vector, centroid)
            if score > best_score:
                best_cluster = cluster_index
                best_score = score

        if best_cluster >= 0 and best_score >= 0.22:
            clusters[best_cluster].append(index)
            centroids[best_cluster] = _centroid([vectors[item] for item in clusters[best_cluster]])
        else:
            clusters.append([index])
            centroids.append(vector)

    ranked_clusters = sorted(clusters, key=len, reverse=True)[:max_topics]
    topics: list[TopicCluster] = []
    for topic_index, cluster in enumerate(ranked_clusters, start=1):
        cluster_docs = [documents[index] for index in cluster]
        text_blobs = [document.text for document in cluster_docs]
        keywords = top_keywords(text_blobs, limit=6)
        label = ", ".join(keywords[:3]) if keywords else f"Topic {topic_index}"
        all_messages = [message for document in cluster_docs for message in document.messages]
        dates = [date for document in cluster_docs for date in document.date_range]
        samples = [
            summarize_text(message.content)
            for message in all_messages
            if tokenize(message.content)
        ][:3]

        topics.append(
            TopicCluster(
                id=f"topic-{topic_index}",
                label=label,
                keywords=keywords,
                document_count=len(cluster_docs),
                message_count=len(all_messages),
                date_range=[min(dates), max(dates)] if dates else [],
                sample_messages=samples,
            )
        )

    return topics


def _centroid(vectors: list[dict[str, float]]) -> dict[str, float]:
    combined: dict[str, float] = {}
    for vector in vectors:
        for key, value in vector.items():
            combined[key] = combined.get(key, 0.0) + value
    if not vectors:
        return combined
    return {key: value / len(vectors) for key, value in combined.items()}
