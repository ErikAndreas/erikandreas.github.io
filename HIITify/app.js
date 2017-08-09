"use strict"
const Store = {
	state: {
		selectedDevice:'isd',
		devices: [],
		playlist: {
			highs:[],
			lows: [],
			high:'', // href
			low: '',
			shouldRandomize: false,
			shouldStartLow: true
		},
		workout: {
			tot:3,
			high:12,
			low:14
		},
		isStartDisabled:true,
		playInfo: {
			curr:'',
			tot:'',
			artistTitle:'',
			artwork:'',
			isPlaying: false
		}
	}
};

const App = {
	client_id: '9d4ecfc733cf415887763c509a274bc5',
	init: async function() {
		console.log('app');
		View.current = View.views.INIT;
		if (!Spotify.token &&!location.hash) {
			Spotify.client_id = App.client_id;
			Spotify.login();
		} else {
			View.current = View.views.SETTINGS;
			const o = new URLSearchParams(location.hash.substring(1));
			//TODO: check state matches
			Spotify.token = o.get('access_token');
			console.log(Spotify.token);
			const deviceData = await Spotify.devices();
			//deviceList.devices = [];
			Store.state.devices = []
			deviceData.devices.forEach((dev) => {
		   		//deviceList.devices.push({text: dev.type + ' - ' + dev.name, value: dev.id});
		   		Store.state.devices.push({text: dev.type + ' - ' + dev.name, value: dev.id});
			});		
			Store.state.selectedDevice = Store.state.devices[0].value;
			const me = await Spotify.me();				
			console.log(me);
			Analyzer.init(EventBus);
			Player.init(EventBus);
			App.getPlayLists(0, 50);
		}
		EventBus.$on(EventBus.event.DEVICE_CHANGED, (payload) => {
			console.log('event',payload)
			Store.state.selectedDevice = payload;
		});
	},
	getPlayLists: async function(offset, limit) {	
		const plData = await Spotify.getPlayLists(offset, limit);
		plData.items.forEach((pl) => {
			//playlistsHigh.playlists.push({text:pl.name, value:pl.href});
			Store.state.playlist.highs.push({text:pl.name, value:pl.href});
			//playlistsLow.playlists.push({text:pl.name, value:pl.href}); 
			Store.state.playlist.lows.push({text:pl.name, value:pl.href}); 	
		});
		if (plData.next) {
			App.getPlayLists(plData.offset + plData.limit, plData.limit);
		} else {
			Store.state.playlist.high = Store.state.playlist.highs[0].value;
			Store.state.playlist.low = Store.state.playlist.lows[0].value;
		}
	}
};
const View = new Vue({
	// gotcha, cant nest vue instances, root might be instance, childs must be components	
	//el: '#viewRoot',
	data: {
		views: {
			INIT: 'init',
			SETTINGS: 'settings', 
			WORKOUT: 'workout'
		},
		current: ''
	},
	methods: {
		login() {
			Spotify.login();
		}
	}
});
const EventBus = new Vue({
	data: {
		event: {
			PLAYLIST_CHANGED: 'playlist-changed',
			DEVICE_CHANGED: 'device-changed',
			ANALYSIS_DONE: 'analysis-done',
			PLAYER_STARTED: 'player-started',
			PLAYER_STOPPED: 'player-stopped',
			PLAYER_TICK: 'player-tick',
			PLAYER_TRACKCHANGED: 'player-trackchanged'
		}
	}
});

Vue.component('device-list', {
	template: `	
			<select v-model="shared.selectedDevice" v-on:change="deviceSelChanged">
				<option v-for="device in shared.devices" v-bind:value="device.value">{{device.text}}</option>
			</select>
			`,
	data: () => {
		return {
			shared:Store.state,
		}
	},
	methods: {
		deviceSelChanged() {
			EventBus.$emit(EventBus.event.DEVICE_CHANGED, this.shared.selectedDevice);
		}
	}
});

