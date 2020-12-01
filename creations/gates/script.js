// setup canvas & context
document.body.style.margin = 0
canvas = document.getElementById("canvas")
ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

window.onresize = ()=> { 
	canvas.height = window.innerHeight
	canvas.width = window.innerWidth
	sidebarScroll= Math.min(sidebarScroll, customBlocks.length*SAVED_HEIGHT) 
	ctx.lineWidth = LAYOUT.line.width
}

var FONT_HEIGHT = 20
const INPUT = 0
const OUTPUT = 1
const NAND = 2
const DFF = 3

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
	},
	memory: {
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
	},
	memory: {
		enabled: true,
		height: 20,
		radius: 9
	},
	showZones: false
}

canvas.style.background = PALLETE.background
ctx.font = FONT_HEIGHT+"px sans-serif"
ctx.lineWidth = LAYOUT.line.width

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
var tooltip = false
var interactive_zones = []
var scroll = {x:0, y:0}
function render() {
	if (playing) {
		try{
			calculateBlockStats(editing)
			execBlock(editing)
		}catch(e){
			playing=false
			console.error(e)
		}
	}

	// reset
	ctx.clearRect(0,0, canvas.width, canvas.height)
	interactive_zones = [[0,0,canvas.width,canvas.height,"background"]]

	// draw all the connections
	for (let i=0; i<customBlocks[editing].innards.length; i++) {
		for (let j=0; j<customBlocks[editing].innards[i].links.length; j++) {
			customBlocks[editing].innards[i].links[j].forEach(connection=>renderConnection([i,j], connection))
		}
	}
	
	// draw all the inner block things
	customBlocks[editing].innards.forEach((block,i)=>{
		renderBlock(block.id, block.x - scroll.x, block.y - scroll.y, PALLETE.block.color, block.name, block.memory, i).forEach(([...args])=>interactive_zones.push([...args, i]))
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
	interactive_zones.push([0,0, LAYOUT.sidebar.width, canvas.height, "sidebar"])	
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

	for (let i=0; i<2; i++) {
		let x = 240-(i+1)*(PALLETE.playbar.fontSize+10)+5
		ctx.fillText(['❌','➕'][i], x,35)
		interactive_zones.push([x+5-3, 10-3, PALLETE.playbar.fontSize+6, PALLETE.playbar.fontSize+6, ["clear", "createnew"][i]])

	}

	// render when dragging a thing
	if (dragging) {
		renderBlock(dragging.id, mouse.x - dragging.xOffset, mouse.y - dragging.yOffset, PALLETE.sidebar.dragging, dragging.name, dragging.memory, dragging_placed===false?undefined:dragging_placed)
	}

	if (LAYOUT.showZones) {
		interactive_zones.forEach(([x,y,w,h],i)=>{
			ctx.strokeStyle = i==mouseover?"green":"red"
			ctx.strokeRect(x,y,w,h)
		})
	}
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

function renderBlock(id, x, y, colour, customname, memory, instancenum) {
	var interactive_zones = [] // make a local one so we dont have to actually add them 

	let block = customBlocks[id]
	let nodeCount = Math.max(block.in.length, block.out.length)

	// draw background thing
	ctx.font = `${FONT_HEIGHT}px ${PALLETE.sidebar.fontFamily}`
	let name = id==OUTPUT||id==INPUT||id==DFF?customname:block.name
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
	 // also the bulb thing for memory/savedstate
	 } else if (LAYOUT.memory.enabled && memory !== undefined) {
	 	var mem = []
	 	if (typeof(memory) == 'boolean') mem = [[customname, memory]]
	 	else {
	 		let memVals = traverseMemory(memory)
	 		for (memVal of memVals) {
				if (typeof(memVal[1]) == 'boolean') mem.push(memVal)
	 		}
	 	}
	

	 	for (i=0;i<mem.length;i++) {
	 		let dimensions = [x+(width/mem.length*i), y-LAYOUT.memory.height, width/mem.length, LAYOUT.memory.height+LAYOUT.block.radius+LAYOUT.memory.radius]

	 		// draw the light
 			ctx.fillStyle = mem[i][1]?PALLETE.memory.on:PALLETE.memory.off
 			ctx.roundRect(...dimensions, LAYOUT.memory.radius).fill()
 			// make interactive area
 			interactive_zones.push([...dimensions, 'statebulb', mem[i][0]])
 			// todo: make it possible to toggle this.. kinda hard to do efficiently since it can be nested arbitrarily :/?

		 	// also make it like a stronger bottom or it will look rlly ugly
		 	ctx.fillStyle = colour
		 	ctx.roundRect(x, y, width, LAYOUT.block.radius+LAYOUT.block.endpoint.radius, LAYOUT.block.endpoint.radius).fill()
		}

	 }

	ctx.fillStyle = colour || customBlocks[id]
	ctx.roundRect(x, y, width, height, LAYOUT.block.radius).fill()
	interactive_zones.push([x,y,width,height,"block",id])
	
	// special stuff i guess
	if (id==INPUT || id==OUTPUT) {
		// less rounded edge
		ctx.roundRect(x+(id==OUTPUT)*(width-LAYOUT.block.radius-LAYOUT.block.endpoint.radius), y, LAYOUT.block.radius+LAYOUT.block.endpoint.radius, height, LAYOUT.block.endpoint.radius).fill()
	} if (id==INPUT || id==OUTPUT|| 	id==DFF) {// editable name thing
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
	if (connecting) { if (connecting.isFromInput || customBlocks[editing].innards[connecting.from[0]].sources.includes(instancenum)) {
			ctx.fillStyle = PALLETE.node.disabled; disabled=true 
	}}
	let nodeOffset = height/2 - LAYOUT.node.padding*(block.in.length-1)/2
	for (let i=0; i<block.in.length; i++) { 
		interactive_zones.push([...drawNode(x, y + nodeOffset + LAYOUT.node.padding*i), disabled?"disablednode":"innode",i])
	}
	 // outputs
	if (connecting) { 
		if (!connecting.isFromInput || customBlocks[editing].innards[instancenum].sources.includes(connecting.from[0]) ) {
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
	sx += start.x - scroll.x
	ex = end.x - scroll.x
	sy += start.y + LAYOUT.node.padding*startNode - scroll.y
	ey += end.y + LAYOUT.node.padding*endNode - scroll.y

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
	tooltip = false

	if (mouseselect==-1) { // mouseovers
		let selected = interactive_zones[detectMouseover()]
		canvas.style.cursor = "pointer"
		switch (selected[4]) {
			case "sidebarresize":
				canvas.style.cursor = "ew-resize"
				break;
			case "dragcustom":
			case "block":
				canvas.style.cursor = "grab"
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
			case "statebulb":
				canvas.style.cursor = "default" // cant click it.. for now
				tooltip = selected[5]
				break;
			case "sidebar":
			case "background":
				canvas.style.cursor = "default"
		}
	} else { // draggings
		switch (interactive_zones[mouseselect][4]) {
			case "block":
				customBlocks[editing].innards[dragging_placed].x = mouse.x - dragging.xOffset + scroll.x
				customBlocks[editing].innards[dragging_placed].y = mouse.y - dragging.yOffset + scroll.y
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
				let selected = interactive_zones[mouseover]
				if (selected[4] == "innode") {
					connecting.to = [selected[6], selected[5]]
					connecting.ex = selected[0] + selected[2]/2
					connecting.ey = selected[1] + selected[3]/2
					tooltip = customBlocks[customBlocks[editing].innards[selected[6]].id].in[selected[5]]
				} else if (selected[4] == "outnode") {
					connecting.to = [selected[6],selected[5]]
					connecting.ex = selected[0] + selected[2]/2
					connecting.ey = selected[1] + selected[3]/2
					tooltip = customBlocks[customBlocks[editing].innards[selected[6]].id].out[selected[5]]
				} else if (selected[4] == "disablednode") {
					canvas.style.cursor = "not-allowed"
				}
				break;
			case "sidebar":
				sidebarScroll = Math.max(Math.min(scrollStart.y - mouse.y, customBlocks.length*SAVED_HEIGHT - canvas.height), -50)
				break;
			case "background":
				scroll = {x: scrollStart.x-mouse.x, y: scrollStart.y-mouse.y}
				break;
		}
	}
}

var mouseselect = -1
var dragging = dragging_placed = false
var connecting = false
var scrollStart = false

canvas.onmousedown = (e) => {
	mouseselect = mouseover
	var selected = interactive_zones[mouseselect]
	switch (selected[4]) {		
		case "block":
			dragging_placed = selected[6]
		case "dragcustom":
			canvas.style.cursor = "grabbing"
			dragging = {id:selected[5], xOffset: mouse.x-selected[0], yOffset: mouse.y-selected[1], memory:customBlocks[selected[5]].memory}
			if (dragging.id==INPUT||dragging.id==OUTPUT||dragging.id==DFF) {
				dragging.name = dragging_placed!==false?customBlocks[editing].innards[selected[6]].name:verifyName(["INPUT","OUTPUT",null,"D-FlipFlop"][dragging.id], dragging.id);
				if (dragging_placed) dragging.state = customBlocks[editing].innards[selected[6]].state
			}
			break;
		case "innode":
		case "outnode":
			connecting = {from: [selected[6], selected[5]], sx:selected[0]+selected[2]/2, sy:selected[1]+selected[3]/2, isFromInput: selected[4]=="innode", to:false}
			if (connecting.isFromInput) cullInputs(editing, connecting.from)
			//console.log(JSON.stringify(connecting).replace(/\\/g,""))
			break;
		case "sidebar":
			canvas.style.cursor = "grabbing"
			scrollStart = {y: sidebarScroll+mouse.y}
			break;
		case "background":
			canvas.style.cursor = "grabbing"
			scrollStart = {x: scroll.x + mouse.x, y: scroll.y + mouse.y}
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
				if (newName!==null)	customBlocks[editing].name = newName
				break;
			case "editname":
				newName = prompt('enter new name')
				let oldName = customBlocks[editing].innards[selected[6]].name
				if (newName!==null) customBlocks[editing].innards[selected[6]].name = verifyName(newName, selected[5])
				// also edit any references to it in links and stuff
				if (selected[5]!==DFF) customBlocks[editing][["in","out"][selected[5]]][customBlocks[editing][["in","out"][selected[5]]].indexOf(oldName)] = customBlocks[editing].innards[selected[6]].name
				break;
			case "createnew":
				switchTo(generateNewBlock())
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
				cullInputs(editing, [dragging_placed])
				let id = customBlocks[editing].innards.splice(dragging_placed,1)[0].id
				// now make all the indices go down one
				customBlocks[editing].innards.forEach(block=>{
					block.links.forEach(linkCol=>linkCol.forEach(link=>{if(link[0]>dragging_placed) link[0]--}))
					for (let i=0; i<block.sources; i++) {
						if (block.sources[i]>dragging_placed) block.sources[i]--
					}
				})
				// also do the thing for the memory
				;for (let i=3; i<customBlocks.length; i++) {
						[...traverseMemory(customBlocks[i].memory)].forEach(([key,data])=>{
						console.log(key, data,id)
						if (typeof(key)==='string')  return;
						if (key[1]==editing) {
							if (key[0] === id) data = [] // delete it? cant just splice cuz then it wont go to the next
							else if (key[0] > id) key[0]--
						}
					})
				}

			}
			dragging = dragging_placed = false;
			break;
		case "dragcustom":
			// place block
			if (mouse.x > LAYOUT.sidebar.width) { // on stage
				canvas.style.cursor = "grab"
				customBlocks[editing].innards.push({id: dragging.id, x:mouse.x-dragging.xOffset+scroll.x, y:mouse.y-dragging.yOffset+scroll.y, name:dragging.name, 
					links:JSON.parse("["+"[],".repeat(customBlocks[dragging.id].out.length).slice(0,-1)+"]"), 
					inputStates: Array(customBlocks[dragging.id].in.length), 
					outputStates: Array(customBlocks[dragging.id].out.length), 
					sources: dragging.id==DFF?[] : [customBlocks[editing].innards.length], 
					nodeOffset:[[0,0],[0,0]],
					inputted: 0,
					memory: dragging.memory
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
					recursiveSourceEdit(editing, finishVals[0], start.sources, [])
				}
			}
			connecting = false
			break;
	}
	
	mouseselect = -1
	canvas.onmousemove(e) // trigger the onmousemove to reset things and select the next thing i guess
}

function indx(array, subduoarray) {
	return array.findIndex(itm=>itm[0]==subduoarray[0]&&itm[1]==subduoarray[1])
}

function verifyName(name, id) { // ensure name of input/output block is unique within custom block.. if not, append letters to make it
	let [_, pref, num] = name.match(/(.*?)(\d*)$/)
	let taken = customBlocks[editing].innards.filter(x=>x.id==id).map(x=>x.name)
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

	scroll = {x:0,y:0}
}

function calculateBlockStats(n) {
	// function will check how many input & output nodes in current block and what it contains and stuff.. so those things can be dynamically found and used in other stuff yeahh
	let blocksused = new Set() // so we cant use this block in other ones and make an infinite loop.
	let newIn = []
	let newOut = []
	let memHolders = []
	for (let i=0; i<customBlocks[n].innards.length; i++) {
		switch (customBlocks[n].innards[i].id) {
			case INPUT:
				newIn.push(customBlocks[n].innards[i])
				break;
			case OUTPUT:
				newOut.push(customBlocks[n].innards[i])
				// ok now like check if outputs are purely memory based in which case they can be self-linked :3
				customBlocks[n].innards[i].outputStates = true
				let sources = customBlocks[n].innards[i].sources
				for (let i=0; i<sources.length; i++) {
					if (customBlocks[n].innards[i].id == INPUT) {
						customBlocks[n].innards[i].outputStates = false
						break;
					}
				}
				break;
			default:
				blocksused.add(customBlocks[n].innards[i].id)
				if (customBlocks[n].innards[i].memory!==undefined) memHolders.push([customBlocks[n].innards[i], i])
		}
		// also make sure to reset all outConnections
		customBlocks[n].innards[i].inputted=0
	}
	let currMemory = customBlocks[n].memory || []
	//console.log(currMemory)
	customBlocks[n].memory = memHolders.map(([block,i])=>{
		if (block.id==DFF) {
			return [block.name, (currMemory.find(x=>x[0]==block.name) || [null, false])[1]]
		} else {
			return [[i,block.id], (currMemory.find(x=>x[0][0]==i) || [null,customBlocks[block.id].memory])[1]]
		}
	})

	// like.. check for change to inputs ... the funny thing is i made the inputs named (uniquely) precisely so i wouldnt have to do this kinda thing.. meh too hard to implement how i planned xD
	newIn.sort(byY)
	newIn = newIn.map(x=>x.name)

	let replaces = []
	let toDelete = []
	let needsReplacing = false
	for (let i=0; i<customBlocks[n].in.length; i++) {
		let index = newIn.indexOf(customBlocks[n].in[i])
		replaces[i] = index
		if (index!==i) needsReplacing = true
	}
	if (needsReplacing) {
		for (let i=3; i<customBlocks.length; i++) { // 3 is the number of atomic / core blocks.. the ones with no innards */shrug*
			for (let j=0; j<customBlocks[i].innards.length; j++) {
				customBlocks[i].innards[j].links.forEach((linkColl,index)=>{
					customBlocks[i].innards[j].links[index] = linkColl.map(link=>	customBlocks[i].innards[link[0]].id==n ? [link[0], replaces[link[1]]] : link).filter(x=>x[1]!==-1)
				})
			}
		}
	}

	// now do the same for outputs
	newOut.sort(byY)
	newOut = newOut.map(x=>x.name)
	replaces = Array(customBlocks[n].out.length)
	needsReplacing = false
	for (let i=0; i<customBlocks[n].out.length; i++) {
		index = newOut.indexOf(customBlocks[n].out[i])
		replaces[index] = i
		if (index!==i) needsReplacing = true
	}
	if (needsReplacing) {
		for (let i=3; i<customBlocks.length; i++) {
			for (let j=0; j<customBlocks[i].innards.length; j++) {
				if (customBlocks[i].innards[j].id == n) {
					let oldLinks = JSON.parse(JSON.stringify(customBlocks[i].innards[j].links))
					for (let k=0; k<replaces.length; k++) {
						customBlocks[i].innards[j].links[k] = oldLinks[replaces[k]]
					}
					customBlocks[i].innards[j].links = customBlocks[i].innards[j].links.filter(x=>x) // remove the undefined ones (deleted)
				}
			}
		}
	}
	// commit ur changes ^uwu^
	customBlocks[n].in = newIn
	customBlocks[n].out = newOut

	// now recursive search all the things
	blocksused.forEach(n=>{
		customBlocks[n].dependencies.forEach(n=>blocksused.add(n))
	})
	customBlocks[n].dependencies = [...blocksused]
	// now everything dependant on this also needs those new dependencies
	customBlocks.forEach(block=>{if(block.dependencies.includes(n)) blocksused.forEach(n=>{if (!block.dependencies.includes(n)) block.dependencies.push(n)})})
}

function byY (a,b) {
	var x = a.y;
	var y = b.y;
	return (x < y) ? -1 : ((x > y) ? 1 : 0)
}

function generateNewBlock() {
	return customBlocks.push({name: "new block", core:false, in:["INPUT"], out:["OUTPUT"], innards: [{id:0,x:405,y:265,name:"INPUT",links:[[]],inputStates:[],outputStates:[null],sources:[0],nodeOffset:[[0,26.5],[80,20]],inputted:0},{id:1,x:1004,y:265,name:"OUTPUT",links:[],inputStates:[null],outputStates:[],sources:[1],nodeOffset:[[0,20],[102.21666717529297,26.5]],inputted:0}], dependencies: []})-1
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
	{name:"INPUT",core:true,in:[],out:["input"],innards:[],dependencies:[],memory:[]},
	{name:"OUTPUT",core:true,in:["output"],out:[],innards:[],dependencies:[],memory:[]},
	{name:"NAND",core:true,in:["a","b"],out:["out"],innards:[],dependencies:[],memory:[]},
	{name:"D-FlipFlop",core:true,in:["tostore"],out:["stored"],innards:[],dependencies:[],memory:false},
	{name:"NOT",core:false,in:["a"],out:["!a"],dependencies:[2],memory:[],innards:[
		{id:0,x:420,y:288,name:"a",links:[[[2,0],[2,1]]],inputStates:[],outputStates:[null],sources:[0],nodeOffset:[[0,26.5],[31.116,20]],inputted:0},
		{id:1,x:573,y:287,name:"!a",links:[],inputStates:[null],outputStates:[],sources:[1,2,0,0],nodeOffset:[[0,20],[36.666,26.5]],inputted:0,state:true},
		{id:2,x:474,y:288,links:[[[1,0]]],inputStates:[null,null],outputStates:[true],sources:[2,0,0],nodeOffset:[[0,13.5],[76.683,20]],inputted:0}]},
	{name:"AND",core:false,in:["a","b"],out:["a&b"],dependencies:[2,4],memory:[],innards:[
		{id:0,x:405,y:265,name:"a",links:[[[2,0]]],inputStates:[],outputStates:[false],sources:[0],nodeOffset:[[0,26.5],[31.116,20]],inputted:0,state:false},
		{id:1,x:645,y:286,name:"a&b",links:[],inputStates:[null],outputStates:[],sources:[1,4,2,0,3],nodeOffset:[[0,20],[55.566,26.5]],inputted:0,state:false},
		{id:2,x:464,y:286,links:[[[4,0]]],inputStates:[false,false],outputStates:[true],sources:[2,0,3],nodeOffset:[[0,13.5],[76.683,20]],inputted:0},
		{id:0,x:406,y:313,name:"b",links:[[[2,1]]],inputStates:[],outputStates:[false],sources:[3],nodeOffset:[[0,26.5],[31.116,20]],inputted:0,state:false},
		{id:4,x:564,y:286,links:[[[1,0]]],inputStates:[true],outputStates:[false],sources:[4,2,0,3],nodeOffset:[[0,20],[62.216,20]],inputted:0}]},
	{name:"OR",core:false,in:["a","b"],out:["a|b"],dependencies:[2],memory:[],innards:[
		{id:0,x:405,y:265,name:"a",links:[[[3,0],[3,1]]],inputStates:[],outputStates:[null],sources:[0],nodeOffset:[[0,26.5],[31.116,20]],inputted:0},
		{id:1,x:671,y:288,name:"a|b",links:[],inputStates:[null],outputStates:[],sources:[1,5,3,0,0,4,2,2],nodeOffset:[[0,20],[47.433,26.5]],inputted:0},
		{id:0,x:404,y:307,name:"b",links:[[[4,1],[4,0]]],inputStates:[],outputStates:[null],sources:[2],nodeOffset:[[0,26.5],[31.116,20]],inputted:0},
		{id:2,x:454,y:266,links:[[[5,0]]],inputStates:[null,null],outputStates:[null],sources:[3,0,0],nodeOffset:[[0,13.5],[76.683,20]],inputted:0},
		{id:2,x:458,y:308,links:[[[5,1]]],inputStates:[null,null],outputStates:[null],sources:[4,2,2],nodeOffset:[[0,13.5],[76.683,20]],inputted:0},
		{id:2,x:569,y:286,links:[[[1,0]]],inputStates:[null,null],outputStates:[null],sources:[5,3,0,0,4,2,2],nodeOffset:[[0,13.5],[76.683,20]],inputted:0}]},
	{name:"XOR",core:false,in:["a","b"],out:["a^b"],dependencies:[5,6,4,2],memory:[],innards:[
		{id:0,x:405,y:265,name:"a",links:[[[3,0],[4,0]]],inputStates:[],outputStates:[null],sources:[0],nodeOffset:[[0,26.5],[31.116,20]],inputted:0},
		{id:1,x:683,y:286,name:"a^b",links:[],inputStates:[null],outputStates:[],sources:[1,6,3,2,0,5,4,0,2],nodeOffset:[[0,20],[51.616,26.5]],inputted:0},
		{id:0,x:404,y:305,name:"b",links:[[[3,1],[4,1]]],inputStates:[],outputStates:[null],sources:[2],nodeOffset:[[0,26.5],[31.116,20]],inputted:0},
		{id:5,x:463,y:262,links:[[[6,0]]],inputStates:[null,null],outputStates:[null],sources:[3,2,0],nodeOffset:[[0,13.5],[62.233,20]],inputted:0},
		{id:6,x:466,y:304,links:[[[5,0]]],inputStates:[null],outputStates:[null],sources:[4,0,2],nodeOffset:[[0,13.5],[50,20]],inputted:0},
		{id:4,x:516,y:305,links:[[[6,1]]],inputStates:[null],outputStates:[null],sources:[5,4,0,2],nodeOffset:[[0,20],[62.216,20]],inputted:0},
		{id:6,x:614,y:286,links:[[[7,0]]],inputStates:[null,null],outputStates:[null],sources:[6,3,2,0,5,4,0,2],nodeOffset:[[0,13.5],[50,20]],inputted:0},
		{id:4,x:664,y:285,links:[[[1,0]]],inputStates:[null],outputStates:[null],sources:[7,6,3,2,0,5,4,0,2],nodeOffset:[[0,20],[62.217,20]],inputted:0}
	]},
	{name:"MuX",core:false,in:["default","alternative","choose alternative?"],out:["chosen input"],dependencies:[5,4,6,2],memory:[],innards:[
		{id:0,x:434,y:265,name:"default",links:[[[5,0]]],inputStates:[],outputStates:[false],sources:[0],nodeOffset:[[0,26.5],[80.016,20]],inputted:0,state:false},
		{id:1,x:814,y:307,name:"chosen input",links:[],inputStates:[null],outputStates:[],sources:[1,7,5,6,3,0,4,3,2],nodeOffset:[[0,20],[133.366,26.5]],inputted:0,state:false},
		{id:0,x:403,y:306,name:"alternative",links:[[[4,0]]],inputStates:[],outputStates:[false],sources:[2],nodeOffset:[[0,26.5],[112.25,20]],inputted:0,state:false},
		{id:0,x:322,y:371,name:"choose alternative?",links:[[[4,1],[6,0]]],inputStates:[],outputStates:[false],sources:[3],nodeOffset:[[0,26.5],[193.383,20]],inputted:0,state:false},
		{id:5,x:653,y:341,links:[[[7,1]]],inputStates:[false,false],outputStates:[false],sources:[4,3,2],nodeOffset:[[0,13.5],[62.233,20]],inputted:2},
		{id:5,x:654,y:272,links:[[[7,0]]],inputStates:[false,true],outputStates:[false],sources:[5,6,3,0],nodeOffset:[[0,13.5],[62.233,20]],inputted:2},
		{id:4,x:562,y:290,links:[[[5,1]]],inputStates:[false],outputStates:[true],sources:[6,3],nodeOffset:[[0,20],[62.216,20]],inputted:1},
		{id:6,x:741,y:306,links:[[[1,0]]],inputStates:[false,false],outputStates:[false],sources:[7,5,6,3,0,4,3,2],nodeOffset:[[0,13.5],[50,20]],inputted:2}
	]},
	{name:"memory cell",core:false,in:["value","set value?"],out:["stored value"],dependencies:[3,8,5,4,6,2],memory:[["cell",false]],innards:[
		{id:0,x:336,y:271,name:"value",links:[[[4,1]]],inputStates:[],outputStates:[false],sources:[0],nodeOffset:[[0,26.5],[67.799,20]],inputted:0,state:false},
		{id:1,x:636,y:289,name:"stored value",links:[],inputStates:[null],outputStates:[],sources:[1],nodeOffset:[[0,20],[128.916,26.5]],inputted:0,state:false},
		{id:3,x:434,y:242,name:"cell",memory:false,links:[[[1,0],[4,0]]],inputStates:[null],outputStates:[false],sources:[],nodeOffset:[[0,20],[50.016,20]],inputted:0,memory:false,state:false},
		{id:0,x:328,y:321,name:"set value?",links:[[[4,2]]],inputStates:[],outputStates:[false],sources:[3],nodeOffset:[[0,26.5],[111.133,20]],inputted:0,state:false},
		{id:8,x:529,y:328,links:[[[2,0]]],inputStates:[false,false,false],outputStates:[false],sources:[4,3,0],nodeOffset:[[0,11.5],[61.116,24.5]],inputted:3}]
	}
]
sidebarScroll = -50
editing = 8
switchTo(editing) // so that it caches so it doesnt crash if u press save as new button on initial launch

var disabledBlocks = [editing]

setInterval(render, 30)
//render()


function execBlock(id, inputs, memory) {
	//console.log("executing",id,inputs,memory)
	
	if (customBlocks[id].core) { // atomic blocks. executed behind the scenes.
		switch (id) {
			case NAND:
				return [[!(inputs[0]&&inputs[1])],[]]
			default:
				throw Error(`Attempted to execute atomic block #${id} (${customBlocks[id].name}) which does not have any executable code. :c`)
		}
	} else {
		if (inputs) { var block = JSON.parse(JSON.stringify(customBlocks[id])); block.memory = memory || customBlocks[id].memory } // gotta make like a clone i guess
		else var block = customBlocks[id]
		var allResults = []
		var allMemory = []

		// execute from the DFFs
		block.memory.forEach(([key,value])=>{
			if (typeof(key)!=='string') return;
			var start = block.innards.find(x=>x.id==DFF && x.name == key)
			start.state = memory?memory.find(x=>x[0]==key)[1]:value
			start.outputStates = [start.state]

			for (let j=0; j<start.links.length; j++) {
				for (let k=0; k<start.links[j].length; k++) {
					let [res, mems] = distribute(block, start.links[j][k], start.state)
					allResults.push(...res)
					allMemory.push(...mems)
				}
			}
		})

		// execute from the INPUTs
		for (let i=0; i<block.in.length; i++) {
			var start = block.innards.find(x=>x.id==INPUT && x.name == block.in[i])
			if (inputs) start.state = inputs[i];
			else start.outputStates = [start.state] // light the wire up
			// now we want to distribute to everything!!!
			for (let j=0; j<start.links.length; j++) {
				for (let k=0; k<start.links[j].length; k++) {
					let [res, mems] = distribute(block, start.links[j][k], start.state)
					allResults.push(...res)
					allMemory.push(...mems)
				}
			}
		}

		//console.log('--- results ---')
		var outs = []
		allResults.forEach(([key, value])=>{
			outs[block.out.findIndex(x=>x==key)] = value
		})
		block.memory = allMemory;
		return [outs, allMemory]
	}
}

function distribute(block, [instance, node], value) {
	//console.log("distribute()",instance,node,value)

	if (block.innards[instance].id == OUTPUT) { block.innards[instance].state=value; return [[[block.innards[instance].name, value]], []] }
	if (block.innards[instance].id == DFF) { block.innards[instance].memory=value; return [[], [[block.innards[instance].name, value]]] }


	block.innards[instance].inputStates[node] = value
	if (++block.innards[instance].inputted == block.innards[instance].inputStates.length) {
		//console.log("mem", block, block.memory?block.memory.find(([key,value])=>key[0]===instance):undefined)
		let [outs,memory] = execBlock(block.innards[instance].id, block.innards[instance].inputStates, block.innards[instance].memory?block.memory.find(([key,value])=>key[0]===instance)[1]:undefined)
		//console.log(outs, memory)
		//console.log('--')
		//console.log(instance, block.innards[instance].inputStates, outs, memory)
		block.innards[instance].outputStates = outs

		var allResults = []
		var allMemory = memory.length>0?[[[instance, block.innards[instance].id], memory]]:[]

		let links = block.innards[instance].links
		for (let i=0; i<links.length; i++) {
			for (let j=0; j<links[i].length; j++) {
				let [res, mems] = distribute(block, links[i][j], outs[i])
				allResults.push(...res)
				allMemory.push(...mems)
			}
		}

		if (memory.length>0) block.innards[instance].memory = memory
		return [allResults, allMemory]
	}

	return [[],[]]
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
						deletedSources.push(...customBlocks[domain].innards[i].sources)
					}
				})
			}
		}
		//console.log(deletedSources)
		// then recursively remove those sources
		recursiveSourceEdit(domain, instance, [], deletedSources)
	} else {
		for (let node=0; node<customBlocks[customBlocks[domain].innards[instance].id].in.length; node++) {
			cullInputs(domain, [instance, node])
		}
	}
}

