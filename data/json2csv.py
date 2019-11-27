import csv
import json
import sys

from typing import Any, TextIO, List, Sequence, Set, Optional, Dict, Mapping, Literal
from mypy_extensions import TypedDict

class EdgeRow(TypedDict):
    _from: str
    _to: str


class PartitionSpec(TypedDict):
    root: str
    internal: Set[str]
    leaf: Set[str]


DataRow = Dict[str, Any]
IdTable = Mapping[str, int]
LengthTable = Mapping[str, float]


# Converts a string value to its most precise convertable form.
def upconvert(value: str) -> Any:
    try:
        return int(value)
    except ValueError:
        pass

    try:
        return float(value)
    except ValueError:
        pass

    return value


def parse_edge_file(stream: TextIO) -> Sequence[EdgeRow]:
    data = json.loads(stream.read())

    return [{'_from': row['From'], '_to': row['To']} for row in data['rows'] if row['From'] and row['To']]


def parse_edge_length_file(stream: TextIO) -> Sequence[float]:
    data = json.loads(stream.read())

    return [row['x'] for row in data['rows']]


def parse_data_file(stream: TextIO) -> Sequence[DataRow]:
    data = json.loads(stream.read())

    return data['rows']


def parse_leaf_file(stream: TextIO) -> Sequence[DataRow]:
    data = csv.DictReader(stream)

    ret = []
    for row in data:
        val = {}
        for t in row.items():
            val[t[0]] = upconvert(t[1])
        ret.append(val)

    return ret


def edge_length_table(edges: Sequence[EdgeRow], lengths: Sequence[float], root: str) -> LengthTable:
    assert len(edges) == len(lengths)
    table = {edge['_to']: length for (edge, length) in zip(edges, lengths)}

    assert root not in table

    table[root] = 0

    return table


def update_edges(edges: Sequence[EdgeRow], intIds: IdTable, leafIds: IdTable, outname: str) -> Sequence[EdgeRow]:
    columns: List[Literal['_from', '_to']] = ['_from', '_to']
    for edge in edges:
        for column in columns:

            label = edge[column]

            assert label in intIds or label in leafIds
            table = internal_table_name(outname) if label in intIds else leaf_table_name(outname)
            key = intIds[label] if label in intIds else leafIds[label]

            edge[column] = f'{table}/{key}'

    return edges


def internal_table_name(outname: str) -> str:
    return f'{outname}_internal'


def leaf_table_name(outname: str) -> str:
    return f'{outname}_leaf'


def edge_table_name(outname: str) -> str:
    return f'{outname}_edges'


def write_csv(data: Sequence[Mapping[str, Any]], stream: TextIO) -> None:
    writer = csv.DictWriter(stream, fieldnames = data[0].keys())

    writer.writeheader()
    for d in data:
        writer.writerow(d)


def tree_nodes(edges: Sequence[EdgeRow]) -> Set[str]:
    return set(edge['_from'] for edge in edges).union(set(edge['_to'] for edge in edges))


def partition_tree(edges: Sequence[EdgeRow]) -> PartitionSpec:
    # Create candidate sets for the root and leaf nodes respectively,
    # initializing them to set of all nodes.
    nodes = tree_nodes(edges)
    root_cand = set(nodes)
    leaf_cand = set(nodes)

    # Begin a sweep through the edge list, eliminating candidates from the sets
    # as we go.
    for edge in edges:
        # If a node is pointed to, then it cannot be the root.
        root_cand.discard(edge['_to'])

        # If it is being pointed from, then it cannot be a leaf.
        leaf_cand.discard(edge['_from'])

    # The internal nodes are the ones that are neither leaves nor the root.
    int_cand = nodes - root_cand - leaf_cand

    assert len(root_cand) == 1

    return {
        'root': root_cand.pop(),
        'internal': int_cand,
        'leaf': leaf_cand
    }


def generate_ids(s: Set[str]) -> IdTable:
    return {enum[1]: enum[0] for enum in enumerate(s)}


