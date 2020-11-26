// setup canvas & context
document.body.style.margin = 0
canvas = document.getElementById("canvas")
ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

var FONT_HEIGHT = 20
const INPUT = 0
const OUTPUT = 1
const NAND = 2

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
		off: "#111",
		on: "#f00"
	},
	bulb: {
		off: "#111",
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
	},
	bulb: {
		width: 30,
		radius: 9
	}
}

canvas.style.background = PALLETE.background
ctx.font = FONT_HEIGHT+"px sans-serif"
ctx.lineWidth = LAYOUT.line.width

playing = true
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
var tooltip = false
var interactive_zones = []
function render() {
	if (playing) {
		calculateBlockStats(editing)
		execBlock(editing)
	}

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
		renderBlock(dragging.id, mouse.x - dragging.xOffset, mouse.y - dragging.yOffset, PALLETE.sidebar.dragging, dragging.name, dragging_placed===false?undefined:dragging_placed)
	}

	/*
	interactive_zones.forEach(([x,y,w,h],i)=>{
		ctx.strokeStyle = i==mouseover?"green":"red"
		ctx.strokeRect(x,y,w,h)
	})
	/**/

	if (tooltip) {
		ctx.font = "15px sans-serif"
		let w = ctx.measureText(tooltip).width
		ctx.fillStyle = "#000"
		ctx.fillRect(mouse.x+20-5, mouse.y, w+10, 15+10)
		ctx.fillStyle = "#fff"
		ctx.fillText(tooltip, mouse.x+20, mouse.y+15)
	}
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

	let block = customBlocks[id]
	let nodeCount = Math.max(block.in.length, block.out.length)

	// draw background thing
	ctx.font = `${FONT_HEIGHT}px ${PALLETE.sidebar.fontFamily}`
	let name = id==OUTPUT||id==INPUT?customname:block.name
	let width = ctx.measureText(name).width + 20
	let height = Math.max(LAYOUT.node.padding*nodeCount+SAVED_PADDING, SAVED_HEIGHT-SAVED_PADDING) 
	 // but first, bulb thing
	 if (id==INPUT || id==OUTPUT) {
		ctx.fillStyle = instancenum!==undefined&&customBlocks[editing].innards[instancenum].state?PALLETE.bulb.on:PALLETE.bulb.off
		if (id==INPUT) {
			ctx.roundRect(x-LAYOUT.bulb.width, y, LAYOUT.bulb.width+LAYOUT.block.endpoint.radius+LAYOUT.bulb.radius, height, LAYOUT.bulb.radius).fill()
			interactive_zones.push([x-LAYOUT.bulb.width, y, LAYOUT.bulb.width, height, "bulb"])
		} else { // id==OUTPUT
			ctx.roundRect(x+width-LAYOUT.block.endpoint.radius-LAYOUT.bulb.radius, y, LAYOUT.bulb.width+LAYOUT.block.endpoint.radius+LAYOUT.bulb.radius, height, LAYOUT.bulb.radius).fill()
		}
	 }
	ctx.fillStyle = colour || customBlocks[id]
	ctx.roundRect(x, y, width, height, LAYOUT.block.radius).fill()
	interactive_zones.push([x,y,width,height,"block",id])
	
	// special stuff i guess
	if (id==INPUT || id==OUTPUT) {
		// less rounded edge
		ctx.roundRect(x+(id==OUTPUT)*(width-LAYOUT.block.radius-LAYOUT.block.endpoint.radius), y, LAYOUT.block.radius+LAYOUT.block.endpoint.radius, height, LAYOUT.block.endpoint.radius).fill()
		// editable name thing
		let dimensions = [x +20/2 -2, y+SAVED_PADDING -4, width-20 +2*2, height-SAVED_PADDING*2 +4*2]
		ctx.fillStyle = PALLETE.block.editablename
		ctx.fillRect(...dimensions)
		interactive_zones.push([...dimensions, "editname", id])
	}
	// draw name
	ctx.fillStyle = PALLETE.sidebar.text
	ctx.fillText(name, x + SAVED_PADDING, Math.round(y+ height/2 + FONT_HEIGHT/3))
	
	// draw nodes
	 // inputs
	var disabled = false
	ctx.fillStyle = PALLETE.node.default
	if (connecting) { if (connecting.isFromInput || connecting.from[0]==instancenum || customBlocks[editing].innards[connecting.from[0]].sources.includes(instancenum)) { 
			ctx.fillStyle = PALLETE.node.disabled; disabled=true 
	}}
	let nodeOffset = height/2 - LAYOUT.node.padding*(block.in.length-1)/2
	for (let i=0; i<block.in.length; i++) { 
		interactive_zones.push([...drawNode(x, y + nodeOffset + LAYOUT.node.padding*i), disabled?"disablednode":"innode",i])
	}
	 // outputs
	if (connecting) { 
		if (!connecting.isFromInput || connecting.from[0]===instancenum || customBlocks[editing].innards[instancenum].sources.includes(connecting.from[0]) ) {
			disabled = true
			ctx.fillStyle = PALLETE.node.disabled			
		} else {
			disabled = false
			ctx.fillStyle = PALLETE.node.default
		}
	}
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
		tooltip = false
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
			case "innode":
				tooltip = customBlocks[customBlocks[editing].innards[selected[6]].id].in[selected[5]]
				break;
			case "outnode":
				tooltip = customBlocks[customBlocks[editing].innards[selected[6]].id].out[selected[5]]
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
				dragging.name = dragging_placed!==false?customBlocks[editing].innards[selected[6]].name:verifyName(["INPUT","OUTPUT"][dragging.id], dragging.id==OUTPUT);
				if (dragging_placed) dragging.state = customBlocks[editing].innards[selected[6]].state
			}
			break;
		case "innode":
		case "outnode":
			connecting = {from: [selected[6], selected[5]], sx:selected[0]+selected[2]/2, sy:selected[1]+selected[3]/2, isFromInput: selected[4]=="innode", to:false}
			if (connecting.isFromInput) cullInputs(editing, connecting.from)
			//console.log(JSON.stringify(connecting).replace(/\\/g,""))
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
			case "bulb":
				let block = customBlocks[editing].innards[selected[5]]
				block.state = block.state?false:true
				break;
		}
	}
	switch (interactive_zones[mouseselect][4]) {
		case "block":
			if (mouse.x <= LAYOUT.sidebar.width) { // put back
				// delete all references xo
				for (let i=0; i<customBlocks[editing].innards[dragging_placed].outputStates.length; i++) {
					cullInputs(editing, [dragging_placed, i])
				}
				customBlocks[editing].innards.splice(dragging_placed,1)
			}
			dragging = dragging_placed = false;
			break;
		case "dragcustom":
			// place block
			if (mouse.x > LAYOUT.sidebar.width) { // on stage
				canvas.style.cursor = "grab"
				customBlocks[editing].innards.push({id: dragging.id, x:mouse.x-dragging.xOffset, y:mouse.y-dragging.yOffset, name:dragging.name, 
					links:JSON.parse("["+"[],".repeat(customBlocks[dragging.id].out.length).slice(0,-1)+"]"), 
					inputStates: Array(customBlocks[dragging.id].in.length), 
					outputStates: Array(customBlocks[dragging.id].out.length), 
					sources:[], 
					nodeOffset:[[0,0],[0,0]],
					inputted: 0
				})
			} else { canvas.style.cursor = "default" }
			dragging = false;
			break;

		case "disablednode":
			if (connecting.to) {
				if (connecting.isFromInput) {
					var startVals = connecting.to,
						finishVals = connecting.from
				} else {
					var startVals = connecting.from,
						finishVals = connecting.to
				}
				var start = customBlocks[editing].innards[startVals[0]],
					finish = customBlocks[editing].innards[finishVals[0]]

				if (indx(finish.links, connecting.to) === -1) { // otherwise it already exists so skip it
					if (!connecting.isFromInput) { cullInputs(editing, connecting.to) }

					start.links[startVals[1]].push(finishVals)
					recursiveSourceEdit(editing, finishVals[0], [...start.sources, startVals[0]], [])
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
	let newIn = []
	let newOut = []
	for (let i=0; i<customBlocks[n].innards.length; i++) {
		if (customBlocks[n].innards[i].id == INPUT) {
			newIn.push(customBlocks[n].innards[i].name)
		} else if (customBlocks[n].innards[i].id == OUTPUT) {
			newOut.push(customBlocks[n].innards[i].name)
		} else {
			blocksused.add(customBlocks[n].innards[i].id)
		}
	}
	newIn.sort((a,b)=>{
		var x = customBlocks[n].innards.findIndex(x=>x.id==INPUT && x.name == a).y
		var y = customBlocks[n].innards.findIndex(x=>x.id==INPUT && x.name == b).y
		return (x < y) ? -1 : ((x > y) ? 1 : 0)})

	let replaces = {}
	let toDelete = []
	for (let i=0; i<customBlocks[n].in.length; i++) {
		let mapTo = newIn.indexOf(customBlocks[n].in[i])
		if (mapTo !== i) {
			//if (mapTo == -1) toDelete.push(i)
			// else { 
				replaces[i] = mapTo
			//}
		}
	}
	if (replaces.length>0) {
		customBlocks.forEach(blockdomain=>{
			if (!block.core) block.innards.forEach(block=>block.links.forEach(linkColl=>linkColl.forEach(link=>{if (blockdomain.innards[link[0]].id==n) {link[1] = replaces[link[1]] || link[1]}})))
		})
	}/*
	if (toDelete.length) {
		for (i=0;i<customBlocks.domain;i++) {
			if (!customBlocks[i].core) {

			}
		}
	}*/
	customBlocks[n].in = newIn


	// edit changed output ones
	customBlocks[n].out = newOut


	// now recursive search all the things
	blocksused.forEach(n=>{
		customBlocks[n].dependencies.forEach(n=>blocksused.add(n))
	})
	customBlocks[n].dependencies = [...blocksused]
	// now everything dependant on this also needs those new dependencies
	customBlocks.forEach(block=>{if(block.dependencies.includes(n)) blocksused.forEach(n=>{if (!block.dependencies.includes(n)) block.dependencies.push(n)})})

	// also make sure to reset all outConnections
	customBlocks[n].innards.forEach(block=>block.inputted=0)
}

function generateNewBlock() {
	return customBlocks.push({name: "new block", core:false, in:["INPUT"], out:["OUTPUT"], innards: [{id:0,x:405,y:265,name:"INPUT",links:[[]],inputStates:[],outputStates:[null],sources:[],nodeOffset:[[0,26.5],[80,20]],inputted:0},{id:1,x:1004,y:265,name:"OUTPUT",links:[],inputStates:[null],outputStates:[],sources:[],nodeOffset:[[0,20],[102.21666717529297,26.5]],inputted:0}], dependencies: []})-1
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
	{name: "AND", core:false, in:['a','b'], out:['a^b'], innards: [{id:0,x:423,y:202,name:"a",links:[[[2,0]]],inputStates:[],outputStates:[null],sources:[],nodeOffset:[[0,26.5],[31.12,20]],inputted:0},{id:0,x:426,y:250,name:"b",links:[[[2,1]]],inputStates:[],outputStates:[null],sources:[],nodeOffset:[[0,26.5],[31.115,20]],inputted:0},{id:2,x:502,y:227,links:[[[3,0],[4,0]]],inputStates:[null,null],outputStates:[null],sources:[],nodeOffset:[[0,13.5],[76.68,20]],inputted:0},{id:1,x:696,y:228,name:"a^b",links:[],inputStates:[null],outputStates:[],sources:[],nodeOffset:[[0,20],[51.62,26.5]],inputted:0},{id:4,x:611,y:229,links:[[[3,0]]],inputStates:[null],outputStates:[null],sources:[],nodeOffset:[[0,20],[62.22,20]],inputted:0}], dependencies: [4]},
	{name:"NOT",core:false,in:["a"],out:["¬a"],innards:[{id:0,x:310,y:280,name:"a",links:[[[1,0],[1,1]]],inputStates:[],outputStates:[null],sources:[],nodeOffset:[[0,26.5],[31.115,20]],inputted:0},{id:2,x:367,y:280,links:[[[2,0]]],inputStates:[null,null],outputStates:[null],sources:[],nodeOffset:[[0,13.5],[76.68,20]],inputted:0},{id:1,x:468,y:280,name:"¬a",links:[],inputStates:[null],outputStates:[],sources:[],nodeOffset:[[0,20],[42.8,26.5]],inputted:0}],dependencies:[2]},
	{name: "OR", core:false, in:[], out:[], innards: [], dependencies: []},
]
sidebarScroll = -50
editing = 5

var disabledBlocks = [editing]

setInterval(render, 30)
//render()


function execBlock(id, inputs) {
	//console.log(id,inputs)
	if (customBlocks[id].core) { // atomic blocks. executed behind the scenes.
		switch (id) {
			case NAND:
				return [!(inputs[0]&&inputs[1])]
			default:
				throw Error(`Attempted to execute atomic block #${id} (${block.name}) which does not have any executable code. :c`)
		}
	} else {
		if (inputs) var block = JSON.parse(JSON.stringify(customBlocks[id])) // gotta make like a clone i guess
		else var block = customBlocks[id]

		var allResults = []
		for (let i=0; i<block.in.length; i++) {
			var start = block.innards.find(x=>x.id==INPUT && x.name == block.in[i])
			if (inputs) start.state = inputs[i];
			else start.outputStates = [start.state] // light the wire up
			// now we want to distribute to everything!!!
			for (let j=0; j<start.links.length; j++) {
				for (let k=0; k<start.links[j].length; k++) {
					allResults.push(...distribute(block, start.links[j][k], start.state))
				}
			}
		}
		//console.log('--- results ---')
		var outs = []
		allResults.forEach(([key, value])=>{
			outs[block.out.findIndex(x=>x==key)] = value
		})
		return outs
	}
}

function distribute(block, [instance, node], value) {
	//console.log("distribute()",instance,node,value)

	if (block.innards[instance].id == OUTPUT) { block.innards[instance].state=value; return [[block.innards[instance].name, value]] }
	block.innards[instance].inputStates[node] = value
	if (++block.innards[instance].inputted == block.innards[instance].inputStates.length) {
		let outs = execBlock(block.innards[instance].id, block.innards[instance].inputStates)
		block.innards[instance].outputStates = outs

		var allResults = []

		let links = block.innards[instance].links
		for (let i=0; i<links.length; i++) {
			for (let j=0; j<links[i].length; j++) {
				let res = distribute(block, links[i][j], outs[i])
				allResults.push(...res)
			}
		}

		return allResults
	}

	return []
}

function cullInputs(domain, [instance, node]) {
	if (node!==undefined) {
		var deletedSources = []
		for (let i=0; i<customBlocks[domain].innards.length; i++) {
			for (let j=0; j<customBlocks[domain].innards[i].links.length; j++) {
				customBlocks[domain].innards[i].links[j].forEach((link,indx)=>{
					if (link[0]==instance && link[1]==node) {
						// break the linkage
						customBlocks[domain].innards[i].links[j].splice(indx, 1)
						deletedSources.push(...customBlocks[domain].innards[i].sources, i)
					}
				})
			}
		}
		// then recursively remove those sources
		recursiveSourceEdit(domain, instance, [], deletedSources)
	} else {
		console.log('p')
		for (let node=0; node<customBlocks[customBlocks[domain].innards[instance].id].in.length; node++) {
			cullInputs(domain, [instance, node])
		}
	}
}

function recursiveSourceEdit(domain, instance, addedSources, removedSources) {
	let block = customBlocks[domain].innards[instance]
	block.sources.push(...addedSources)
	for (let i=0; i<removedSources.length; i++) {
		block.sources.splice(block.sources.indexOf(removedSources[i]))
	}

	for (let i=0; i<block.links.length; i++) {
		for (let j=0; j<block.links[i].length; j++) {
			recursiveSourceEdit(domain, block.links[i][j][0], addedSources, removedSources)
		}
	}
}