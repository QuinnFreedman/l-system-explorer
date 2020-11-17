"use strict";

const angleInput = document.querySelector("#angle")
const visibleInput = document.querySelector("#visible")
const invisibleInput = document.querySelector("#invisible")
const constantsInput = document.querySelector("#constants")
const axiumInput = document.querySelector("#axium")
const iterationsInput = document.querySelector("#iterations")
const ruleDiv = document.querySelector("#rules")
const outputDiv = document.querySelector("#output")
const canvas = document.querySelector("#canvas")
const canvasContainer = document.querySelector("#canvas-container")

function parseVars(str) {
    return str.replace(/\s+|,+/g, "").split("").filter((x) => x)
}

function makeRuleInputs() {
    const variables = parseVars(visibleInput.value).concat(parseVars(invisibleInput.value))

    const alreadyHave = []

    const toRemove = []
    
    for (let el of ruleDiv.children) {
        const v = el.dataset['variable']
        if (variables.includes(v)) {
            alreadyHave.push(v)
        } else {
            toRemove.push(el)
        }
    }

    for (let el of toRemove) {
        el.remove()
    }
    
    for (let v of variables) {
        if (alreadyHave.includes(v)) continue
        const div = document.createElement("div")
        div.innerHTML = `<label for="rule_${v}">${v} →</label> <input type="text" name="rule_${v}" id="rule_${v}" value="${v}" />`
        div.dataset.variable = v
        div.className = "row"
        ruleDiv.appendChild(div)
    }
}
window.zoomLevel = 1
document.querySelector("#zoom_in").addEventListener("click", () => { zoomLevel *= 2; redrawCanvas(false) })
document.querySelector("#zoom_out").addEventListener("click", () => { zoomLevel = zoomLevel / 2; redrawCanvas(false) })

function onEnter(f) {
    return function(event) {
        if (event.keyCode === 13) {
            event.preventDefault()
            f()
        }
    }
}

makeRuleInputs()
visibleInput.addEventListener("focusout", makeRuleInputs)
invisibleInput.addEventListener("focusout", makeRuleInputs)
visibleInput.addEventListener("keyup", onEnter(makeRuleInputs))
invisibleInput.addEventListener("keyup", onEnter(makeRuleInputs))
        
document.querySelector("#run").addEventListener("click", run)

function isTooBigForInteractive() {
    return nodeGraph[nodeGraph.length - 1].length > 1000
}

function run() {
    const angle = parseFloat(angleInput.value)
    if (isNaN(angle)) {
        alert("Angle must be a number")
    }
    
    const iterations = parseFloat(iterationsInput.value)
    if (isNaN(iterations)) {
        alert("Angle must be a number")
    }

    const args = {
        variables: parseVars(visible.value),
        hiddenVariables: parseVars(invisible.value),
        rules: {},
        axium: axiumInput.value.replace(/−/g, "-"),
        constants: parseVars(constantsInput.value),
        iterations: iterations,
    }

    for (let v of args.variables.concat(args.hiddenVariables)) {
        const ruleInput = document.querySelector(`#rule_${v}`)
        args.rules[v] = ruleInput.value.replace(/−/g, "-")
    }

    window.nodeGraph = generateGraph(args)
    const big = isTooBigForInteractive()
    setupView(big)
    redrawCanvas(false)
}
setTimeout(run, 100)

window.uidCounter = 0
window.activeNode = -1
window.activeLevel = -1

function Node(value, parentNode) {
    this.uniqueId = ++window.uidCounter
    this.value = value
    this.parentNode = parentNode
    this.children = []
}

function generateGraph(args) {
    let output = []
    let leafList = [new Node(args.axium, null)]
    output.push(leafList)
    for (let i = 0; i < args.iterations; i++) {
        leafList = expandLSystemGraph(leafList, args.rules, args.constants)
        output.push(leafList)
    }
    return output
}

function addStyle(text) {
    const style = document.createElement("style")
    style.type = "text/css"
    style.innerHTML = text
    document.getElementsByTagName("head")[0].appendChild(style)
}

function getParents(node) {
    const parents = []
    node = node.parentNode
    while (node) {
        parents.push(node)
        node = node.parentNode
    }
    return parents
}

function getDepth(node) {
    let depth = 0
    node = node.parentNode
    while (node) {
        depth++
        node = node.parentNode
    }
    return depth
}

/*
function getChildren(node) {
    let children = node.children
    for (let child of node.children) {
        children = children.concat(children, getChildren(child))
    }
    return children
}
*/

