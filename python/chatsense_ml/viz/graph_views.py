from __future__ import annotations

import pandas as pd

from chatsense_ml.graphs.interaction_graph import build_interaction_graph


def pyvis_interaction_graph(features: pd.DataFrame, output_html: str) -> str:
    from pyvis.network import Network

    graph = build_interaction_graph(features)
    network = Network(height="700px", width="100%", directed=True)
    network.from_nx(graph)
    network.write_html(output_html)
    return output_html


def netgraph_interaction_graph(features: pd.DataFrame):
    from netgraph import Graph

    graph = build_interaction_graph(features)
    return Graph(graph, arrows=True)
