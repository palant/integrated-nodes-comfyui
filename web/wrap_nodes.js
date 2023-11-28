import { app } from "../../scripts/app.js";
import { api } from "../../../scripts/api.js";

app.registerExtension({
    name: "IntegrateNodes",
});

const orig = LGraphCanvas.prototype.getCanvasMenuOptions;

LGraphCanvas.prototype.getCanvasMenuOptions = function () {
    let options = orig.apply(this, arguments);
    options.push({ content: "Integrate Selection", callback: exportSelectedNodes });
    options.push({ content: "Integrate Workflow", callback: exportFullWorkflow });
    return options;
};

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Export selected nodes
async function exportSelectedNodes() {
    let name = prompt("Enter node name") || "Integrated Selection";
    let category = prompt("Enter node category") || "Integrated";

    const selectedNodes = getSelectedNodes();
    let serializedNodes = selectedNodes.map(node => node.serialize());
    let links = [];

    selectedNodes.forEach(node => {
        node.outputs.forEach((output, outputIndex) => {
            (output.links || []).forEach(linkId => {
                let link = app.graph.links[linkId];
                if (link && selectedNodes.includes(app.graph.getNodeById(link.target_id))) {
                    links.push([linkId, node.id, outputIndex, link.target_id, link.target_slot, link.type || "default"]);
                }
            });
        });
    });


    let lastNodeId = Math.max(...serializedNodes.map(node => node.id));
    let lastLinkId = links.length > 0 ? Math.max(...links.map(link => link[0])) : 0;

    let workflowData = {
        last_node_id: lastNodeId,
        last_link_id: lastLinkId,
        nodes: serializedNodes,
        links: links,
    };

    let data = JSON.stringify(workflowData);
    const yamlContent = generateYAML(name, category);

    //const directory = 'custom_nodes/integrated-nodes-comfyui'; //need to be able to set this dir when the saving function works...
    //await saveJSON(name, data, true, 'json');
    download(name + ".json", data); //Make it semi-usable for now at least, allows the user to manually mode the created files to the correct directory (custom_nodes/integrated-nodes-comfyui)

    //await saveYAML(name, yamlContent, true, 'yaml');
    download('add this code to integrated_nodes.yaml', yamlContent);  //Would perhaps want to append this to the file or add functionality to load a folder of yamls
}


async function exportFullWorkflow() {
    let name = prompt("Enter node name") || "Integrated Workflow";
    let category = prompt("Enter node category") || "Integrated";

    let data = JSON.stringify(app.graph.serialize());
    await saveFile(name, data, true, 'json');

    const yamlContent = generateYAML(name, category);
    await saveFile(name, yamlContent, true, 'yaml'); // Saving YAML content
}

function getSelectedNodes() {
    return app.canvas.selected_nodes ? Object.values(app.canvas.selected_nodes) : [];
}

async function saveJSON(name, workflow, overwrite, filetype) {
    let body;
    let route = "/pysssss/workflows"; // Adjust the route as needed
    let contentType;


    body = JSON.stringify({ name, workflow, overwrite });
    contentType = "application/json";



    try {
        const response = await api.fetchApi(route, {
            method: "POST",
            headers: {
                "Content-Type": contentType
            },
            body: body,
        });

        if (response.status === 201) {
            return true;
        } else if (response.status === 409) {
            return false;
        } else {
            throw new Error(response.statusText);
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function saveYAML(name, workflow, overwrite, filetype) {
    let body;
    let route = "/pysssss/files/yaml"; // Adjust the route as needed
    let contentType;


    body = workflow;
    contentType = "text/yaml";



    try {
        const response = await api.fetchApi(route, {
            method: "POST",
            headers: {
                "Content-Type": contentType
            },
            body: body,
        });

        if (response.status === 201) {
            return true;
        } else if (response.status === 409) {
            return false;
        } else {
            throw new Error(response.statusText);
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}


function generateYAML(name, category) {
    let yamlContent = `
${name}:
  display_name: ${name}
  workflow: ${name}.json
  category: ${category}
  `;

    return yamlContent;
}

