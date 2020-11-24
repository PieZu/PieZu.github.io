// setup canvas & context
document.body.style.margin = 0
canvas = document.getElementById("canvas")
ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

var FONT_HEIGHT = 20

const PALLETE = {
	background: "#333",
	sidebar: {
		fontFamily: "sans-serif",
		background: "#202020",
		block: "#444",
		dragging: "#888",
		text: "#fff"
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
	}
}

ctx.font = FONT_HEIGHT+"px sans-serif"

playing = false
var cache 
// https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
  if (width < 0 || height < 0) return
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
  ctx.fill()
}

var interactive_zones = []
function render() {
	// reset
	ctx.clearRect(0,0, canvas.width, canvas.height)
	interactive_zones = [[0,0,canvas.width,canvas.height,"none"]]

	// top bar thing
	ctx.font = PALLETE.topbar.font
	ctx.fillStyle = PALLETE.topbar.background
	ctx.fillRect(0,0,canvas.width,50)
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
		ctx.fillStyle = PALLETE.sidebar.dragging
		ctx.font = `${FONT_HEIGHT}px ${PALLETE.sidebar.fontFamily}`

		let block = customBlocks[dragging.id]
		let width = ctx.measureText(block.name).width + 20
	
		ctx.roundRect(mouse.x - dragging.xOffset, mouse.y - dragging.yOffset, width, SAVED_HEIGHT-SAVED_PADDING, 9)

		ctx.fillStyle = PALLETE.sidebar.text
		ctx.fillText(block.name, mouse.x - dragging.xOffset + SAVED_PADDING, Math.round(mouse.y-dragging.yOffset+ (SAVED_HEIGHT-SAVED_PADDING)/2 + FONT_HEIGHT/3))
	}

	///*
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

	ctx.fillStyle = PALLETE.sidebar.block
	let y_position = Math.round(i*SAVED_HEIGHT)-sidebarScroll +SAVED_PADDING,
	dimensions = [SAVED_PADDING, y_position, width -(26*core), SAVED_HEIGHT-SAVED_PADDING]
	ctx.roundRect(...dimensions, 9)
	interactive_zones.push([...dimensions, "dragcustom", i])

	let text_y = Math.round(y_position + (SAVED_HEIGHT-SAVED_PADDING)/2 + FONT_HEIGHT/3)
	ctx.fillStyle = PALLETE.sidebar.text
	ctx.fillText(name, SAVED_PADDING*2, text_y, width-SAVED_PADDING-35)

	if (!core) {
		ctx.fillText("✎", SAVED_PADDING*2 + width-(0.8*SAVED_HEIGHT), text_y)
		interactive_zones.push([SAVED_PADDING*2 + width-(0.8*SAVED_HEIGHT) -2, y_position+FONT_HEIGHT/2 -2, 20 +4, 20 +4, "edit", i])
	}
}

function renderBlock(x, y, colour) {
	ctx.fillStyle = colour || "red"
	ctx.fillRect(x,y, 100, 200)
}

mouse = {x:0, y:0}
mouseover = -1
canvas.onmousemove = (e) => {
	mouse.x = e.clientX
	mouse.y = e.clientY

	if (mouseselect==-1) {
		let selected = interactive_zones[detectMouseover()]
		canvas.style.cursor = "default"
		switch (selected[4]) {
			case "sidebarresize":
				canvas.style.cursor = "ew-resize"
				break;
		}
	} else {
		switch (interactive_zones[mouseselect][4]) {
			case "sidebarresize":
				LAYOUT.sidebar.width = Math.max(mouse.x, LAYOUT.sidebar.handlebar)
				LAYOUT.playbar.width = Math.max(LAYOUT.sidebar.width, LAYOUT.playbar.minwidth)
				break;
		}
	}
}

mouseselect = -1
dragging = false
canvas.onmousedown = (e) => {
	mouseselect = mouseover
	var selected = interactive_zones[mouseselect]
	switch (selected[4]) {
		case "dragcustom":
			dragging = {id:selected[5], xOffset: mouse.x-selected[0], yOffset: mouse.y-selected[1]}
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
				customBlocks[editing].name = prompt('enter new name')
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
					// customBlocks[editing].innards = []
				}
		}
	}
	switch (interactive_zones[mouseselect][4]) {
		case "dragcustom":
			dragging = false;
			break;

		default:

	}
	
	mouseselect = -1
}

function switchTo(n) {
	// maybe also like save and optomise current block or something idk

	editing = n
	// then some code to load the new one in
	cache = JSON.parse(JSON.stringify(customBlocks[editing])) // deep clone it
}

function generateNewBlock() {
	return customBlocks.push({name: "new block", core:false})-1
}

function detectMouseover() {
	mouseover = -1
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

customBlocks = [{name: "== MAIN ==", core:false}, {name: "AND", core:true}, {name: "NOT", core:true}, {name: "4 BIT ADDER", core:false}, {name: "SOME REALLY REALLY LONG NAME", core:false}, {name: ".", core:false}]
sidebarScroll = -50
editing = 0

setInterval(render, 30)
//render()