function recursiveSourceEdit(domain, instance, addedSources, removedSources) {
	let block = customBlocks[domain].innards[instance]
	if (block.id == DFF) return
	block.sources.push(...addedSources)
	for (let i=0; i<removedSources.length; i++) {
		block.sources.splice(block.sources.indexOf(removedSources[i]),1)
	}

	for (let i=0; i<block.links.length; i++) {
		for (let j=0; j<block.links[i].length; j++) {
			recursiveSourceEdit(domain, block.links[i][j][0], addedSources, removedSources)
		}
	}
}

function *traverseMemory(mem) {
	if (mem==undefined) return;
	var position = [0]
	while (position.length > 0) {
		let curr = recursiveindex(mem, position)
		if (curr!==undefined) {
			yield curr

			if (typeof(curr[1]) == "object") { 
				position.push(1,0)
			}
			else position[position.length-1]++
		} else {
			//if (position[position.length-1] == recursiveindex(mem, position.slice(-1)).length) {
			position.pop()
			position.pop()
			//} 
			position[position.length-1]++
		}
	}
}
function recursiveindex(object, index) {		
	var obj = object
	var ind = index
	for (let i=0; i<index.length; i++) {
		obj = obj[ind[0]]
		ind = ind.slice(1)
	}
	return obj
	/*if (index.length == 0) return object
	else return recursiveindex(object[index[0]] index.slice(1))*/
}

/* memory reference sheet
MEMORY ::= Array [ INNER ]
	INNER ::= INNER, INNER || DFF || BLOCK || null
		DFF ::= Array [KEY, VALUE]
			KEY ::= String .name of dff block within whatever scope	
			VALUE ::= Boolean true || false
		BLOCK ::= Array [INDICES, MEMORY]
			INDICES ::= Array [INDEX, TYPE]
				INDEX ::= Number instancenum of block so like the question marks within block.innards[??] 	
				TYPE ::= Number the id of block so like block.inards[INDEX].id which tells u customBlocks[??]	
*/