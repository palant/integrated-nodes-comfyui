import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

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

async function exportSelectedNodes() {
    let name;
    name = promptUser_nodeName();
    if (name === null) return;
    
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
    let yamlContent = generateYAML(name, category);

    //const directory = 'custom_nodes/integrated-nodes-comfyui'; //need to be able to set this dir when the saving function works...
    //await saveJSON(name, data, true, 'json');
    download(name + ".json", data); //Make it semi-usable for now at least, allows the user to manually move the created files to the correct directory (custom_nodes/integrated-nodes-comfyui/integrated_nodes/workflows)

    //await saveYAML(name, yamlContent, true, 'yaml');
    download(name + ".yaml", yamlContent);  //This file should be moved to custom_nodes/integrated-nodes-comfyui/integrated_nodes
}

async function exportFullWorkflow() {
    let name;
    name = promptUser_nodeName();   
    if (name === null) return;

    let category = prompt("Enter node category") || "Integrated";

    let data = JSON.stringify(app.graph.serialize());
    let yamlContent = generateYAML(name, category);

    //const directory = 'custom_nodes/integrated-nodes-comfyui'; //need to be able to set this dir when the saving function works...
    //await saveJSON(name, data, true, 'json');
    download(name + ".json", data); //Make it semi-usable for now at least, allows the user to manually move the created files to the correct directory (custom_nodes/integrated-nodes-comfyui/integrated_nodes/workflows)

    //await saveYAML(name, yamlContent, true, 'yaml');
    download(name + ".yaml", yamlContent); //This file should be moved to custom_nodes/integrated-nodes-comfyui/integrated_nodes
}

function promptUser_nodeName(){
    let name;
    do {
        name = prompt("Enter node name");
        if (name === null) return name;  // Exits the function if the user clicks 'Cancel'
    
        if (name.trim() === "") {
            alert('The name cannot be empty or consist only of white space');
            continue; // Go to the next iteration of the loop
        }
    
        if (!isNaN(Number(name))) {
            alert('The name cannot consist of only numbers');
        }
    } while (!isNaN(Number(name)) || name.trim() === "");

    return name;
}

function getSelectedNodes() {
    return app.canvas.selected_nodes ? Object.values(app.canvas.selected_nodes) : [];
}

function generateYAML(name, category) {
    let yamlContent = `
'${name}':
  display_name: '${name}'
  workflow: integrated_nodes/${name}.json
  category: '${category}'
  `;

    return yamlContent;
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}





async function saveJSON(name, workflow, overwrite, filetype) { //This isn't used; this is dependant on part of ComfyUI-Custom-Scripts, another solution is needed....
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

async function saveYAML(name, workflow, overwrite, filetype) { //This doesn't work at all...
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