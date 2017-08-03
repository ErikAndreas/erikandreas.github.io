"use strict"
const App = {
	client_id: '9d4ecfc733cf415887763c509a274bc5',
	init: async function() {
		console.log('app');
		if (!Spotify.token &&!location.hash) {
			Spotify.client_id = App.client_id;
			Spotify.login();
		} else {
			const o = new URLSearchParams(location.hash.substring(1));
			//TODO: check state matches
			Spotify.token = o.get('access_token');
			console.log(Spotify.token);
			const deviceData = await Spotify.devices();
			deviceList.devices = [];
			deviceData.devices.forEach((dev) => {
		   		deviceList.devices.push({text: dev.type + ' - ' + dev.name, value: dev.id});
			});		
			deviceList.selected = deviceList.devices[0].value;
			const me = await Spotify.me();				
			console.log(me);
			Analyzer.init(EventBus);
			Player.init(EventBus);
			App.getPlayLists(0, 50);
		}
	},
	getPlayLists: async function(offset, limit) {	
		const plData = await Spotify.getPlayLists(offset, limit);
		//console.log(plData);
		plData.items.forEach((pl) => {
			playlistsHigh.playlists.push({text:pl.name, value:pl.href});
			playlistsLow.playlists.push({text:pl.name, value:pl.href});  			
		});
		if (plData.next) {
			App.getPlayLists(plData.offset + plData.limit, plData.limit);
		} else {
			playlistsHigh.selected = playlistsHigh.playlists[0].value;
			playlistsLow.selected = playlistsLow.playlists[0].value;
		}
	}
};
const EventBus = new Vue({
	data: {
		event: {
			PLAYLIST_CHANGED: 'playlist-changed',
			ANALYSIS_DONE: 'analysis-done'
		}
	}
});
const deviceList = new Vue({
	el: '#devC',
	data: {
		selected:'',
		devices:[] // list item: {text:text, value:value}
	}
});
const playlistsHigh = new Vue({
	el: '#plch',
	data: {
		selected:'',
		playlists:[]
	},
	methods: {
		playlistSelChanged() {
			EventBus.$emit(EventBus.event.PLAYLIST_CHANGED,'high');
		}
	}
});
const playlistsLow = new Vue({
	el: '#plcl',
	data: {
		selected:'',
		playlists:[]
	},
	methods: {
		playlistSelChanged() {
			EventBus.$emit(EventBus.event.PLAYLIST_CHANGED,'low');			
		}
	}
});
const startButton = new Vue({
	el: '#sbc',
	data: {
		isDisabled: false
	},
	created: function() {
		EventBus.$on(EventBus.event.PLAYLIST_CHANGED, (payload) => {
			console.log('event',payload)
			this.isDisabled = true;
		});
		EventBus.$on(EventBus.event.ANALYSIS_DONE, (payload) => {
			console.log('event', payload);
			this.isDisabled = false;
		})
	},
	methods: {
		start() {
			Player.start();
		}
	}
});
const analyzeButton = new Vue({
	el: '#abc',
	data: {},
	methods: {
		analyze() {
			Analyzer.analyze();
		}
	}
});
const playlistSettings = new Vue({
	el:'#settingsC',
	data: {
		shouldRandomize: false,
		shouldStartLow: true
	}
});
const playInfo = new Vue({
	el: '#playInfo',
	data: {
		curr:'',
		tot:'',
		artistTitle:'',
		artwork:''
	}
});
const workoutSettings = new Vue({
	el: '#wC',
	data: {
		tot:5,
		high:15,
		low:10
	},
	computed: {
		cycle: function() { return this.high + this.low;},
		totSecs:function() { return Math.ceil(this.tot * 60 / this.cycle)*this.cycle;}
	}
});
/* UI
/
about + connect
/home
select device + rescan
hiitfy ui
	
*/
