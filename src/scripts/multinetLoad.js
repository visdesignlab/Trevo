import { multinetApi } from "multinet";

/* Multinet data importer */
// Define local variables that will store the api url and the responses from the database
let multinet = {
    tables: {},
    nodes: [],
    links: [],
    graph_structure: {},
    api_root: "https://multinet.app/api"
};

const api = multinetApi(multinet.api_root);

export async function getGraphNames(workspace){
  
    return await api.graphs(workspace);
}

export async function load_data(workspace, graph) {
    // Fetch the names of all the node and edge tables 
    await load_tables(workspace, graph);

    // Loop through each node tables and fetch the nodes to global variables
    for (let node_table of multinet.tables.nodeTables) {
        await load_nodes(workspace, node_table);
    };

    // Load the edge table (ONLY ONE BECAUSE OF ARANGO API LIMITATIONS) to a global variable
    let edge_table = multinet.tables.edgeTable;
    await load_links(workspace, edge_table);

    // Set the graph structure
    multinet.graph_structure = { "nodes": rename_node_vars(multinet.nodes), "links": rename_link_vars(multinet.links) }
    return JSON.parse(JSON.stringify(multinet.graph_structure))
};

async function load_tables(workspace, graph) {
    multinet.tables = await api.graph(workspace, graph);
};

async function load_nodes(workspace, node_table) {
    const table = await api.table(workspace, node_table, {
      limit: 1000,
    });
    multinet.nodes = [].concat(multinet.nodes, table);
};

async function load_links(workspace, edge_table) {
    const table = await api.table(workspace, edge_table, {
      limit: 1000,
    });
    multinet.links = [].concat(multinet.links, table)
};

function rename_link_vars(links) {
    for (let row of links) {
        row.id = row._id;
        row.source = row._from;
        row.target = row._to;

        delete row._id;
        delete row._from;
        delete row._to;
    };

    return links;
}

function rename_node_vars(nodes) {
    for (let row of nodes) {
        row.id = row._id;

        delete row._id;
    };

    return nodes;
}
