// setup canvas & context
document.body.style.margin = 0
canvas = document.getElementById("canvas")
ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

var FONT_HEIGHT = 20
const INPUT = 0
const OUTPUT = 1

const PALLETE = {
	background: "#333",
	sidebar: {
		fontFamily: "sans-serif",
		background: "#202020",
		block: "#444",
		dragging: "#888",
		text: "#fff",
		disabled: "#1c1c1c",
	},
	topbar: {
		background: "#272727",
		text: "#fff",
		font: "24px sans-serif"
	},
	playbar: {
		background: "#111",
		fontSize: 30,
		fontFamily: "sans-serif"
	},
	block: {
		color: "#666",
		editablename: "#555"
	},
	node: {
		default: "#fff",
		disabled: "#444",
		active: "#bbb"
	},
	line: {
		off: "#000",
		on: "#f00"
	}
}
const LAYOUT = {
	sidebar: {
		width: 250,
		handlebar: 2
	},
	playbar: {
		width: 250,
		minwidth: 250
	},
	topbar: {
		height: 50
	},
	block: {
		radius: 9,
		endpoint: {
			radius: 3
		}
	},
	node: {
		padding: 13,
		radius: 5
	},
	line: {
		width: 3
	}
}

ctx.font = FONT_HEIGHT+"px sans-serif"

playing = false
var cache 
// https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
  if (width < 0 || height < 0) return ctx
  radius = Math.min(width, height, radius)

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  return ctx
}

var interactive_zones = []
function render() {
	// reset
	ctx.clearRect(0,0, canvas.width, canvas.height)
	interactive_zones = [[0,0,canvas.width,canvas.height,"none"]]

	// draw all the connections
	for (let i=0; i<customBlocks[editing].innards.length; i++) {
		for (let j=0; j<customBlocks[editing].innards[i].links.length; j++) {
			customBlocks[editing].innards[i].links[j].forEach(connection=>renderConnection([i,j], connection))
		}
	}
	
	// draw all the inner block things
	customBlocks[editing].innards.forEach((block,i)=>{
		renderBlock(block.id, block.x, block.y, PALLETE.block.color, block.name, i).forEach(([...args])=>interactive_zones.push([...args, i]))
	})

	// render when connecting a node
	if (connecting) {
		ctx.strokeStyle = PALLETE.line.off
		ctx.lineWidth = LAYOUT.line.width
		ctx.beginPath()
		ctx.moveTo(connecting.sx, connecting.sy)
		ctx.lineTo(mouse.x, mouse.y)
		ctx.stroke()
		// make obvious where to where is being connected x3
		ctx.fillStyle = PALLETE.node.active
		drawNode(connecting.sx, connecting.sy)
		if (connecting.to) drawNode(connecting.ex, connecting.ey)
	}

	// top bar thing
	ctx.font = PALLETE.topbar.font
	ctx.fillStyle = PALLETE.topbar.background
	ctx.fillRect(0,0,canvas.width,LAYOUT.topbar.height)
	ctx.fillStyle = PALLETE.topbar.text
	ctx.fillText(customBlocks[editing].name, LAYOUT.playbar.width + 20, 33)

	interactive_zones.push([LAYOUT.playbar.width+20-5, 5, ctx.measureText(customBlocks[editing].name).width+10, 50-10, "rename"])

	// sidebar
	ctx.fillStyle = PALLETE.sidebar.background
	ctx.fillRect(0,0,LAYOUT.sidebar.width,canvas.height)
	interactive_zones.push([LAYOUT.sidebar.width-LAYOUT.sidebar.handlebar,0, LAYOUT.sidebar.handlebar*2, canvas.height, "sidebarresize"])

	ctx.font = `${FONT_HEIGHT}px ${PALLETE.sidebar.fontFamily}`
	customBlocks.forEach(renderCustom)

	// toolbox bar thing
	ctx.fillStyle = PALLETE.playbar.background
	ctx.fillRect(0,0,LAYOUT.playbar.width,50)

	ctx.font = `${PALLETE.playbar.fontSize}px ${PALLETE.playbar.fontFamily}`
	ctx.fillStyle = "white"
	ctx.fillText("▶⏸"[playing*1],15,35)
	interactive_zones.push([15 -3,10 -3, PALLETE.playbar.fontSize+6, PALLETE.playbar.fontSize+6, "toggleplay"])

	for (let i=0; i<3; i++) {
		let x = 240-(i+1)*(PALLETE.playbar.fontSize+10)+5
		ctx.fillText(['❌','💾','➕'][i], x,35)
		interactive_zones.push([x+5-3, 10-3, PALLETE.playbar.fontSize+6, PALLETE.playbar.fontSize+6, ["clear", "savenew", "createnew"][i]])

	}

	// render when dragging a thing
	if (dragging) {
		renderBlock(dragging.id, mouse.x - dragging.xOffset, mouse.y - dragging.yOffset, PALLETE.sidebar.dragging, dragging.name)
	}

	/*
	interactive_zones.forEach(([x,y,w,h],i)=>{
		ctx.strokeStyle = i==mouseover?"green":"red"
		ctx.strokeRect(x,y,w,h)
	})
	/**/
}