Vue.component('setting', {
	props: ['val'],
	template: `<input ref="input" type="number" min="1" v-bind:value="val" v-on:input="upd($event.target.value)"/>`,
	methods: {
		upd(value) {
			this.$emit('input', parseInt(value,10));
		}
	}
});

Vue.component('playlists-high', {
	template: `	
			<span>High: <select v-model="shared.playlist.high" v-on:change="playlistSelChanged">			
				<option v-for="playlist in shared.playlist.highs" v-bind:value="playlist.value">{{playlist.text}}</option>
			</select></span>
			`,
	data: () => {
		return {
			shared:Store.state,
		}
	},
	methods: {
		playlistSelChanged() {
			EventBus.$emit(EventBus.event.PLAYLIST_CHANGED,'high');
		}
	}
});

Vue.component('playlists-low', {
	template: `	
			<div>Low: <select v-model="shared.playlist.low" v-on:change="playlistSelChanged">			
				<option v-for="playlist in shared.playlist.lows" v-bind:value="playlist.value">{{playlist.text}}</option>
			</select></div>
			`,
	data: () => {
		return {
			shared:Store.state
		}
	},
	methods: {
		playlistSelChanged() {
			EventBus.$emit(EventBus.event.PLAYLIST_CHANGED,'low');
		}
	}
});

Vue.component('toggle', {
	template: `<input type="checkbox" :checked="value" @change="$emit('input', $event.target.checked)"/>`,
	props: ['value']
});

Vue.component('button-analyze', {
	template: `<button @click="analyze()"><slot>txt</slot></button>`,
	methods: {
		analyze() {
			Analyzer.analyze();
		}
	}
});

Vue.component('button-start', {
	template: `<button v-bind:disabled="shared.isStartDisabled" @click="start()"><slot>txt</slot></button>`,
	data: () => {
		return {
			shared:Store.state
		}
	},
	created: function() {
		EventBus.$on(EventBus.event.PLAYLIST_CHANGED, (payload) => {
			console.log('event',payload)
			Store.state.isStartDisabled = true;
		});
		EventBus.$on(EventBus.event.ANALYSIS_DONE, (payload) => {
			console.log('event', payload);
			Store.state.isStartDisabled = false;
		})
	},
	methods: {
		start() {
			View.current = View.views.WORKOUT;
			Player.start();
		}
	}
});

Vue.component('playinfo', {
	template: `
		<div id="playInfo">
			<div><a v-show="shared.playInfo.isPlaying" @click="stop">Quit</a></div>
			<div id="tot">{{shared.playInfo.tot}}</div>
			<div id="curr">{{shared.playInfo.curr}}</div>
			<div id="artistTitle">{{shared.playInfo.artistTitle}}</div>
			<img id="artwork" v-bind:src="shared.playInfo.artwork"></div>
		</div>
	`,
	data: () => {
		return {
			shared:Store.state
		}
	},
	created: function() {
		EventBus.$on(EventBus.event.PLAYER_STARTED, (payload) => {
			console.log('event',payload)
			Store.state.playInfo.isPlaying = true;
		});
		EventBus.$on(EventBus.event.PLAYER_STOPPED, (payload) => {
			console.log('event',payload)
			Store.state.playInfo.isPlaying = false;
		});
		EventBus.$on(EventBus.event.PLAYER_TICK, (payload) => {
			Store.state.playInfo.tot=payload.totRemaining.toMMSS();
			Store.state.playInfo.curr=payload.intervalRemaining.toSS();
		});
		EventBus.$on(EventBus.event.PLAYER_TRACKCHANGED, (payload) => {
			console.log('event',payload)
			Store.state.playInfo.artistTitle=payload.artistTitle;
			Store.state.playInfo.artwork=payload.artwork;
		});
	},
	methods: {
		stop() {
			Player.handleStop();
		}
	}
});

new Vue({el:'#dev2',data:{shared:Store.state}});

/* UI
/
about + connect
/home
select device + rescan
hiitfy ui
	
*/