function setupView(skipInteractive) {
    const graph = window.nodeGraph
    while (outputDiv.firstChild) {
        outputDiv.removeChild(outputDiv.firstChild);
    }
    if (skipInteractive) {
        const el = document.createElement("span")
        el.innerText = "Model too big for interactive mode."
        outputDiv.appendChild(el)
        return
    }
    
    let i = 0
    for (let leafList of graph) {
        const level = i
        const lineNum = document.createElement("span")
        lineNum.innerText = `0${level}`
        lineNum.id = `line_${level}`
        lineNum.addEventListener("mouseover", () => {
            window.activeNode = -1
            window.activeLevel = level
            updateView()
        })
        outputDiv.appendChild(lineNum)
        outputDiv.appendChild(document.createTextNode("| "))
        for (let node of leafList) {
            const el = document.createElement("span")
            el.innerText = node.value
            el.id = `node_${node.uniqueId}`
            el.addEventListener("mouseover", () => {
                window.activeNode = node.uniqueId
                //window.activeLevel = level
                //window.activeLevel = -1
                window.activeLevel = Math.max(window.activeLevel, level)
                updateView()
            })
            outputDiv.appendChild(el)
        }
        outputDiv.appendChild(document.createElement("br"))
        i++
    }
}

function parentIsActive(node) {
    node = node.parentNode
    while (node) {
        if (node.uniqueId == window.activeNode) {
            return true;
        }
        node = node.parentNode
    }
    return false
}

function updateView() {
    const graph = window.nodeGraph

    let activeNode = null;

    let i = 0
    for (let leafList of graph) {
        const lineNum = document.getElementById(`line_${i}`)
        if (i === window.activeLevel) {
            lineNum.className = "active"
        } else {
            lineNum.className = ""
        }
        for (let node of leafList) {
            const el = document.getElementById(`node_${node.uniqueId}`)
            let className = ""
            if (node.uniqueId === window.activeNode) {
                className = "active"
                activeNode = node
            } else if (parentIsActive(node)) {
                className = "parent-active"
            }
            el.className = className
        }
        i++
    }

    if (activeNode) {
        for (let node of getParents(activeNode)) {
            const el = document.getElementById(`node_${node.uniqueId}`)
            let className = "child-active"
            el.className = className
        }
    }

    redrawCanvas(window.activeNode >= 0)
}

function lerp(a, b, x) {
    return a * (1 - x) + b * x
}

function redrawCanvas(interactive) {
    const ctx = canvas.getContext("2d")
    const width = parseFloat(canvasContainer.clientWidth)
    const height = parseFloat(canvasContainer.clientHeight)
    
    canvas.width = width
    canvas.height = height
    ctx.translate(width / 2, height / 2)

    const maxIterations = window.nodeGraph.length - 1

    const degrees = parseFloat(angleInput.value)
    if (isNaN(degrees)) {
        alert("Angle must be a number")
    }
    const activeLevel = window.activeLevel >= 0 ? window.activeLevel : maxIterations
    const rads = degrees * (Math.PI / 180)
    const unit = 40 * zoomLevel / (activeLevel + 1)

    const color1HSL = [0, 100, 50]
    const color2HSL = [112, 72, 42]

    const instructions = window.nodeGraph[activeLevel]
    const variables = parseVars(visibleInput.value)
    const invis = parseVars(invisibleInput.value)
    let i = 0
    for (let node of instructions) {
        for (let c of node.value) {
            if (c === "+") {
                ctx.rotate(rads)
            } else if (c === "-") {
                ctx.rotate(-rads)
            } else if (c === "[") {
                ctx.save()
            } else if (c === "]") {
                ctx.restore()
            } else if (variables.includes(c)) {
                if (interactive) {
                    if (node.uniqueId === window.activeNode) {
                        ctx.strokeStyle = "gold"
                        ctx.lineWidth = 5
                    } else if (parentIsActive(node)) {
                        ctx.strokeStyle = "black"
                        ctx.lineWidth = 1
                    } else {
                        ctx.strokeStyle = "lightgray"
                        ctx.lineWidth = 1
                    }
                } else {
                    const t = i / instructions.length

                    const color = [
                        lerp(color1HSL[0], color2HSL[0], t),
                        lerp(color1HSL[1], color2HSL[1], t),
                        lerp(color1HSL[2], color2HSL[2], t),
                    ]
                    
                    ctx.strokeStyle = `hsl(${color[0]}, ${color[1]}%, ${color[2]}%)`
                    ctx.lineWidth = 1
                    
                }
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.lineTo(0, -unit)
                ctx.translate(0, -unit)
                ctx.stroke()
            } else if (c && c.trim() && !invis.includes(c)) {
                console.log("Unknown variable", c)
                alert(`Unknown variable: ${c}`)
                return
            }
        }
        i++
    }
}

function expandLSystemGraph(list, rules, constants) {
    let newList = []
    for (let node of list) {
        for (let c of node.value) {
            let newNode
            if (constants.includes(c)) {
                newNode = new Node(c, node)                
            } else {
                newNode = new Node(rules[c] || "", node)
            }
            node.children.push(newNode)
            newList.push(newNode)
        }
    }
    return newList
}

/*
function expandLSystem(str, rules, constants) {
    let newStr = ""
    for (let c of str) {
        if (constants.includes(c)) {
            newStr += c
        } else {
            newStr += rules[c] || ""
        }
    }
    return newStr
}
*/

outputDiv.addEventListener("mouseleave", () => {
    window.activeNode = -1
    window.activeLevel = -1
    if (!isTooBigForInteractive()) {
        updateView()
    }
})

canvasContainer.addEventListener("mouseup", () => {
    redrawCanvas(false)
})
