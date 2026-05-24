from __future__ import annotations

import pandas as pd
import networkx as nx


def build_interaction_graph(df: pd.DataFrame) -> nx.DiGraph:
    graph = nx.DiGraph()
    if df.empty:
        return graph

    for sender in df["sender"].unique():
        graph.add_node(str(sender), message_count=int((df["sender"] == sender).sum()))

    replies = df.loc[df["is_reply"] & df["prev_sender"].notna()]
    for _, row in replies.iterrows():
        source = str(row["sender"])
        target = str(row["prev_sender"])
        weight = graph[source][target]["weight"] + 1 if graph.has_edge(source, target) else 1
        graph.add_edge(source, target, weight=weight)

    return graph


def graph_summary(df: pd.DataFrame) -> dict:
    graph = build_interaction_graph(df)
    top_edges = sorted(
        [
            {"from": source, "to": target, "reply_count": int(data["weight"])}
            for source, target, data in graph.edges(data=True)
        ],
        key=lambda item: item["reply_count"],
        reverse=True,
    )
    return {
        "node_count": int(graph.number_of_nodes()),
        "edge_count": int(graph.number_of_edges()),
        "top_reply_edges": top_edges[:10],
    }
