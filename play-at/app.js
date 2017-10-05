"use strict"
let Store = {
	state: {
		selectedDevice:'isd',
		devices: [],
		playlist: {
			highs:[],
			high:'' // href
		},
		playlistTracks: []
	}
};

const EventBus = new Vue({
	data: {
		event: {
			PLAYLIST_CHANGED: 'playlist-changed',
			DEVICE_CHANGED: 'device-changed'
		}
	}
});

Vue.component('device-list', {
	template: `	
			<select v-if="shared.devices.length" v-model="shared.selectedDevice" v-on:change="deviceSelChanged">
				<option v-for="device in shared.devices" v-bind:value="device.value">{{device.text}}</option>
			</select>
			<div v-else-if="!shared.devices.length" style="color:red">No devices found, start Spotify on a device and refresh page</div>
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

Vue.component('playlists', {
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

Vue.component('songs-list', {
	template: `<div><ol><li v-for="(track, idx) in shared.playlistTracks">
				{{track.title}} - {{track.artist}} <input ref="input" type="number" v-model="track.startAt"/> <button @click="play(track.id, track.startAt)">Play</button>
			   </li></ol></div>
		`,
	data: () => {
		return {
			shared:Store.state
		}
	},
	methods: {
		play: (id, startAt) => { // songid, startAt in seconds
			//console.log(id, idx);
			Spotify.startSong(id, startAt, Store.state.selectedDevice);
		}
	}
})

const View = new Vue({
	// gotcha, cant nest vue instances, root might be instance, childs must be components	
	el: '#viewRoot',
	data: {
		views: {
			INIT: 'init',
			SETTINGS: 'settings', 
			WORKOUT: 'workout'
		},
		current: '',
		shared:Store.state
	},
	methods: {
		login() {
			Spotify.login();
		},
		logout() {
			Spotify.logout();
		},
		getPlaylistSongs() {
			App.getPlayListSongs();
		},
		stop() {
			Spotify.pauseSong(Store.state.selectedDevice);
		},
		save() {
			App.saveState();
		}
	}
});

const App = {
	
	init: async function() {
		console.log('app');
		View.current = View.views.INIT;
		if (!Spotify.token &&!location.hash) {
			//Spotify.client_id = App.client_id;
			//Spotify.login();
		} else {
			View.current = View.views.SETTINGS;
			const o = new URLSearchParams(location.hash.substring(1));
			//TODO: check state matches
			Spotify.token = o.get('access_token');
			console.log(Spotify.token);
			const deviceData = await Spotify.devices();
			Store.state.devices = []
			deviceData.devices.forEach((dev) => {
		   		Store.state.devices.push({text: dev.type + ' - ' + dev.name, value: dev.id});
			});
			if (Store.state.devices.length) {
				Store.state.selectedDevice = Store.state.devices[0].value;
			}
			const me = await Spotify.me();				
			console.log(me);
			App.getPlayLists(0, 50);
		}
		EventBus.$on(EventBus.event.DEVICE_CHANGED, (payload) => {
			console.log('event',payload)
			Store.state.selectedDevice = payload;
		});
		EventBus.$on(EventBus.event.PLAYLIST_CHANGED, (payload) => {
			console.log('event',payload)
		});
	},
	getPlayLists: async function(offset, limit) {	
		const plData = await Spotify.getPlayLists(offset, limit);
		plData.items.forEach((pl) => {
			Store.state.playlist.highs.push({text:pl.name, value:pl.href});	
		});
		if (plData.next) {
			App.getPlayLists(plData.offset + plData.limit, plData.limit);
		} else {
			Store.state.playlist.high = Store.state.playlist.highs[0].value;
			let viewModelState = localStorage.getItem("viewModelState");
			if (viewModelState) {
				viewModelState = JSON.parse(viewModelState);
				console.log(viewModelState);
				Store.state.playlist.high = viewModelState.state.playlist.high;
			}
		}
	},
	getPlayListSongs: async () => {
		Store.state.playlistTracks = [];
		const cache = localStorage.getItem(Store.state.playlist.high);
		App._getPlaylistTracks(0,100,Store.state.playlist.high,null, Store.state.playlistTracks, (cache));
	},
	_getPlaylistTracks: async function (offset,limit,playlist,href, playlistTracks, cache) {
		let preset = {};
		if (cache) {
			preset = JSON.parse(cache);
			if (preset.playlist.startsWith(href) || preset.playlist.startsWith(playlist)) {
				console.log('got cache');
			}
		}
		const data = await Spotify.getPlaylistTracks(offset,limit,playlist,href);
		for (let i = 0; i < data.items.length; i++) {
			if (data.items[i].track.is_playable) {
				//console.log(data.items[i]);
				let track = {
					title: data.items[i].track.name,
					artist: data.items[i].track.artists[0].name,
					id: data.items[i].track.id,
					startAt: 0
				};
				if (cache) {
					preset.tracks.forEach((t) => {
						if (t.id == track.id && t.startAt != 0) {
							track.startAt = t.startAt;
						}
					});
				}
				playlistTracks.push(track);
			} else {
				console.log('track not available', data.items[i].track);
			}
		}
		if (data && data.next) {
			App._getPlaylistTracks(data.offset + data.limit, data.limit, null, data.next, playlistTracks, cache);
		} else {
			console.log('playlist tracks done ');
		}
	},
	saveState: () => {
		const data = {
			playlist: Store.state.playlist.high,
			tracks: Store.state.playlistTracks
		};
		localStorage.setItem(data.playlist, JSON.stringify(data)); 
	}
};