SAVED_HEIGHT = 50
SAVED_PADDING = 10
SCROLLBAR_WIDTH = 5
function renderCustom({name, core}, i) {
	let width = Math.min(ctx.measureText(name).width+SAVED_PADDING+35, LAYOUT.sidebar.width-SAVED_PADDING*2-SCROLLBAR_WIDTH)

	ctx.fillStyle = disabledBlocks.includes(i)?PALLETE.sidebar.disabled:PALLETE.sidebar.block
	let y_position = Math.round(i*SAVED_HEIGHT)-sidebarScroll +SAVED_PADDING,
	dimensions = [SAVED_PADDING, y_position, width -(26*core), SAVED_HEIGHT-SAVED_PADDING]
	let noclip = ctx.save()
	ctx.roundRect(...dimensions, 9).clip()
	ctx.fill()
	interactive_zones.push([...dimensions, disabledBlocks.includes(i)?"disabled":"dragcustom", i])

	let text_y = Math.round(y_position + (SAVED_HEIGHT-SAVED_PADDING)/2 + FONT_HEIGHT/3)
	ctx.fillStyle = PALLETE.sidebar.text
	ctx.fillText(name, SAVED_PADDING*2, text_y, width-SAVED_PADDING-35)

	if (!core) {
		ctx.fillText("✎", SAVED_PADDING*2 + width-(0.8*SAVED_HEIGHT), text_y)
		interactive_zones.push([SAVED_PADDING*2 + width-(0.8*SAVED_HEIGHT) -2, y_position+FONT_HEIGHT/2 -2, 20 +4, 20 +4, "edit", i])
	}
	ctx.restore(noclip) // reset it back to nothing
}

function renderBlock(id, x, y, colour, customname, instancenum) {
	var interactive_zones = [] // make a local one so we dont have to actually add them 

	ctx.fillStyle = colour || customBlocks[id]

	let block = customBlocks[id]
	let nodeCount = Math.max(block.in.length, block.out.length)

	// draw background thing
	ctx.font = `${FONT_HEIGHT}px ${PALLETE.sidebar.fontFamily}`
	let name = id==OUTPUT||id==INPUT?customname:block.name
	let width = ctx.measureText(name).width + 20
	let height = Math.max(LAYOUT.node.padding*nodeCount+SAVED_PADDING, SAVED_HEIGHT-SAVED_PADDING) 

	ctx.roundRect(x, y, width, height, LAYOUT.block.radius).fill()
	interactive_zones.push([x,y,width,height,"block",id])
	if (id==INPUT || id==OUTPUT) {
		ctx.roundRect(x+(id==OUTPUT)*(width-LAYOUT.block.radius-LAYOUT.block.endpoint.radius), y, LAYOUT.block.radius+LAYOUT.block.endpoint.radius, height, LAYOUT.block.endpoint.radius).fill()

		let dimensions = [x +20/2 -2, y+SAVED_PADDING -4, width-20 +2*2, height-SAVED_PADDING*2 +4*2]
		ctx.fillStyle = PALLETE.block.editablename
		ctx.fillRect(...dimensions)
		interactive_zones.push([...dimensions, "editname", id])
	}
	// draw name
	ctx.fillStyle = PALLETE.sidebar.text
	ctx.fillText(name, x + SAVED_PADDING, Math.round(y+ height/2 + FONT_HEIGHT/3))
	
	// draw nodes
	var radius = 3
	var disabled = false
	ctx.fillStyle = PALLETE.node.default
	if (connecting && (connecting.isFromInput || connecting.from[0]==instancenum || customBlocks[editing].innards[instancenum].leadsTo.includes(connecting.from[0]))) { ctx.fillStyle = PALLETE.node.disabled; disabled=true }
	let nodeOffset = height/2 - LAYOUT.node.padding*(block.in.length-1)/2
	for (let i=0; i<block.in.length; i++) { 
		interactive_zones.push([...drawNode(x, y + nodeOffset + LAYOUT.node.padding*i), disabled?"disablednode":"innode",i])
	}
	if (connecting) { ctx.fillStyle = (connecting.isFromInput&&connecting.from[0]!==instancenum&&!customBlocks[editing].innards[connecting.from[0]].leadsTo.includes(instancenum))?PALLETE.node.default:PALLETE.node.disabled; disabled=true }
	let enodeOffset = height/2 - LAYOUT.node.padding*(block.out.length-1)/2 
	for (let i=0; i<block.out.length; i++) { 
		interactive_zones.push([...drawNode(x + width, y + enodeOffset + LAYOUT.node.padding*i), disabled?"disablednode":"outnode",i])
	}

	if (instancenum!==undefined) customBlocks[editing].innards[instancenum].nodeOffset = [[0, nodeOffset], [width, enodeOffset]]
	
	return interactive_zones
}