def assemble_internal_nodes(ids: IdTable, internal_data: Sequence[DataRow], lengths: LengthTable) -> Sequence[DataRow]:
    def augment(rec: DataRow) -> DataRow:
        rec['label'] = rec['nodeLabels']
        del rec['nodeLabels']

        rec['_key'] = ids[rec['label']]

        rec['length'] = lengths[rec['label']]

        return rec

    data = sorted([augment(row) for row in internal_data], key = lambda row: row['_key'])

    return data


def assemble_leaf_nodes(ids: IdTable, leaf_data: Sequence[DataRow]) -> Sequence[DataRow]:
    def augment(rec: DataRow) -> Optional[DataRow]:
        rec['label'] = rec['species']
        del rec['species']

        try:
            rec['_key'] = ids[rec['label']]
        except KeyError:
            return None

        return rec

    data = [augment(row) for row in leaf_data]

    return sorted([x for x in data if x is not None], key = lambda row: row['_key'])


def eprint(*args: Any, **kwargs: Any) -> None:
    kwargs['file'] = sys.stderr
    print(*args, **kwargs)


def main() -> int:
    if len(sys.argv) < 3:
        eprint('usage: json2csv.py BASENAME OUTNAME')
        eprint()

        eprint('BASENAME represents a collection of Arbor output files, including BASENAME-edges.json, BASENAME-edge-lengths.json, BASENAME-res.json, and BASENAME-leaf-data.csv.')
        eprint()

        eprint('OUTNAME names a collection of CSV output files, including OUTNAME_internal.csv, OUTNAME_leaf.csv, and OUTNAME_edges.csv.')

        return 1

    # Collect command line arguments
    basename = sys.argv[1]
    outname = sys.argv[2]

    # Open and parse data input files.
    #
    # The edge file determines the topology of the graph.
    edgefile = f'{basename}-edges.json'
    with open(edgefile) as stream:
        edges = parse_edge_file(stream)

    # Edge lengths are listed in the same order as the edges.
    edgelengthfile = f'{basename}-edge-lengths.json'
    with open(edgelengthfile) as stream:
        edge_lengths = parse_edge_length_file(stream)

    # The internal node data is stored, with uncertainty values, in a JSON file.
    resfile = f'{basename}-res.json'
    with open(resfile) as stream:
        res = parse_data_file(stream)

    # The leaf node data has no uncertainty values, and is stored in a CSV file.
    leafattrfile = f'{basename}-leaf-data.csv'
    with open(leafattrfile) as stream:
        leaf = parse_leaf_file(stream)

    # Create a partition of the tree's nodes into a root node, internal nodes,
    # and leaf nodes. The root node is technically an internal node, but it is
    # partitioned separately because it's useful to do so.
    partition = partition_tree(edges)

    # Create a table from node name to edge length (while the specially called
    # out root node is assigned a 0 length). The length data gives the lengths
    # of each edge, but the length is encoded into the data carried by the
    # target node of each edge (explaining why the root, which no edge targets,
    # gets a hard-coded 0).
    node_lengths = edge_length_table(edges, edge_lengths, partition['root'])

    # Generate internal key values for the internal nodes, then create a table
    # of internal node data.
    internalIds = generate_ids(partition['internal'].union({partition['root']}))
    internal_data = assemble_internal_nodes(internalIds, res, node_lengths)

    # Do the same for the leaf data.
    leafIds = generate_ids(partition['leaf'])
    leaf_data = assemble_leaf_nodes(leafIds, leaf)

    # Update the edge data with corrected ids (constructed from the table name
    # and the correct key value).
    edges = update_edges(edges, internalIds, leafIds, outname)

    # Write out all the computed data to CSV files.
    with open(f'{internal_table_name(outname)}.csv', 'w') as out:
        write_csv(internal_data, out)

    with open(f'{leaf_table_name(outname)}.csv', 'w') as out:
        write_csv(leaf_data, out)

    with open(f'{edge_table_name(outname)}.csv', 'w') as out:
        write_csv(edges, out)

    return 0


if __name__ == '__main__':
    sys.exit(main())
