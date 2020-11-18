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
		await crypto.subtle.importKey("raw", bufferise(password), "PBKDF2", false, ["deriveBits","deriveKey"]),
		// the algorithm which the generated key will be used for
		{ "name": "AES-GCM", "length": 256},
		// whether or not the key can be exported
		true,
		// what methods will the key be used for
		[ "encrypt", "decrypt"]
	)
}
char = "#$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_{|}~ abcdefghijklmnopqrstuvwxyzÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ" // 128 of the 189 or so printable fromCharCode < 2**8 (ascii?)

function stringise(arraybuffer) { // convert an arraybuffer into a copy&pastable string
	view = new Uint8Array(arraybuffer)
	Uint7array = []
	let loops = Math.ceil(view.length * 8 / 7) // cache the number of times we need to loop.. also so we dont have to do complex thingies
	for (let i=0, offset=1; i<loops; i++) {
		if (i%8 == 0) offset--
		Uint7array.push((view[i+offset]>>i%8+1)+(view[i+offset-1]<<7-i%8)&0b1111111)
	}

	return Uint7array.map(n=>char[n]).join('')
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

async function decrypt(ciphertext, iv, key) {
	let plaintext = await crypto.subtle.decrypt(
		{name: "AES-GCM", iv:iv},
		key,
		ciphertext
	)
	return new TextDecoder().decode(plaintext)
}

// its intentionally resource-intensive to generate keys, so we want to avoid making them on intemediary keystrokes
var password, 
	generating_password = new_to_gen = false,
	attempted = []

async function genKey() {

	if (generating_password) {
		new_to_gen = true
	} else {
		generating_password = true
		new_to_gen = false

		password = document.getElementById('password').value
		keyElem.value = "..."
		key = await generateKey(password, salt)
		keyElem.value = (await crypto.subtle.exportKey('jwk', key)).k
		generating_password = false

		if (new_to_gen) { // if a new one's come up in the time
			return await genKey() // regen it innit	
		} else return key
	}
}
FAIL = 'red'
GENERATE = '#aaa'
DECRYPT = '#222'
window.addEventListener('load', function() {

	console.log(document.getElementsByClassName('lockpass'));
	[...document.getElementsByClassName('lockpass')].forEach(element=>{
		element.oninput = async e=>{
			input = e.target.value
			e.target.style.color = GENERATE

			if (attempted.includes(input)) { // skip ones we've already tried
				e.target.style.color.style = FAIL
				return 
			}
			
			new_to_gen = true // queue a thing
			
			if (!generating_password) {
				attempted.push(input)
				generating_password = true // so u dont like generate tons at the same time and overload i guess lol
				while (new_to_gen) {
					new_to_gen = false
					path = window.location.pathname.split('/')
					attempted[attempted.length-1] = e.target.value
					console.log("generating from "+e.target.value)
					key = await generateKey(e.target.value, path[path.length-1].split(".")[0])
				}

				generating_password = false
				e.target.style.color = DECRYPT
				// ok now we've generated the key, try decode
				console.log("decrypting from "+e.target.value)
				d = e.target.parentElement.attributes
				decrypt(bufferise(d.data.value), bufferise(d.iv.value), key).then(result=>e.target.parentElement.outerHTML = result).catch(err=>e.target.style.color=FAIL)
			}
		}
	})
})