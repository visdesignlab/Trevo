import { multinetApi } from "multinet";

/* Multinet data importer */
// Define local variables that will store the api url and the responses from the database
// const api_root = "https://multinet.app/api";
const api_root = "https://api.multinet.app/api";

//const api_root = "http://localhost:5000/api";

class Multinet {
    constructor(){
        this.tables = {},
        this.nodes = [],
        this.links = [],
        this.graph_structure = {},
        this.api_root = api_root
    }
}

const api = multinetApi(api_root);

export async function getGraphNames(workspace){
    return await api.graphs(workspace);
}

export async function load_data(workspace, graph) {

    let multinetOb = new Multinet();

    // Fetch the names of all the node and edge tables 
    await load_tables(workspace, graph, multinetOb);

    // Loop through each node tables and fetch the nodes to global variables
    for (let node_table of multinetOb.tables.nodeTables) {
        await load_nodes(workspace, node_table, multinetOb);
    };

    // Load the edge table (ONLY ONE BECAUSE OF ARANGO API LIMITATIONS) to a global variable
    let edge_table = multinetOb.tables.edgeTable;
    await load_links(workspace, edge_table, multinetOb);

    // Set the graph structure
    multinetOb.graph_structure = { "nodes": rename_node_vars(multinetOb.nodes), "links": rename_link_vars(multinetOb.links) }
   
    return JSON.parse(JSON.stringify(multinetOb.graph_structure))
};

async function load_tables(workspace, graph, multinetOb) {
    multinetOb.tables = await api.graph(workspace, graph);
};

async function load_nodes(workspace, node_table, multinetOb) {
    const table = await api.table(workspace, node_table, {
      limit: 1000,
    });
    multinetOb.nodes = [].concat(multinetOb.nodes, table);
};

async function load_links(workspace, edge_table, multinetOb) {
    const table = await api.table(workspace, edge_table, {
      limit: 1000,
    });
    multinetOb.links = [].concat(multinetOb.links, table)
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
