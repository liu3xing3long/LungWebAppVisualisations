var zincRenderer = undefined;
var currentInterfaceState = undefined;
var subjectDetails = undefined; /* new person(11, 152, "Male"); */
var dataController = undefined;
var sceneStatuses = undefined;

var container = document.getElementById( "zinc_window" );
var myLoadingPage = document.getElementById("loadingOverlay");
var lung_age_display = document.getElementById("play_pause_button");
var rendered_age = 0;
var currentBreathingTime = 0.0;
var currentDate = undefined;
var breath = 1;

var dot_top = undefined;
var dot_bottom = undefined;

var interface_ranges = ["young", "old"];
var mode_types = ["ventilation", "qdot", "v_q", "pao2"];
var scene_names = undefined;

var idleTime = 0;
var idleTimeLimit = 300000;
var oldTime = new Date();

var dynamic_p_v_plot = undefined;
var fev1_plot = undefined;
var breathing_plot = undefined;
var breathing_blood_air_plot = undefined;
var asthma_flow_plot = undefined;
var asthma_volume_plot = undefined;

var plot_data = new dataSet();

function person(age, height, gender) {
	this.age = age;
	this.height = height // cm
	this.fraction_constrict = 0.0;
	this.gender = gender;
	this.asthmaSeverity = "none";
	this.asthmaCondition = "none";
	this.ageStartedSmoking = 25;
	this.packsPerDay = 0.0;
	this.FEV1 = 2.7;
};

function interfaceState() {
	this.age_range = "young";
	this.active_mode = "ventilation";
};

function lungFunctionValues() {
	this.deadspace = undefined;
	this.compliance = undefined;
	this.resistance = undefined;
	this.work = undefined;
	this.pao2 = undefined;
};

function dataSet() {
	this.test = undefined;
	this.inspiration = undefined;
	this.expiration = undefined;
	this.breathing = undefined;
	this.breathing_blood = undefined;
	this.breathing_air = undefined;
	this.asthma_volume_normal = undefined;
	this.asthma_volume_mild = undefined;
	this.asthma_volume_moderate = undefined;
	this.asthma_volume_severe = undefined;
	this.asthma_volume_one_second = undefined;
	this.asthma_flow_normal = undefined;
	this.asthma_flow_mild = undefined;
	this.asthma_flow_moderate = undefined;
	this.asthma_flow_severe = undefined;
}

var dataLookup = {
	0.0: {"old": [103.7, 0.267, 0.56, 0.43, 91.3], "young": [103.7, 0.267, 0.274, 0.43, 91.5]},
	0.1: {"old": [ 84.0, 0.408, 0.56, 0.43, 91.3], "young": [ 84.0, 0.408, 0.274, 0.43, 91.4]},
	0.2: {"old": [ 66.4, 0.653, 0.56, 0.44, 91.1], "young": [ 66.4, 0.653, 0.274, 0.44, 91.2]},
	0.3: {"old": [ 50.8, 1.114, 0.56, 0.45, 90.0], "young": [ 50.8, 1.114, 0.274, 0.45, 90.4]},
	0.4: {"old": [ 37.3, 2.064, 0.56, 0.47, 83.9], "young": [ 37.3, 2.064, 0.274, 0.47, 88.4]},
	0.5: {"old": [ 25.9, 4.279, 0.56, 0.53, 81.7], "young": [ 25.9, 4.279, 0.274, 0.53, 82.6]},
}

/* According to studies, asthma severity affects percentage FEV1 */
var asthmaLevel = {
	"none" : 1.0,
	"Mild" : 0.8,
	"Moderate" : 0.7,
	"Severe": 0.6	
};

var surfaceStatus = {
	"scene": undefined,
	"initialised": false,
	"download": {
		"progress": 0,
		"total": 0,
	},
};

var airwaysStatus = {
	"scene": undefined,
	"initialised": false,
	"download": {
		"progress": 0,
		"total": 0,
	},
};

var lungsStatus = {
	"scene": undefined,
	"initialised": false,
	"download": {
		"progress": 0,
		"total": 0,
	},
};

function sceneStatus() {
	this.scene = undefined;
	this.initialised = false;
	this.download = {
		"progress": 0,
		"total": 0,
	};
};

var cellUniforms= THREE.UniformsUtils.merge( [
	{
		"ambient"  : { type: "c", value: new THREE.Color( 0xffffff ) },
		"emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
		"specular" : { type: "c", value: new THREE.Color( 0x111111 ) },
		"shininess": { type: "f", value: 100 },
		"diffuse": { type: "c", value: new THREE.Color( 0xeecaa2 ) },
		"ambientLightColor": { type: "c", value: new THREE.Color( 0x444444 ) },
		"directionalLightColor": { type: "c", value: new THREE.Color( 0x888888 ) },
		"directionalLightDirection": { type: "v3", value: new THREE.Vector3()  },
		"time": { type: "f", value: 0.0 },
		"starting_time": { type: "f", value: 0.0 },
		"severity": { type: "f", value: 0.0 },
		"cellsDensity": { type: "f", value: 0.1 },
		"tarDensity":  { type: "f", value: 0.0175},
		"breathing_cycle": { type: "f", value: 0.0 },
		"surfaceAlpha": { type: "f", value: 0.5 }
	}
] );

var flowUniforms= THREE.UniformsUtils.merge( [
{
	"ambient"  : { type: "c", value: new THREE.Color( 0xffffff ) },
	"emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
	"specular" : { type: "c", value: new THREE.Color( 0x111111 ) },
	"shininess": { type: "f", value: 100 },
	"ambientLightColor": { type: "c", value: new THREE.Color( 0x444444 ) },
	"directionalLightColor": { type: "c", value: new THREE.Color( 0x888888 ) },
	"directionalLightDirection": { type: "v3", value: new THREE.Vector3()  },
	"time": { type: "f", value: 0.0 },
	"starting_time": { type: "f", value: 0.0 },
	"severity": { type: "f", value: 1.0 },
	"height": { type: "f", value: 160.0 },
	"weight": { type: "f", value: 70.0 },
	"breathing_cycle": { type: "f", value: 0.0 },
	"asthmaSeverity": { type: "f", value: 1.0 },
	"constrict": { type: "f", value: 0.4 },
} ] );


