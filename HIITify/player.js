"use strict"
const Player = {
	isHigh: false,
	songRemaining: -1,
	currSong: 0,
	currSongLow: 0,
	totTimer:{},
	loTimer:{},
	hiTimer:{},
	eb: {},
	playlistTracks: [],
	playlistTracksLow: [],
	orgPlayListTracks: [],
	orgPlayListTracksLow: [],
	analysis: [],
	init: (eb) => {
		Player.eb = eb;
		Player.totTimer = new Timer({
			tick: 250,
			onend: function() {
				Player.handleStop();
				console.log('tot end');
			},
			ontick: function() {
				Player.eb.$emit(EventBus.event.PLAYER_TICK, {
					totRemaining: Math.floor(Player.totTimer.getDuration()/1000),
					intervalRemaining: Math.floor(Player.isHigh?Player.hiTimer.getDuration()/1000:Player.loTimer.getDuration()/1000)
				});
				if (Player.isHigh) {
					Player.songRemaining = (Store.state.workout.high)-(Player.playlistTracks[Player.currSong].duration_ms/1000)+parseFloat(Player.analysis[Player.playlistTracks[Player.currSong].id])-(Player.hiTimer.getDuration()/1000);
				} else {
					Player.songRemaining = (Store.state.workout.low)-(Player.playlistTracksLow[Player.currSongLow].duration_ms/1000)+parseFloat(Player.analysis[Player.playlistTracksLow[Player.currSongLow].id])-(Player.loTimer.getDuration()/1000);
				}
				if (Player.songRemaining > 0 && (Math.ceil(Player.songRemaining + 0.750)==1)) {
					console.log("RESTART");
					if (Spotify.isPlaying)
						Player.handlePlay();
				} 		
			}
		});
		Player.loTimer = new Timer({
			onstart: function() {
				console.log('lo start');
				Player.handlePlay();
			},
			onend: function() {
				Player.isHigh=true;
				Player.currSongLow++;
				Player.hiTimer.start(Store.state.workout.high);
				console.log('lo end');
			}
		});
		Player.hiTimer = new Timer({
			onstart: function() {
				console.log('hi start');
				Player.handlePlay();
			},
			onend: function() {
				Player.isHigh=false;
				Player.currSong++;
				Player.loTimer.start(Store.state.workout.low);
				console.log('hi end');
			}
		});
		Player.eb.$on(EventBus.event.ANALYSIS_DONE, (payload) => {
			console.log('event',payload)
			Player.playlistTracks = Analyzer.playlistTracks;
			Player.playlistTracksLow = Analyzer.playlistTracksLow;
			Player.analysis = payload;
			Player.orgPlayListTracks = JSON.parse(JSON.stringify(Player.playlistTracks));
			Player.orgPlayListTracksLow = JSON.parse(JSON.stringify(Player.playlistTracksLow));
		});
	},
	start: () => {
		Player.currSong = 0;
		Player.currSongLow = 0;
		if (Store.state.playlist.shouldRandomize) {
			Player.playlistTracks.shuffle();
			Player.playlistTracksLow.shuffle();
		} else { // might need a 'reset'
			Player.playlistTracks = Player.orgPlayListTracks;
			Player.playlistTracksLow = Player.orgPlayListTracksLow;
		}
		const cycle = parseInt(Store.state.workout.high,10) + parseInt(Store.state.workout.low,10);
		const totSecs = Math.ceil(Store.state.workout.tot * 60 / cycle) * cycle;
		console.log('totsecs',totSecs);
		Player.totTimer.start(totSecs);
		if (Store.state.playlist.shouldStartLow) {
			Player.loTimer.start(Store.state.workout.low);
		} else {
			Player.isHigh = true;
			Player.hiTimer.start(Store.state.workout.high);
		}
		Player.eb.$emit(EventBus.event.PLAYER_STARTED, 'PLAYER_STARTED');
	},
	handlePlay: () => {
		Spotify.isPlaying = false;
		if (Player.isHigh) {
			console.log(Player.currSong, Player.playlistTracks[Player.currSong], Player.analysis[Player.playlistTracks[Player.currSong].id]);
			if (Player.currSong < Player.playlistTracks.length) {
				Spotify.startSong(Player.playlistTracks[Player.currSong].id, Player.analysis[Player.playlistTracks[Player.currSong].id], Store.state.selectedDevice);
				Player.eb.$emit(EventBus.event.PLAYER_TRACKCHANGED, {
					isHigh:true,
					artistTitle:Player.playlistTracks[Player.currSong].artists[0].name + ' - ' + Player.playlistTracks[Player.currSong].name,
					artwork:Player.playlistTracks[Player.currSong].album.images[0].url
				});
			}
		} else {
			console.log(Player.currSongLow, Player.playlistTracksLow[Player.currSongLow], Player.analysis[Player.playlistTracksLow[Player.currSongLow].id]);
			if (Player.currSongLow < Player.playlistTracksLow.length) {
				Spotify.startSong(Player.playlistTracksLow[Player.currSongLow].id, Player.analysis[Player.playlistTracksLow[Player.currSongLow].id], Store.state.selectedDevice);
				Player.eb.$emit(EventBus.event.PLAYER_TRACKCHANGED, {
					isHigh:true,
					artistTitle:Player.playlistTracksLow[Player.currSongLow].artists[0].name + ' - ' + Player.playlistTracksLow[Player.currSongLow].name,
					artwork:Player.playlistTracksLow[Player.currSongLow].album.images[0].url
				});
			}
		}
	},
	handleStop: () => {
		Player.loTimer.stop();
		Player.hiTimer.stop();
		Player.totTimer.stop();
		Spotify.pauseSong(Store.state.selectedDevice);
		Player.eb.$emit(EventBus.event.PLAYER_STOPPED, 'PLAYER_STOPPED');
	}
}