function drawNode(x,y) { // just a D.R.Y. thing
	ctx.beginPath(); 
	ctx.arc(x, y, LAYOUT.node.radius, 0, 2 * Math.PI) ; 
	ctx.fill()
	return [x-LAYOUT.node.radius, y-LAYOUT.node.radius, 2*LAYOUT.node.radius, 2*LAYOUT.node.radius]
}

function renderConnection([startBlock, startNode], [endBlock, endNode]) {
	let start = customBlocks[editing].innards[startBlock]
	ctx.strokeStyle = start.outputStates[startNode]?PALLETE.line.on:PALLETE.line.off
	let end = customBlocks[editing].innards[endBlock]

	let [_,[sx,sy]] = start.nodeOffset
	let [[ex,ey],__] = end.nodeOffset
	sx += start.x
	ex = end.x
	sy += start.y + LAYOUT.node.padding*startNode
	ey += end.y + LAYOUT.node.padding*endNode

//	console.log(sx,sy,ex,ey)
	ctx.beginPath()
	ctx.moveTo(sx,sy)
	ctx.lineTo(ex,ey)
	ctx.stroke()
}

mouse = {x:0, y:0}
mouseover = -1
canvas.onmousemove = (e) => {
	mouse.x = e.clientX
	mouse.y = e.clientY

	if (mouseselect==-1) { // mouseovers
		let selected = interactive_zones[detectMouseover()]
		canvas.style.cursor = mouseover==0?"default":"pointer"
		switch (selected[4]) {
			case "sidebarresize":
				canvas.style.cursor = "ew-resize"
				break;
			case "dragcustom":
			case "block":
				canvas.style.cursor = "drag"
				break;
			case "disabled":
				canvas.style.cursor = "not-allowed"
				break;
			case "editname":
			case "rename": 
				canvas.style.cursor = "text"
				break;
		}
	} else { // draggings
		switch (interactive_zones[mouseselect][4]) {
			case "block":
				customBlocks[editing].innards[dragging_placed].x = mouse.x - dragging.xOffset
				customBlocks[editing].innards[dragging_placed].y = mouse.y - dragging.yOffset
			break;
			case "sidebarresize":
				LAYOUT.sidebar.width = Math.max(mouse.x, LAYOUT.sidebar.handlebar)
				LAYOUT.playbar.width = Math.max(LAYOUT.sidebar.width, LAYOUT.playbar.minwidth)
				break;
			case "disablednode":
			case "innode":
			case "outnode":
				connecting.to = false
				canvas.style.cursor = "pointer"
				detectMouseover()
				if (interactive_zones[mouseover][4] == "innode") {
					connecting.to = [interactive_zones[mouseover][6],interactive_zones[mouseover][5]]
					connecting.ex = interactive_zones[mouseover][0] + interactive_zones[mouseover][2]/2
					connecting.ey = interactive_zones[mouseover][1] + interactive_zones[mouseover][3]/2
				} else if (interactive_zones[mouseover][4] == "outnode") {
					connecting.to = [interactive_zones[mouseover][6],interactive_zones[mouseover][5]]
					connecting.ex = interactive_zones[mouseover][0] + interactive_zones[mouseover][2]/2
					connecting.ey = interactive_zones[mouseover][1] + interactive_zones[mouseover][3]/2
				} else if (interactive_zones[mouseover][4] == "disablednode") {
					canvas.style.cursor = "not-allowed"
				}
		}
	}
}

