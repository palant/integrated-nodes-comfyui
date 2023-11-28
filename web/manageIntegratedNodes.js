import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { $el, ComfyDialog } from "/scripts/ui.js";

const DEFAULT_CATEGORY = "integrated";

class CreateNodeDialog extends ComfyDialog
{
  static instance = null;

  show(output)
  {
    let categories = LiteGraph.getNodeTypesCategories(this.filter || app.graph.filter);
    if (categories.includes(""))
      categories.splice(categories.indexOf(""), 1);
    if (!categories.includes(DEFAULT_CATEGORY))
      categories.push(DEFAULT_CATEGORY);
    categories.sort();

    super.show($el("form", {id: "integrated_node_form", onsubmit: e => this.onSubmit(e, output)}, [
      $el("table.comfy-table", {}, [
        $el("caption", {textContent: "Create Integrated Node from Selection"}),
        $el("tbody", {}, [
          $el("tr", {}, [
            $el("td", {textContent: "Internal Name (no whitespace or special characters)"}),
            $el("td", {}, [
              $el("input", {
                id: "integrated_node_name",
                placeholder: "IntegratedNode",
                required: true,
                pattern: "\\w+"
              })
            ]),
          ]),
          $el("tr", {}, [
            $el("td", {textContent: "Display Name"}),
            $el("td", {}, [
              $el("input", {
                id: "integrated_node_display",
                placeholder: "Integrated Node"
              })
            ]),
          ]),
          $el("tr", {}, [
            $el("td", {textContent: "Category"}),
            $el("td", {}, [
              $el("select", {id: "integrated_node_category"}, categories.map(c => $el("option", {
                value: c,
                textContent: c,
                selected: c == DEFAULT_CATEGORY
              })))
            ]),
          ]),
        ])
      ])
    ]));

    document.getElementById("integrated_node_name").focus();
  }

  createButtons()
  {
    return [
      $el("button", {
        textContent: "Create Node",
        type: "submit",
        style: {cursor: "pointer"},
        $: button => button.setAttribute("form", "integrated_node_form")
      }),
      ...super.createButtons()
    ];
  }

  async onSubmit(event, output)
  {
    event.preventDefault();

    let params = new URLSearchParams();
    params.append("prompt", JSON.stringify(output, undefined, 2));
    params.append("name", document.getElementById("integrated_node_name").value.trim());
    params.append("displayName", document.getElementById("integrated_node_display").value.trim());
    params.append("category", document.getElementById("integrated_node_category").value);

    let response = await fetch("/integrated_nodes/add", {
      method: "POST",
      body: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (response.status >= 300) {
      alert(`Failed adding node, server responded with: ${response.statusText}`);
      return;
    }

    let finalName = await response.text();
    let nodeDefs = await api.getNodeDefs();
    if (nodeDefs.hasOwnProperty(finalName))
      await app.registerNodesFromDefs({[finalName]: nodeDefs[finalName]});

    this.close();
  }
}

async function createIntegratedNode()
{
  let restore = [];
  for (let node of app.graph._nodes)
  {
    if (!this.selected_nodes.hasOwnProperty(node.id) && node.mode != 4)
    {
      // Mark node as bypassed so that it isn’t included in the output
      restore.push([node, node.mode]);
      node.mode = 4;
    }
  }

  let {output} = await app.graphToPrompt();

  for (let [node, origMode] of restore)
    node.mode = origMode;

  CreateNodeDialog.instance.show(output);
}

function getCanvasMenuOptions(origGetCanvasMenuOptions, ...args)
{
  let result = origGetCanvasMenuOptions.call(this, ...args);
  if (Object.keys(this.selected_nodes).length > 1)
  {
    result.push({
      content: "Create Integrated Node from Selection",
      callback: createIntegratedNode.bind(this)
    });
  }
  return result;
}

const ext = {
  name: "IntegratedNodes",
  async setup()
  {
    CreateNodeDialog.instance = new CreateNodeDialog();

    let origGetCanvasMenuOptions = LGraphCanvas.prototype.getCanvasMenuOptions;
    LGraphCanvas.prototype.getCanvasMenuOptions = function(...args)
    {
      return getCanvasMenuOptions.call(this, origGetCanvasMenuOptions, ...args)
    };
  },
};

app.registerExtension(ext);
