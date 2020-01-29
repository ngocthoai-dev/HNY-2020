// total canvas
let canv = document.getElementsByClassName('work-flow');
let ctxHNY = canv[0].getContext('2d');
let ctxFirework = canv[1].getContext('2d');
let ctxCannon = canv[2].getContext('2d');
let ctxpanel2020 = canv[3].getContext('2d');
let ctxRunningRat = canv[4].getContext('2d');
let ctxBackCannon = canv[5].getContext('2d');
let ctxGrass = canv[6].getContext('2d');
let ctxBackground = canv[7].getContext('2d');
// update each canvas width and height
[...Array(9).keys()].map((x)=>canv[x].width=canv[x].clientWidth);
[...Array(9).keys()].map((x)=>canv[x].height=canv[x].clientHeight);
// whole bigest canvas width, height
var width = canv[2].width;
var height = canv[2].height;

// Initialize the GL context
let gl = canv[8].getContext('webgl');
if(!gl){
  console.error("Unable to initialize WebGL.");
}

//Time step
let dt = 0.015;
//Time
let time = 0.0;

let vertexSource = `
attribute vec2 position;
void main() {
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

let fragmentSource = `
precision highp float;

uniform float width;
uniform float height;
vec2 resolution = vec2(width, height);

uniform float time;

#define POINT_COUNT 8

vec2 points[POINT_COUNT];
const float speed = -0.5;
const float len = 0.25;
float intensity = 0.9;
float radius = 0.015;

//https://www.shadertoy.com/view/MlKcDD
//Signed distance to a quadratic bezier
float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C){    
	vec2 a = B - A;
	vec2 b = A - 2.0*B + C;
	vec2 c = a * 2.0;
	vec2 d = A - pos;

	float kk = 1.0 / dot(b,b);
	float kx = kk * dot(a,b);
	float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
	float kz = kk * dot(d,a);      

	float res = 0.0;

	float p = ky - kx*kx;
	float p3 = p*p*p;
	float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
	float h = q*q + 4.0*p3;

	if(h >= 0.0){ 
		h = sqrt(h);
		vec2 x = (vec2(h, -h) - q) / 2.0;
		vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
		float t = uv.x + uv.y - kx;
		t = clamp( t, 0.0, 1.0 );

		// 1 root
		vec2 qos = d + (c + b*t)*t;
		res = length(qos);
	}else{
		float z = sqrt(-p);
		float v = acos( q/(p*z*2.0) ) / 3.0;
		float m = cos(v);
		float n = sin(v)*1.732050808;
		vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
		t = clamp( t, 0.0, 1.0 );

		// 3 roots
		vec2 qos = d + (c + b*t.x)*t.x;
		float dis = dot(qos,qos);
        
		res = dis;

		qos = d + (c + b*t.y)*t.y;
		dis = dot(qos,qos);
		res = min(res,dis);
		
		qos = d + (c + b*t.z)*t.z;
		dis = dot(qos,qos);
		res = min(res,dis);

		res = sqrt( res );
	}
    
	return res;
}


//http://mathworld.wolfram.com/HeartCurve.html
vec2 getHeartPosition(float t){
	return vec2(16.0 * sin(t) * sin(t) * sin(t),
							-(13.0 * cos(t) - 5.0 * cos(2.0*t)
							- 2.0 * cos(3.0*t) - cos(4.0*t)));
}

//https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity){
	return pow(radius/dist, intensity);
}

float getSegment(float t, vec2 pos, float offset, float scale){
	for(int i = 0; i < POINT_COUNT; i++){
		points[i] = getHeartPosition(offset + float(i)*len + fract(speed * t) * 6.28);
	}
    
	vec2 c = (points[0] + points[1]) / 2.0;
	vec2 c_prev;
	float dist = 10000.0;
    
	for(int i = 0; i < POINT_COUNT-1; i++){
		//https://tinyurl.com/y2htbwkm
		c_prev = c;
		c = (points[i] + points[i+1]) / 2.0;
		dist = min(dist, sdBezier(pos, scale * c_prev, scale * points[i], scale * c));
	}
	return max(0.0, dist);
}