var mouseselect = -1
var dragging = dragging_placed = false
var connecting = false

canvas.onmousedown = (e) => {
	mouseselect = mouseover
	var selected = interactive_zones[mouseselect]
	switch (selected[4]) {		
		case "block":
			dragging_placed = selected[6]
		case "dragcustom":
			canvas.style.cursor = "grabbing"
			dragging = {id:selected[5], xOffset: mouse.x-selected[0], yOffset: mouse.y-selected[1]}
			if (dragging.id==INPUT||dragging.id==OUTPUT) {
				dragging.name = dragging_placed!==false?customBlocks[editing].innards[selected[6]].name:verifyName(["INPUT","OUTPUT"][dragging.id], dragging.id==OUTPUT)
			}
			break;
		case "innode":
		case "outnode":
			connecting = {from: [selected[6], selected[5]], sx:selected[0]+selected[2]/2, sy:selected[1]+selected[3]/2, isFromInput: selected[4]=="innode", to:false}
			console.log(JSON.stringify(connecting).replace(/\\/g,""))
			break;
	}
}
canvas.onmouseup = (e) => {
	detectMouseover()
	
	var selected = interactive_zones[mouseselect]
	if (mouseselect == mouseover) { // buttons
		switch (selected[4]) {
			case "edit":
				switchTo(selected[5])
				break;
			case "toggleplay":
				playing = playing?false:true
				break;
			case "rename":
				newName = prompt('enter new name')
				if (newName!==null)	customBlocks[editing].name = prompt('enter new name')
				break;
			case "editname":
				newName = prompt('enter new name')
				if (newName!==null) customBlocks[editing].innards[selected[6]].name = verifyName(newName, selected[5])
					// also edit any references to it in links and stuff
				break;
			case "createnew":
				switchTo(generateNewBlock())
				break;
			case "savenew":
				let newedit = generateNewBlock()
				customBlocks[newedit] = customBlocks[editing]
				customBlocks[editing] = cache
				switchTo(newedit)
				break;
			case "clear":
				if (confirm("are you sure you want to remove everything in this block?")) {
					customBlocks[editing].innards = []
				}
				break;
		}
	}
	switch (interactive_zones[mouseselect][4]) {
		case "block":
			if (mouse.x <= LAYOUT.sidebar.width) { // put back
				customBlocks[editing].innards.splice(dragging_placed,1)
				// also delete any references in links anywhere
				for (let i=0; i<customBlocks[editing].innards.length; i++) {
					for (let j=0; j<customBlocks[editing].innards[i].links.length; j++) {
						customBlocks[editing].innards[i].links[j] = customBlocks[editing].innards[i].links[j].filter(([block,node])=>block!==dragging_placed).map(([block,node])=>[block>dragging_placed?--block:block,node])
					}
				}
			}
			dragging = dragging_placed = false;
			break;
		case "dragcustom":
			// place block
			if (mouse.x > LAYOUT.sidebar.width) { // on stage
				canvas.style.cursor = "grab"
				customBlocks[editing].innards.push({id: dragging.id, x:mouse.x-dragging.xOffset, y:mouse.y-dragging.yOffset, name:dragging.name, links:JSON.parse("["+"[],".repeat(customBlocks[dragging.id].out.length).slice(0,-1)+"]"), outputStates: Array(customBlocks[dragging.id].out.length), leadsTo:[], nodeOffset:[[0,0],[0,0]]})
			} else { canvas.style.cursor = "default" }
			dragging = false;
			break;

		case "disablednode":
			if (connecting.to) {
				if (connecting.isFromInput) {
					if (indx(customBlocks[editing].innards[connecting.from[0]].links, connecting.to) === -1) { // otherwise it already exists so skip it
						customBlocks[editing].innards[connecting.to[0]].links[connecting.to[1]].push(connecting.from)
						// idk recursive add to the leadsTo
					}
				} else {
					if (indx(customBlocks[editing].innards[connecting.to[0]].links, connecting.from) === -1) {
						customBlocks[editing].innards[connecting.from[0]].links[connecting.from[1]].push(connecting.to)
						// and yea recursive but backwards
					}
				}
			}
			connecting = false
			break;
	}
	
	mouseselect = -1
	canvas.onmousemove(e)
}

