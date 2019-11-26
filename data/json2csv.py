import csv
import json
from pprint import pprint
import sys

from typing import Any


def upconvert(value):
    try:
        return int(value)
    except ValueError:
        pass

    try:
        return float(value)
    except ValueError:
        pass

    return value


def parse_edge_file(stream):
    data = json.loads(stream.read())

    return [{'_from': row['From'], '_to': row['To']} for row in data['rows'] if row['From'] and row['To']]


def parse_edge_length_file(stream):
    data = json.loads(stream.read())

    return [row['x'] for row in data['rows']]


def parse_data_file(stream):
    data = json.loads(stream.read())

    return data['rows']


def parse_leaf_file(stream):
    data = csv.DictReader(stream)

    ret = []
    for row in data:
        val = {}
        for t in row.items():
            val[t[0]] = upconvert(t[1])
        ret.append(val)

    return ret


def write_csv(data, stream):
    writer = csv.DictWriter(stream, fieldnames = data[0].keys())

    writer.writeheader()
    for d in data:
        writer.writerow(d)


def tree_nodes(edges):
    return set(edge['_from'] for edge in edges).union(set(edge['_to'] for edge in edges))


def partition_tree(edges):
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


def generate_ids(s):
    return {enum[1]: enum[0] for enum in enumerate(s)}


def assemble_internal_nodes(root_node, internal_nodes, internal_data):
    ids = generate_ids(internal_nodes.union({root_node}))

    def augment(rec):
        rec['label'] = rec['nodeLabels']
        del rec['nodeLabels']

        rec['_key'] = ids[rec['label']]

        return rec

    data = sorted([augment(row) for row in internal_data], key = lambda row: row['_key'])

    return data


def assemble_leaf_nodes(leaf_nodes, leaf_data):
    ids = generate_ids(leaf_nodes)

    def augment(rec):
        # pprint(rec)
        rec['label'] = rec['species']
        del rec['species']

        try:
            rec['_key'] = ids[rec['label']]
        except KeyError:
            return None

        return rec

    data = [augment(row) for row in leaf_data]

    return sorted([x for x in data if x is not None], key = lambda row: row['_key'])


def main():
    basename = sys.argv[1]

    edgefile = f'{basename}-edges.json'
    with open(edgefile) as stream:
        edges = parse_edge_file(stream)

    edgelengthfile = f'{basename}-edge-lengths.json'
    with open(edgelengthfile) as stream:
        edge_lengths = parse_edge_length_file(stream)

    resfile = f'{basename}-res.json'
    with open(resfile) as stream:
        res = parse_data_file(stream)

    leafattrfile = f'{basename}-leaf-data.csv'
    with open(leafattrfile) as stream:
        leaf = parse_leaf_file(stream)

    nodes = tree_nodes(edges)

    # pprint(nodes)
    # print(len(nodes))

    # pprint(edges)
    # pprint(edge_lengths)
    # pprint(res)
    # pprint(leaf)

    partition = partition_tree(edges)

    # pprint(partition)

    internal_data = assemble_internal_nodes(partition['root'], partition['internal'], res)
    leaf_data = assemble_leaf_nodes(partition['leaf'], leaf)

    # pprint(internal_data)
    # pprint(leaf_data)

    # write_csv(internal_data, sys.stdout)
    write_csv(leaf_data, sys.stdout)

    return 0


if __name__ == '__main__':
    sys.exit(main())