void main(){
	vec2 uv = gl_FragCoord.xy/resolution.xy;
	float widthHeightRatio = resolution.x/resolution.y;
	vec2 centre = vec2(0.5, 0.5);
	vec2 pos = centre - uv;
	pos.y /= widthHeightRatio;
	//Shift upwards to centre heart
	pos.y += 0.02;
	float scale = 0.000015 * height;
	
	float t = time;
    
	//Get first segment
	float dist = getSegment(t, pos, 0.0, scale);
	float glow = getGlow(dist, radius, intensity);
    
	vec3 col = vec3(0.0);
    
	//White core
	col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
	//Pink glow
	col += glow * vec3(0.94,0.14,0.4);
    
	//Get second segment
	dist = getSegment(t, pos, 3.4, scale);
	glow = getGlow(dist, radius, intensity);
    
	//White core
	col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
	//Blue glow
	col += glow * vec3(0.2,0.6,1.0);
        
	//Tone mapping
	col = 1.0 - exp(-col);

	//Output to screen
 	gl_FragColor = vec4(col,1.0);
}
`;
//Compile shader and combine with source
function compileShader(shaderSource, shaderType){
  let shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
  	throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

//From https://codepen.io/jlfwong/pen/GqmroZ
//Utility to complain loudly if we fail to find the attribute/uniform
function getAttribLocation(program, name) {
  let attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
  	throw 'Cannot find attribute ' + name + '.';
  }
  return attributeLocation;
}

function getUniformLocation(program, name) {
  let attributeLocation = gl.getUniformLocation(program, name);
  if (attributeLocation === -1) {
  	throw 'Cannot find uniform ' + name + '.';
  }
  return attributeLocation;
}

//************** Create shaders **************

//Create vertex and fragment shaders
let vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
let fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

//Create shader programs
let program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

gl.useProgram(program);

//Set up rectangle covering entire canvas 
let vertexData = new Float32Array([
  -1.0,  1.0, 	// top left
  -1.0, -1.0, 	// bottom left
   1.0,  1.0, 	// top right
   1.0, -1.0, 	// bottom right
]);

//Create vertex buffer
let vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// Layout of our data in the vertex buffer
let positionHandle = getAttribLocation(program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
  2, 				// position is a vec2 (2 values per component)
  gl.FLOAT, // each component is a float
  false, 		// don't normalize values
  2 * 4, 		// two 4 byte float components per vertex (32 bit float is 4 bytes)
  0 				// how many bytes inside the buffer to start from
  );

//Set uniform handle
let timeHandle = getUniformLocation(program, 'time');
let widthHandle = getUniformLocation(program, 'width');
let heightHandle = getUniformLocation(program, 'height');

gl.uniform1f(widthHandle, window.innerWidth);
gl.uniform1f(heightHandle, window.innerHeight);

function draw(){
  //Update time
  time += dt;

	//Send uniforms to program
  gl.uniform1f(timeHandle, time);
  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

var userInput = document.getElementsByClassName('name-input')[0];
var userName = 'my buddy';
document.getElementById("name-form").addEventListener('submit', (evt)=>{
  evt.preventDefault();
  if (userInput.value.length == 0) {
    return;
  } else {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "./handler/index.php?userName=" + userInput.value, true);
    xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
      	console.log('GOOD!');
      }
    };
    xmlhttp.send();
    userName = userInput.value;
  }
});

window.requestAnimeFrame = ( function() {
	return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				function(callback) {
					window.setTimeout(callback, 1000/60);
				};
})();

// HNY text
let HNY = "Happy New Year,",
// HNY collection
HNYs = [];

// firework back cannon collection
let fireworksBack = [],
// firework main cannon collection
fireworksMain = [],
// particle back cannon collection
particlesBack = [],
// particle main cannon collection
particlesMain = [],
// base color
basedColor = [...Array(18).keys()].map((x)=>x*20+1) + [...Array(18).keys()].map((x)=>x*20),
// type firework
typeFirework = ['line', 'arc', 'circle', 'rectangle', 'special', 'HNY'];

// construct HNY Text
class HNYText {
	constructor(x, y, userName){
		this.x = x;
		this.y = y;
		this.userName = userName;
		// set the hue to a random number of the overall hue variable
		this.hue = random(0, 360);
		this.brightness = random(40, 50);
		this.alpha = 1;
		// set how fast the particle fades out
		this.decay = random(0.004, 0.008);
	}

	update(idx){
		// fade out the particle
		this.alpha -= this.decay;
		this.hue = random(0, 360);
		this.brightness = random(40, 50);
		
		// remove the particle once the alpha is low enough, based on the passed in index
		if(this.alpha <= this.decay) {
			HNYs.splice(idx, 1);
		}
		this.draw();
	}

	draw(){
		ctxHNY.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxHNY.font = '30px Impact';
		ctxHNY.fillText(HNY, this.x - 100, this.y - 30);
		ctxHNY.fillText(this.userName + "!", this.x - this.userName.length*8, this.y);
	}
}

// construct firework
class firework {
	constructor(sx, sy, tx, ty, type, acceleration=1.1, hueInit=-1){
		// firework type, line is biased
		this.type = typeFirework[type];
		this.arcRadius = random(2, 3);
		this.circleRadius = random(1, 2);
		this.squareEdge = random(1, 2);
		// actual coordinates
		this.x = sx;
		this.y = sy;
		// starting coordinates
		this.sx = sx;
		this.sy = sy;
		// target coordinates
		this.tx = tx;
		this.ty = ty;
		// distance from starting point to target
		this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
		this.distanceTraveled = 0;
		// track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
		this.coordinates = [];
		this.coordinateCount = 5;
		// populate initial coordinate array with the current coordinates
		while(this.coordinateCount--) {
			this.coordinates.push([this.x, this.y]);
		}
		// angle to target
		this.angle = Math.atan2(ty - sy, tx - sx);
		this.speed = 2;
		this.hueInit = hueInit;
		if(basedColor.includes(Math.floor(this.hueInit))){
			this.hue = this.hueInit;
		} else {
			this.hue = random(0, 360);
		}
		this.acceleration = acceleration;
		this.brightness = random(20, 80);
	}

	update(idx){
		// remove last item in coordinates array
		this.coordinates.pop();
		// add current coordinates to the start of the array
		this.coordinates.unshift([this.x, this.y]);	
		// speed up the firework
		this.speed *= this.acceleration;
		if(basedColor.includes(Math.floor(this.hueInit))){
			this.hue = this.hue;
		} else {
			this.hue = random(0, 360);
		}
		// get the current velocities based on angle and speed
		var vx = Math.cos(this.angle) * this.speed,
				vy = Math.sin(this.angle) * this.speed;
		// how far will the firework have traveled with velocities applied?
		this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);
		
		// if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
		if(this.distanceTraveled >= this.distanceToTarget) {
			// remove the firework, use the index passed into the update function to determine which to remove
			if(!this.type.localeCompare('special')){
				createParticles(this.tx, this.ty, this.type, particlesMain, this.hue, true);
				fireworksMain.splice(idx, 1);
			} else if(!this.type.localeCompare('HNY')){
				HNYs.push(new HNYText(this.tx, this.ty, userName));
				fireworksMain.splice(idx, 1);
			} else {
				createParticles(this.tx, this.ty, this.type, particlesBack, this.hue);
				fireworksBack.splice(idx, 1);
			}
		} else {
			// target not reached, keep traveling
			this.x += vx;
			this.y += vy;
		}
	}

	draw() {
		this.arcRadius += 0.4;
		this.circleRadius += 0.4;
		this.squareEdge += 0.5;
		if(!this.type.localeCompare('special')){
			ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.fillRect(this.x, this.y, this.squareEdge, this.squareEdge);
			ctxFirework.beginPath();
			ctxFirework.arc(this.x, this.y, this.arcRadius, Math.PI*4/3, Math.PI*5/3);
			ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.fill();
			ctxFirework.beginPath();
			ctxFirework.arc(this.x, this.y, this.circleRadius, 0, Math.PI*2);
			ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.fill();
			ctxFirework.beginPath();
			ctxFirework.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
			ctxFirework.lineTo(this.x, this.y);
			ctxFirework.strokeStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.stroke();	
		}
		else if(!this.type.localeCompare('rectangle')){
			// move to the last tracked coordinate in the set, then draw a rectangle to the current x and y
			ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.fillRect(this.x, this.y, this.squareEdge, this.squareEdge);
		} else if(!this.type.localeCompare('arc')){
			// move to the last tracked coordinate in the set, then draw a arc to the current x and y
			ctxFirework.beginPath();
			ctxFirework.arc(this.x, this.y, this.arcRadius, Math.PI*4/3, Math.PI*5/3);
			ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.fill();
		} else if(!this.type.localeCompare('circle')){
			// move to the last tracked coordinate in the set, then draw a circle to the current x and y
			ctxFirework.beginPath();
			ctxFirework.arc(this.x, this.y, this.circleRadius, 0, Math.PI*2);
			ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.fill();
		} else {
			// move to the last tracked coordinate in the set, then draw a line to the current x and y
			ctxFirework.beginPath();
			ctxFirework.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
			ctxFirework.lineTo(this.x, this.y);
			ctxFirework.strokeStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.stroke();
		}
	}
}
// create particle
function Particle(x, y, typeParticle, particles, hueInit, boomAgain=false) {
	// particle type
	this.type = typeParticle;
	this.arcRadius = random(1, 2);
	this.circleRadius = random(0.5, 1);
	this.squareEdge = random(0.5, 1);
	this.particles = particles;
	this.boomAgain = boomAgain;

	this.x = x;
	this.y = y;
	// track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
	this.coordinates = [];
	this.coordinateCount = 20;
	while(this.coordinateCount--) {
		this.coordinates.push([this.x, this.y]);
	}
	// set a random angle in all possible directions, in radians
	this.angle = random(0, Math.PI * 2);
	this.speed = random(1, 5);
	// friction will slow the particle down
	this.friction = 0.95;
	// gravity will be applied and pull the particle down
	this.gravity = random(0.5, 1.5);
	if(!this.type.localeCompare('special'))
		this.gravity = random(0, 0.5);
	// set the hue to a random number of the overall hue variable
	this.hueInit = hueInit;
	if(basedColor.includes(Math.floor(this.hueInit))){
		this.hue = this.hueInit;
	} else {
		this.hue = random(0, 360);
	}
	this.brightness = random(40, 60);
	this.alpha = 1;
	// set how fast the particle fades out
	this.decay = random(0.0075, 0.015);
}
// update particle
Particle.prototype.update = function(idx) {
	// remove last item in coordinates array
	if(basedColor.includes(Math.floor(this.hueInit))){
		this.hue = this.hue;
	} else {
		this.hue = random(0, 360);
	}
	this.coordinates.pop();
	// add current coordinates to the start of the array
	this.coordinates.unshift([this.x, this.y]);
	// slow down the particle
	this.speed *= this.friction;
	// apply velocity
	this.x += Math.cos(this.angle) * this.speed;
	this.y += Math.sin(this.angle) * this.speed + this.gravity;
	// fade out the particle
	this.alpha -= this.decay;
	
	// remove the particle once the alpha is low enough, based on the passed in index
	if(this.alpha <= this.decay) {
		if(!this.type.localeCompare('special')){
			if(this.boomAgain){
				this.boomAgain = false;
				createParticles(this.x, this.y, this.type, particlesMain, this.hueInit, this.boomAgain);
			}
		}
		this.particles.splice(idx, 1);
	}
}
// draw particle
Particle.prototype.draw = function() {
	this.arcRadius += 0.066;
	this.circleRadius += 0.033;
	this.squareEdge += 0.075;
	if(!this.type.localeCompare('special')){
		ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxFirework.fillRect(this.x-this.circleRadius, this.y+this.circleRadius, this.squareEdge, this.squareEdge);
		ctxFirework.beginPath();
		ctxFirework.arc(this.x, this.y, this.arcRadius, Math.PI*4/3, Math.PI*5/3);
		ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxFirework.fill();
		ctxFirework.beginPath();
		ctxFirework.arc(this.x, this.y, this.circleRadius, 0, Math.PI*2);
		ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxFirework.fill();
		ctxFirework.beginPath();
		ctxFirework.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
		ctxFirework.lineTo(this.x, this.y);
		ctxFirework.strokeStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxFirework.stroke();
	}
	else if(!this.type.localeCompare('rectangle')){
		// move to the last tracked coordinate in the set, then draw a rectangle to the current x and y
		ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxFirework.fillRect(this.x, this.y, this.squareEdge, this.squareEdge);
	} else if(!this.type.localeCompare('arc')){
		// move to the last tracked coordinate in the set, then draw a arc to the current x and y
		ctxFirework.beginPath();
		let arcDirect = random(0, Math.PI);
		ctxFirework.arc(this.x, this.y, this.arcRadius, arcDirect, arcDirect*2);
		ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxFirework.fill();
	} else if(!this.type.localeCompare('circle')){
		// move to the last tracked coordinate in the set, then draw a circle to the current x and y
		ctxFirework.beginPath();
		ctxFirework.arc(this.x, this.y, this.circleRadius, 0, Math.PI*2);
		ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxFirework.fill();
	} else {
		// move to the last tracked coordinate in the set, then draw a line to the current x and y
		if(Math.floor(random(0, 2))){
			ctxFirework.beginPath();
			ctxFirework.arc(this.x, this.y, this.circleRadius, 0, Math.PI*2);
			ctxFirework.fillStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
			ctxFirework.fill();
		}
		ctxFirework.beginPath();
		ctxFirework.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
		ctxFirework.lineTo(this.x, this.y);
		ctxFirework.strokeStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
		ctxFirework.stroke();
	}
}
// create particles explosion
function createParticles(x, y, typeFirework='line', particles=particlesBack, hueInit=-1, boomAgain=false) {
	// increase the particle count for a bigger explosion
	var particleCount = Math.floor(random(10, 20));
	// if(!typeFirework.localeCompare('special')){
	// 	particleCount = Math.floor(random(5, 10));
	// }
	while(particleCount--) {
		particles.push(new Particle(x, y, typeFirework, particles, hueInit, boomAgain));
	}
}

// main cannon
class cannon {
	constructor(position, angle=0){
		this.click = false;
		this.position = position;
		this.angle = angle;
		// draw first range shooting guide
		ctxCannon.fillStyle = "blue";
		ctxCannon.save();
		ctxCannon.beginPath();
		ctxCannon.translate(this.position[0]+this.position[2]*25/100+this.position[2]*25/100, this.position[1]+this.position[3]);
		ctxCannon.moveTo(0, 0);
		ctxCannon.rotate(Math.PI/4);
		ctxCannon.lineTo(0, (height-(this.position[1]+this.position[3]))/Math.cos(Math.PI/4));
		ctxCannon.rotate(-Math.PI/2);
		ctxCannon.moveTo(0, 0);
		ctxCannon.lineTo(0, (height-(this.position[1]+this.position[3]))/Math.cos(Math.PI/4));
		ctxCannon.restore();
		ctxCannon.stroke();
		// draw gun first time
		this.update();
		// add event gun direction
		this.direct();
	}

	// platform of the gun
	createPlatForm(){
		ctxCannon.fillStyle = "blue";
		ctxCannon.fillRect(this.position[0]+this.position[2]*25/100, this.position[1]+this.position[3], this.position[2]*50/100, this.position[2]*2/3);
		ctxCannon.fillRect(this.position[0], this.position[1]+this.position[3]+this.position[2]/2, this.position[2], this.position[3]*50/100);
	}

	// update the gun
	update(){
		// ctxCannon.fillStyle = "azure";
		ctxCannon.beginPath();
    ctxCannon.save();
		ctxCannon.translate(this.position[0]+this.position[2]*25/100+this.position[2]*25/100, this.position[1]+this.position[3]+this.position[2]/4-this.position[2]/2);
		ctxCannon.rotate(-this.angle);
		ctxCannon.arc(0, 0, this.position[2]/2, 0, Math.PI);
    ctxCannon.translate(-this.position[2]/2, -this.position[3]+0.25);
		ctxCannon.fillRect(0, 0, this.position[2], this.position[3]);
		ctxCannon.restore();
		ctxCannon.fill();
		this.createPlatForm();
	}

	// rotate gun direction
	direct(){
		canv[2].addEventListener('mousemove', (evt)=>{
			this.clear();
			// draw shooting line direction
			var x = evt.clientX;
			var y = evt.clientY;
			this.angle = Math.acos((y-(this.position[1]+this.position[3]))/(calculateDistance(x, y, this.position[0]+this.position[2]*25/100+this.position[2]*25/100, this.position[1]+this.position[3])));
			if(this.angle > Math.PI/4){
				this.angle = Math.PI/4;
			}
			if(x<this.position[0]+this.position[2]*25/100){
				this.angle = -this.angle;
			}
			ctxCannon.save();
			ctxCannon.beginPath();
			ctxCannon.translate(this.position[0]+this.position[2]*25/100+this.position[2]*25/100, this.position[1]+this.position[3]);
			ctxCannon.moveTo(0, 0);
			ctxCannon.rotate(-this.angle);
			this.distanceToMouse = calculateDistance(x, y, this.position[0]+this.position[2]*25/100+this.position[2]*25/100, this.position[1]+this.position[3]);
			ctxCannon.lineTo(0, this.distanceToMouse);
			ctxCannon.restore();
			ctxCannon.stroke();
			this.update();
		});
		// shoot
		canv[2].addEventListener('click', ()=>this.shoot());
	}

	shoot(){
		// x, y of cannon in initial canvas
		let an = (Math.PI-this.angle)/2;
		this.x = this.position[0]+this.position[2]*25/100+this.position[2]*25/100;
		this.y = this.position[1]+this.position[3];
		// number of shot will be out
		let noShot = 3;
		let acceleration;
		let hueInit;
		let hue;
		while(noShot--){
			hueInit = -1;
			hue = random(0, 360);
			if(basedColor.includes(hue)){
				hueInit = hue;
			}
			acceleration = Math.pow(1.1, this.distanceToMouse/(height*30/100));
			let angleShot = random(this.angle-Math.PI/9, this.angle+Math.PI/9);
			this.yShotRange = random(50, height*30/100);
			fireworksMain.push(new firework(this.x, this.y, this.x + Math.atan(-angleShot) * (this.y - this.yShotRange), this.yShotRange, 4, acceleration, hueInit));
		}
		// shot for happy new year
		hueInit = -1;
		hue = random(0, 360);
		if(basedColor.includes(hue)){
			hueInit = hue;
		}
		acceleration = Math.pow(1.1, this.distanceToMouse/(height*30/100));
		fireworksMain.push(new firework(this.x, this.y, this.x + Math.atan(-this.angle) * (this.y - this.yShotRange), this.yShotRange, 5, acceleration, hueInit));
	}

  clear(){
    ctxCannon.clearRect(0, 0, width, height);
  }
}

// back cannon
class backCannon {
	constructor(position, idx){
		// position of main cannon to draw back cannon
		this.position = position;
		// back cannon index
		this.idx = idx;
		if(idx>=4)
			idx += 1;
		ctxBackCannon.fillStyle = "black";
		// random position back cannon
		this.x = width/10*(idx+1);
		this.y = this.position[1]+this.position[3]-random(-10, 30);
		ctxBackCannon.fillRect(this.x, this.y, this.position[2]/4, this.position[3]);
		ctxBackCannon.fillRect(this.x-this.position[2]/3, this.y+this.position[3]*3/4, this.position[2]/1.1, this.position[3]*25/100);
		canv[5].style.opacity = 0.5;
		this.shoot();
	}

	shoot(){
		// random angle and range of the explosion
		this.angle = random(-Math.PI/9, Math.PI/9);
		this.yShotRange = random(0, height*30/100);
		let temp = Math.floor(random(0, 5));
		if(temp > 3)
			temp = 0;
		let hueInit = -1;
		let hue = random(0, 360);
		if(basedColor.includes(hue)){
			hueInit = hue;
		}
		fireworksBack.push(new firework(this.x, this.y, this.x + Math.atan(this.angle) * (this.y - this.yShotRange), this.yShotRange, temp, 1.1, hueInit));
	}
}

// rat collection
let rats = [], 
// url to rat and number of sprites
ratsUrl = [{
						url: './img/pikachu/sprites_left.png', 
						noSprite: 4
					},{
						url: './img/pikachu/sprites_right.png', 
						noSprite: 4
					},{
						url: './img/blackWhiteRat/sprites_left.png',
						noSprite: 5
					},{
						url: './img/blackWhiteRat/sprites_right.png',
						noSprite: 5
					}, {
						url: './img/whiteRat/sprites_left.png',
						noSprite: 6
					}, {
						url: './img/whiteRat/sprites_right.png',
						noSprite: 6
					}, {
						url: './img/flyRat/sprites_left.png',
						noSprite: 12
					}, {
						url: './img/flyRat/sprites_right.png',
						noSprite: 12
					}],
// rat type
ratsType = [{
						ratType: 'pikachu', 
						direction: 0,
						spriteWidth: 190,
						spriteHeight: 128
					},{
						ratType: 'pikachu', 
						direction: 1,
						spriteWidth: 190						
					}, {
						ratType: 'blackWhiteRat',
						direction: 0,
						spriteWidth: 570,
						spriteHeight: 128
					}, {
						ratType: 'blackWhiteRat',
						direction: 1,
						spriteWidth: 570,
						spriteHeight: 128
					}, {
						ratType: 'whiteRat',
						direction: 0,
						spriteWidth: 408,
						spriteHeight: 128
					}, {
						ratType: 'whiteRat',
						direction: 1,
						spriteWidth: 408,
						spriteHeight: 128
					}, {
						ratType: 'flyRat',
						direction: 0,
						spriteWidth: 580,
						spriteHeight: 500
					}, {
						ratType: 'flyRat',
						direction: 1,
						spriteWidth: 580,
						spriteHeight: 500
					}];

// construct rat
class runningRat {
	// initiate start and destination, speed and acceleration of the rat
	constructor(url, noSprite, ratType, direction, spriteWidth, spriteHeight=128){
		// direction of rat: 0 for left, 1 for right
		this.direction = direction;
		this.spriteWidth = spriteWidth;
		this.ratType = ratType;
		this.cutY = 0;
		this.spriteHeight = spriteHeight;
		if(this.direction){
			this.x = width + width/10;
			this.xd = -width/10;
		} else {
			this.x = -width/10;
			this.xd = width + width/10;
		}
		this.speed = 12;
		this.acceleration = 1.1;
		this.noSprite = noSprite;
		this.spriteIdx = this.noSprite-1;
		this.y = height*60/100;
		if(!this.ratType.localeCompare('flyRat')){
			this.y = height*20/100;
		}
		this.delays = Math.floor(random(8, 12));
		this.url = url;
	}

	// update rat moving state
	update(idx){
		this.speed *= this.acceleration;
		if(this.spriteIdx>this.noSprite-1){
			this.cutY = 0;
			this.spriteIdx = 1;
		}
		if(this.direction){
			this.x -= this.speed;
			// if run over the width remove this rat
			if(this.x <= this.xd){
				rats.splice(idx, 1);
			}
		}
		else{
			this.x += this.speed;
			// if run over the width remove this rat
			if(this.x >= this.xd){
				rats.splice(idx, 1);
			}
		}
		this.cutY = this.spriteHeight*this.spriteIdx;
		this.spriteIdx++;
	}

	draw(){
		let sprite = new Image, x = this.x, y = this.y, speed = this.speed,
		cutY = this.cutY, spriteWidth = this.spriteWidth, spriteHeight = this.spriteHeight;
		sprite.onload = function() {
			ctxRunningRat.drawImage(sprite, 0, cutY, spriteWidth, spriteHeight, x, y+height/12, width/10, height/15);
		}
		sprite.src = this.url;
	}
}

// main demo loop
function animation() {
	// this function will run endlessly with requestAnimationFrame
	requestAnimeFrame(animation);
	// if back cannon is end, create a new episode
	if(!(fireworksBack.length || particlesBack.length)){
		[...Array(8).keys()].map((idx)=>backStageCannon[idx].shoot());
	}

  // create random color
  hue = random(0, 360);
	
	// setting the composite operation to destination-out to clear the canvas at a specific opacity, rather than wiping it entirely like clearRect()
	ctxFirework.globalCompositeOperation = 'destination-out';
	ctxHNY.globalCompositeOperation = 'destination-out';
	// decrease the alpha property to create more prominent trails
	let alpha = random(0.2, 0.4);
	ctxFirework.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
	ctxFirework.fillRect(0, 0, canv[0].width, canv[0].height);
	ctxHNY.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
	ctxHNY.fillRect(0, 0, canv[0].width, canv[0].height);

	// change the composite operation back to our main mode, lighter creates bright highlight points as the fireworks and particles overlap each other
	ctxFirework.globalCompositeOperation = 'lighter';
	ctxHNY.globalCompositeOperation = 'lighter';
	// loop over each firework, particle, HNY text at all
	var i = fireworksBack.length;
	while(i--) {
		fireworksBack[i].draw();
		fireworksBack[i].update(i);
	}
	var i = fireworksMain.length;
	while(i--) {
		fireworksMain[i].draw();
		fireworksMain[i].update(i);
	}
	
	var i = particlesBack.length;
	while(i--) {
		particlesBack[i].draw();
		particlesBack[i].update(i);
	}
	var i = particlesMain.length;
	while(i--) {
		particlesMain[i].draw();
		particlesMain[i].update(i);
	}
	var i = HNYs.length;
	while(i--){
		HNYs[i].draw();
		HNYs[i].update(i);
	}

	var i = rats.length;
	if(i){
		i--;
		if(rats[i].delays==0){
			// delete old motion
			ctxRunningRat.globalCompositeOperation = 'destination-out';
			ctxRunningRat.fillStyle = 'rgb(0, 0, 0, 0.6)';
			ctxRunningRat.fillRect(0, 0, width, height);
			ctxRunningRat.globalCompositeOperation = 'lighter';
			rats[i].draw();
			// delay moving time
			rats[i].delays = Math.floor(random(8, 12));
			rats[i].update(i);
		}
		else{
			rats[i].delays--;
		}
	} else {
		let randRat = Math.floor(random(0, 8));
		rats.push(new runningRat(ratsUrl[randRat]['url'], ratsUrl[randRat]['noSprite'], ratsType[randRat]['ratType'], ratsType[randRat]['direction'], ratsType[randRat]['spriteWidth'], ratsType[randRat]['spriteHeight']));	
	}
}

// draww grass
class grass {
	constructor(url){
		this.url = url;
		var img = new Image;
	  img.onload = function() {
	    ctxGrass.drawImage(img, 0, 0, width, height);
	  };
	  img.src = this.url;
	}
}

// draww sky
class background {
	constructor(url){
		this.url = url;
		var img = new Image;
	  img.onload = function() {
	    ctxBackground.drawImage(img, 0, 0, width, height);
	  };
	  img.src = this.url;
	}
}

class panel2020 {
	constructor(url, position){
		this.url = url;
		this.position = position;
		let i = this.url.length;
		while(i--){
			let img = new Image, position = this.position;
			if(i == 1){
			  img.onload = function() {
			    ctxpanel2020.drawImage(img, position[0]-position[2]*2-width/10, position[1]-position[3]*3, position[2]*4, position[2]+position[3]*4);
			  };
		 		img.src = this.url[0];
			} else {
			  img.onload = function() {
			    ctxpanel2020.drawImage(img, position[0]+position[2]*3, position[1]-position[3]*3, position[2]*4, position[2]+position[3]*4);
			  };
		 		img.src = this.url[1];
			}
		}
		let grd = ctxpanel2020.createLinearGradient(width/2-40, height/2, width/2+80, height/2+40);
		grd.addColorStop("0", "rgb(153, 204, 255)");
		grd.addColorStop("0.5" ,"rgb(255, 153, 153)");
		grd.addColorStop("1.0", "rgb(102, 255, 102)");
		ctxpanel2020.strokeStyle = grd;
		ctxpanel2020.font = '40px Impact bold';
		ctxpanel2020.strokeText('2020', width/2-40, height/2);
	}
}

if(Math.floor(random(0, 2)))
	new background("./img/Star.jpg");
else
	draw();
new grass("./img/Grass-Plain.png");

// -45 -> 45 (-pi/4 -> pi/4)
var cannonsPos = [parseInt(width*49/100), parseInt(height*70/100), parseInt(width*2/100), parseInt(height*3/100)];
new panel2020(["./img/umaru.png", "./img/hamsuke.png"], cannonsPos);
new cannon(cannonsPos).createPlatForm();
var backStageCannon = [...Array(8).keys()].map((idx)=>new backCannon(cannonsPos, idx));
animation();

// get a random number in range
function random(min, max){
	return Math.random() * (max - min) + min;
}

// calculate the distance between two points
function calculateDistance(x1, y1, x2, y2){
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

