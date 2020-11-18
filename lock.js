
FAIL = 'red'
GENERATE = '#aaa'
DECRYPT = '#222'
LOCKED_HTML = `<div class="lockicon"></div>
<br>
<label for="password" class="lockprompt"></label>
<input id="password" class="lockpass">`

window.addEventListener('load', initialiseLocks)

function initialiseLocks() {
	;[...document.getElementsByClassName('locked')].forEach(element=>element.innerHTML=LOCKED_HTML)
	;[...document.getElementsByClassName('lockpass')].forEach((element,i)=>{
		element.oninput = attemptDecrypt
		element.uuid = i // gotta keep track of which is which to track attempts per element (since password to 1 may not be pass to another)
		attempted[i] = [] // && gotta reset incase orders change n stuff i guess yee
	})
}

// its intentionally resource-intensive to generate keys, so we want to avoid making them on intemediary keystrokes
var generating_password = new_to_gen = false,
	attempted = {},
	path = window.location.pathname.split('/'),
	page = path[path.length-1].split(".")[0]

async function attemptDecrypt(e) {
	input = e.target.value
	e.target.style.color = GENERATE

	if (attempted[e.target.uuid].includes(input)) { // skip ones we've already tried
		e.target.style.color = FAIL
		return 
	}
	
	new_to_gen = true // queue a thing

	if (!generating_password) {
		attempted[e.target.uuid].push(input)
		generating_password = true // so u dont like generate tons at the same time and overload i guess lol
		while (new_to_gen) {
			new_to_gen = false
			attempted[e.target.uuid][attempted.length-1] = e.target.value
			//console.log("generating from "+e.target.value)
			key = await generateKey(e.target.value, page)
		}

		generating_password = false
		e.target.style.color = DECRYPT
		//console.log("decrypting from "+e.target.value)
		d = e.target.parentElement.attributes
		decrypt(bufferise(d.data.value), bufferise(d.iv.value), key).then(result=>{e.target.parentElement.outerHTML = result; initialiseLocks()}).catch(err=>e.target.style.color=FAIL)
	}
}



async function generateKey(password, salt) {
	return await crypto.subtle.deriveKey(
		// encryption method
		{
			"name": "PBKDF2",
			salt: bufferise(salt),
			"iterations": 500000,
			"hash": "SHA-256"
		},
		// the plaintext password we generate the key from. this step is just turning it into an object that deriveKey can read
		await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits","deriveKey"]),
		// the algorithm which the generated key will be used for
		{ "name": "AES-GCM", "length": 256},
		// whether or not the key can be exported
		true,
		// what methods will the key be used for
		[ "encrypt", "decrypt"]
	)
}
char = "#$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_{|}~ abcdefghijklmnopqrstuvwxyzÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ" // 128 of the 189 or so printable fromCharCode < 2**8 (ascii?)

async function decrypt(ciphertext, iv, key) {
	let plaintext = await crypto.subtle.decrypt(
		{name: "AES-GCM", iv:iv},
		key,
		ciphertext
	)
	return new TextDecoder().decode(plaintext)
}

function bufferise(string) {
	string = string.split('').map(c=>char.indexOf(c))

	var arraybuffer = new ArrayBuffer(Math.floor((string.length*7)/8))
	var view = new Uint8Array(arraybuffer)

	var carryover = 0
	var offset = 0
	for (let i=0; i<view.length +1; i++) {
		let splitPoint = i%7

		carryover += string[i+offset] >> (7-splitPoint)
		view[i-1] = carryover

		carryover = string[i+offset] << splitPoint+1
		carryover &=0b11111111

		if (splitPoint==0 && i!=0) {
			view[i-1] = string[i+offset] + (string[i+offset-1] << 7) &0b11111111
			offset++
			carryover = (string[i+offset] <<1) 
		}
	}
	return view.buffer
}