function indx(array, subduoarray) {
	return array.findIndex(itm=>itm[0]==subduoarray[0]&&itm[1]==subduoarray[1])
}

function verifyName(name, isOut) { // ensure name of input/output block is unique within custom block.. if not, append letters to make it
	let [_, pref, num] = name.match(/(.*?)(\d*)$/)
	let taken = customBlocks[editing].innards.filter(x=>x.id==isOut*OUTPUT).map(x=>x.name)
	while (taken.includes(name)) {
		if (num=="") {
			pref += " "
			num = 2
		} else {
			num = Number(num) + 1
		}
		name = pref+num
	} 
	return name
}

function switchTo(n) {
	calculateBlockStats(editing)
	// load in new block
	editing = n
	cache = JSON.parse(JSON.stringify(customBlocks[editing])) // deep clone it

	disabledBlocks = [editing]
	customBlocks.forEach((block,i)=>{if (block.dependencies.includes(editing)) disabledBlocks.push(i)})
}

function calculateBlockStats(n) {
	// function will check how many input & output nodes in current block and what it contains and stuff.. so those things can be dynamically found and used in other stuff yeahh
	let blocksused = new Set() // so we cant use this block in other ones and make an infinite loop.
	customBlocks[n].in = []
	customBlocks[n].out = []
	for (let i=0; i<customBlocks[n].innards.length; i++) {
		if (customBlocks[n].innards[i].id == INPUT) {
			customBlocks[n].in.push(customBlocks[n].innards[i].name)
		} else if (customBlocks[n].innards[i].id == OUTPUT) {
			customBlocks[n].out.push(customBlocks[n].innards[i].name)
		} else {
			blocksused.add(customBlocks[n].innards[i].id)
		}
	}

	// now recursive search all the things
	blocksused.forEach(n=>{
		customBlocks[n].dependencies.forEach(n=>blocksused.add(n))
	})
	customBlocks[n].dependencies = [...blocksused]
	// now everything dependant on this also needs those new dependencies
	customBlocks.forEach(block=>{if(block.dependencies.includes(n)) blocksused.forEach(n=>{if (!block.dependencies.includes(n)) block.dependencies.push(n)})})
}

function generateNewBlock() {
	return customBlocks.push({name: "new block", core:false, in:["INPUT"], out:["OUTPUT"], innards: [{"id":0,"x":380,"y":351,"name":"INPUT"},{"id":1,"x":790,"y":348,"name":"OUTPUT"}], dependencies: []})-1
}

function detectMouseover() {
	mouseover = 0 // the 0th is just fullscreen so that it wont error when u select nothing
	for (var i=interactive_zones.length; i!=0; i--) {
		let zone = interactive_zones[i-1]
		if (contains(zone, mouse)) {
			mouseover = i-1
			break;
		}
	}
	return mouseover
}

function contains([sx,sy,w,h], {x,y}) {
	return (sx<x && x<sx+w && sy<y && y<sy+h)
}

customBlocks = [
	{name: "INPUT", core:true, in:[], out:['input'], innards: [], dependencies: []},
	{name: "OUTPUT", core:true, in:['output'], out:[], innards: [], dependencies: []},
	{name: "NAND", core:true, in:['a','b'], out:['out'], innards:[], dependencies: []},
	{name: "AND", core:false, in:['a','b'], out:['a^b'], innards: [], dependencies: []}, // a,b -> nand -> not -> output
	{name: "NOT", core:false, in:['a'], out:['¬a'], innards: [], dependencies: []}, // a ->-> nand -> output
	{name: "OR", core:false, in:['a','b'], out:['a∨b'], innards: [], dependencies: []},
]
sidebarScroll = -50
editing = 5

var disabledBlocks = [editing]

setInterval(render, 30)
//render()