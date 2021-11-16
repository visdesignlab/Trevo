import { multinetApi } from "multinet";

/* Multinet data importer */
// Define local variables that will store the api url and the responses from the database
// const api_root = "https://multinet.app/api";
const api_root = "https://api.multinet.app/api";

// const api_root = "http://localhost:8000/api";

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
    return await api.networks(workspace);
}

export async function load_data(workspace, graph) {

    let multinetOb = new Multinet();

    const tables = await api.networkTables(workspace, graph);
    multinetOb.tables = tables;

    multinetOb.nodes[0] = await api.table(workspace, tables.filter(table => table.name.includes('internal'))[0].name, {limit: 1000});
    multinetOb.nodes[1] = await api.table(workspace, tables.filter(table => table.name.includes('leaf'))[0].name, {limit: 1000});
    multinetOb.links[0] = await api.table(workspace, tables.filter(table => table.name.includes('edges'))[0].name, {limit: 1000});

    // Set the graph structure
    multinetOb.graph_structure = {
        "nodes": multinetOb.nodes.map(nodeTable => nodeTable.results = rename_node_vars(nodeTable.results)),
        "links": multinetOb.links.map(linkTable => linkTable.results = rename_link_vars(linkTable.results))
    }
   
    return JSON.parse(JSON.stringify(multinetOb.graph_structure))
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
