// setup canvas & context
document.body.style.margin = 0
canvas = document.getElementById("canvas")
ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const FONT_HEIGHT = 20

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
        text: "#fff"
    },
    playbar: {
        background: "#111",
        font: "30px sans-serif"
    }
}


ctx.font = FONT_HEIGHT+"px sans-serif"

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


function render() {
	// reset
	ctx.clearRect(0,0, canvas.width, canvas.height)

    // top bar thing
    ctx.fillStyle = PALLETE.topbar.background
    ctx.fillRect(0,0,canvas.width,50)
    ctx.fillStyle = PALLETE.topbar.text
    ctx.fillText(customBlocks[editing].name, 250 + 30, 30)

	// sidebar
	ctx.fillStyle = PALLETE.sidebar.background
	ctx.fillRect(0,0,250,canvas.height)

    ctx.font = `${FONT_HEIGHT}px ${PALLETE.sidebar.fontFamily}`
	customBlocks.forEach(renderCustom)

    // toolbox bar thing
    ctx.fillStyle = PALLETE.playbar.background
    ctx.fillRect(0,0,250,50)

    ctx.font = PALLETE.playbar.font
    ctx.fillStyle = "white"
    ctx.fillText("▶",15,35)
    ctx.textAlign = "right"
    ctx.fillText("➕💾❌",240,35)
    ctx.textAlign = "left"
}

SAVED_HEIGHT = 50
SAVED_PADDING = 10
SCROLLBAR_WIDTH = 5
function renderCustom({name}, i) {
    let width = Math.min(ctx.measureText(name).width+SAVED_PADDING+35, 250-SAVED_PADDING*2-SCROLLBAR_WIDTH)

	ctx.fillStyle = PALLETE.sidebar.block
    let y_position = Math.round(i*SAVED_HEIGHT)-sidebarScroll +SAVED_PADDING
	ctx.roundRect(SAVED_PADDING, y_position, width, SAVED_HEIGHT-SAVED_PADDING, 9)

    ctx.fillStyle = PALLETE.sidebar.text
    ctx.fillText(name, SAVED_PADDING*2, Math.round(y_position + (SAVED_HEIGHT-SAVED_PADDING)/2 + FONT_HEIGHT/3), width-SAVED_PADDING-35)
    ctx.fillText("✎", SAVED_PADDING*2 + width-(0.8*SAVED_HEIGHT), Math.round(y_position + (SAVED_HEIGHT-SAVED_PADDING)/2 + FONT_HEIGHT/3))
}

function renderBlock(x, y, colour) {
	ctx.fillStyle = colour || "red"
	ctx.fillRect(x,y, 100, 200)
}

customBlocks = [{name: "== MAIN =="}, {name: "AND"}, {name: "NOT"}, {name: "4 BIT ADDER"}, {name: "SOME REALLY REALLY LONG NAME"}, {name: "."}]
sidebarScroll = -50
editing = 0

//setInterval(render, 30)
render()