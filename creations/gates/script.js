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
ctx.font = FONT_HEIGHT+"px sans-serif"

playing = false

// https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
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
    interactive_zones = []

    // top bar thing
    ctx.font = PALLETE.topbar.font
    ctx.fillStyle = PALLETE.topbar.background
    ctx.fillRect(0,0,canvas.width,50)
    ctx.fillStyle = PALLETE.topbar.text
    ctx.fillText(customBlocks[editing].name, 250 + 20, 33)

    interactive_zones.push([250+20-5, 5, ctx.measureText(customBlocks[editing].name).width+10, 50-10, "rename"])

	// sidebar
	ctx.fillStyle = PALLETE.sidebar.background
	ctx.fillRect(0,0,250,canvas.height)

    ctx.font = `${FONT_HEIGHT}px ${PALLETE.sidebar.fontFamily}`
	customBlocks.forEach(renderCustom)

    // toolbox bar thing
    ctx.fillStyle = PALLETE.playbar.background
    ctx.fillRect(0,0,250,50)

    ctx.font = `${PALLETE.playbar.fontSize}px ${PALLETE.playbar.fontFamily}`
    ctx.fillStyle = "white"
    ctx.fillText("▶⏸"[playing*1],15,35)
    interactive_zones.push([15 -3,10 -3, PALLETE.playbar.fontSize+6, PALLETE.playbar.fontSize+6, "toggleplay"])

    for (i=0; i<3; i++) {
        let x = 240-(i+1)*(PALLETE.playbar.fontSize+10)+5
        ctx.fillText(['❌','💾','➕'][i], x,35)
        interactive_zones.push([x+5-3, 10-3, PALLETE.playbar.fontSize+6, PALLETE.playbar.fontSize+6, ["clear", "savenew", "createnew"][i]])

    }


    ctx.strokeStyle = "red"
    interactive_zones.forEach(([x,y,w,h])=>{
        ctx.strokeRect(x,y,w,h)
    })
}

SAVED_HEIGHT = 50
SAVED_PADDING = 10
SCROLLBAR_WIDTH = 5
function renderCustom({name}, i) {
    let width = Math.min(ctx.measureText(name).width+SAVED_PADDING+35, 250-SAVED_PADDING*2-SCROLLBAR_WIDTH)

	ctx.fillStyle = PALLETE.sidebar.block
    let y_position = Math.round(i*SAVED_HEIGHT)-sidebarScroll +SAVED_PADDING,
    dimensions = [SAVED_PADDING, y_position, width, SAVED_HEIGHT-SAVED_PADDING]
	ctx.roundRect(...dimensions, 9)
    interactive_zones.push([...dimensions, "dragcustom", i])

    let text_y = Math.round(y_position + (SAVED_HEIGHT-SAVED_PADDING)/2 + FONT_HEIGHT/3)
    ctx.fillStyle = PALLETE.sidebar.text
    ctx.fillText(name, SAVED_PADDING*2, text_y, width-SAVED_PADDING-35)

    ctx.fillText("✎", SAVED_PADDING*2 + width-(0.8*SAVED_HEIGHT), text_y)
    interactive_zones.push([SAVED_PADDING*2 + width-(0.8*SAVED_HEIGHT) -2, y_position+FONT_HEIGHT/2 -2, 20 +4, 20 +4, "edit", i])
}

function renderBlock(x, y, colour) {
	ctx.fillStyle = colour || "red"
	ctx.fillRect(x,y, 100, 200)
}

customBlocks = [{name: "== MAIN =="}, {name: "AND"}, {name: "NOT"}, {name: "4 BIT ADDER"}, {name: "SOME REALLY REALLY LONG NAME"}, {name: "."}]
sidebarScroll = -50
editing = 0

setInterval(render, 30)
//render()